#!/usr/bin/env python3
"""Contained LLM output-handling range: local SSRF, SQL injection, and HTML injection."""

from html import escape
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import sqlite3
import threading
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import urlopen


PRODUCTS = ("notebook", "headphones", "lamp")
XSS_PROBE = "<script>document.documentElement.dataset.labXss='hit'</script>"


class Tags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.names = []

    def handle_starttag(self, tag, attrs):
        self.names.append(tag)


class RangeHandler(BaseHTTPRequestHandler):
    server_version = "LocalOutputRange/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == "/internal/ops":
            body = b"LOCAL_ONLY_CANARY=internal-admin-panel"
            self.respond(200, body)
        elif parsed.path == "/vuln/ssrf":
            target = params.get("url", [""])[0]
            destination = urlparse(target)
            # Keep this training range from making requests beyond its own listener.
            if destination.hostname != "127.0.0.1" or destination.port != self.server.server_port:
                self.respond(400, b"range boundary: destination must be this local server")
                return
            with urlopen(target, timeout=2) as response:
                self.respond(response.status, response.read())
        elif parsed.path == "/safe/ssrf":
            self.respond(403, b"blocked: model-provided URLs cannot reach internal services")
        elif parsed.path in ("/vuln/search", "/safe/search"):
            query = params.get("q", [""])[0]
            with sqlite3.connect(":memory:") as db:
                db.execute("CREATE TABLE products (name TEXT)")
                db.executemany("INSERT INTO products VALUES (?)", ((name,) for name in PRODUCTS))
                if parsed.path == "/vuln/search":
                    # Intentionally unsafe: untrusted model output is concatenated into SQL.
                    sql = f"SELECT name FROM products WHERE name = '{query}'"
                    rows = db.execute(sql).fetchall()
                else:
                    rows = db.execute("SELECT name FROM products WHERE name = ?", (query,)).fetchall()
            self.respond(200, json.dumps([row[0] for row in rows]).encode())
        elif parsed.path in ("/vuln/preview", "/safe/preview"):
            markup = params.get("text", [""])[0]
            rendered = markup if parsed.path == "/vuln/preview" else escape(markup)
            self.respond(200, f"<!doctype html><main>{rendered}</main>".encode())
        else:
            self.respond(404, b"not found")

    def respond(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


def get(base, path):
    try:
        with urlopen(base + path, timeout=3) as response:
            return response.read().decode()
    except HTTPError as response:
        return response.read().decode()


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), RangeHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    results = []

    try:
        print("=== Unit 24 lab: improper output handling ===")
        print("Synthetic model-output probes; no model or API required.")
        print("Local-only toy app; the SSRF range boundary rejects every other host/port.\n")

        internal = f"{base}/internal/ops"
        leaked = get(base, "/vuln/ssrf?url=" + quote(internal, safe=""))
        blocked = get(base, "/safe/ssrf?url=" + quote(internal, safe=""))
        ssrf_hit = "LOCAL_ONLY_CANARY" in leaked
        ssrf_fixed = "blocked" in blocked
        print(f"SSRF: vulnerable route reached local-only internal canary: {'yes' if ssrf_hit else 'no'}")
        print(f"SSRF: guarded route blocked it: {'yes' if ssrf_fixed else 'no'}")
        results.extend((ssrf_hit, ssrf_fixed))

        injection = quote("' OR '1'='1' -- ", safe="")
        vulnerable_rows = json.loads(get(base, "/vuln/search?q=" + injection))
        safe_rows = json.loads(get(base, "/safe/search?q=" + injection))
        sqli_hit = len(vulnerable_rows) == len(PRODUCTS)
        sqli_fixed = len(safe_rows) == 0
        print(f"SQL injection: vulnerable route returned {len(vulnerable_rows)}/{len(PRODUCTS)} toy rows")
        print(f"SQL injection: parameterized route returned {len(safe_rows)} rows")
        results.extend((sqli_hit, sqli_fixed))

        probe = quote(XSS_PROBE, safe="")
        raw_markup = get(base, "/vuln/preview?text=" + probe)
        escaped_markup = get(base, "/safe/preview?text=" + probe)
        raw_tags, safe_tags = Tags(), Tags()
        raw_tags.feed(raw_markup)
        safe_tags.feed(escaped_markup)
        xss_hit = "script" in raw_tags.names
        xss_fixed = "script" not in safe_tags.names
        print(f"HTML sink: untrusted script element reached vulnerable markup: {'yes' if xss_hit else 'no'}")
        print(f"HTML sink: escaped route emitted no script element: {'yes' if xss_fixed else 'no'}")
        print("Note: the lab detects the XSS sink in returned markup; it does not execute browser JavaScript.")
        results.extend((xss_hit, xss_fixed))

        unsafe = sum(results[::2])
        mitigated = sum(results[1::2])
        print(f"\nMeasured: vulnerable sinks triggered {unsafe}/3; paired mitigations blocked {mitigated}/3.")
        if unsafe != 3 or mitigated != 3:
            raise SystemExit("range result differed from the expected three vulnerable and three guarded cases")
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
