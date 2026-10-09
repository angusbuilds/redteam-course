# Security & Ethics Policy

This is a course for **authorized** AI red-teaming. The whole point is to build the skill
responsibly, the way the labs and bounty programs expect.

## The one rule

You only ever attack one of three things:

1. A **competition** (Gray Swan, HackAPrompt, a CTF).
2. A program that **invited you in writing** (a bug bounty with your target in scope).
3. A model you **run on your own machine**.

Never a live product you were not asked to test.

## What this course will not do

- **No working payloads.** The labs teach attack *shapes* and measure that a bypass works.
  They do not ship, and you must not publish, content that is itself harmful to use.
- **No real-harm domains.** Nothing here touches CBRN, CSAM, or material designed to hurt people.
  A jailbreak is scored as a success/failure signal, never used for its output.
- **No pre-disclosure exploits.** You do not publish a working exploit against a real system
  before the vendor has fixed it. Coordinated disclosure, every time.

## Reporting a problem with the course

Found a lab that leaks something it shouldn't, a dependency risk, or content that crosses the
lines above? Open a private security advisory on the repo, or contact the maintainer directly.
Please don't file it as a public issue.

## Disclosure timelines (what the labs teach)

A finding pays only when it is in scope, reproducible, and disclosed correctly. Unit 16 covers
how real triage and embargo timelines work — read it before you submit anything anywhere.
