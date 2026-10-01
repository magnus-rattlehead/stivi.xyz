# Welcome to my personal page!

I made this page so I can put random web applications I find useful to myself (usually some tool
that I don't want to download an app for on my phone). I decided to also start writing about
programming since it's fun and helps me reinforce my learning.

## Other pages on this site

- [Blog](/blog/): posts about programming.
- [Media compressor](/compress/): shrink images and videos for sharing, entirely on your device.

---

## Portfolio for recruiters

### **Dialpad Canada** | _Software Engineer, Product_

_January 2026 – Present_

Working on the billing team where I do backend development on our in house billing architecture, as
well as frontend work on both customer facing billing related UIs and workflows as well as internal
tools for engineers and customer reps.

I might start writing posts about some unique challenges I worked on.

---

## Some projects

### **Hearthstore** | [GitHub](https://github.com/magnus-rattlehead/hearthstore)

_Open-source, disk-backed replacement for Cloud Datastore emulator._

I initally starting working on this tool because I kept running out of memory while importing large
customers from our production database at Dialpad into Google's official Datastore emulator. The
import script plus the overhead of storing multiple gigabytes of data in memory would cause my work
laptop to crash. I looked online to see if anyone had developed a solution for this and found none.

Armed with the Datastore and Firestore docs, the emulator's decompiled bytecode, and Claude Code, I
tried my hand at "vibecoding" for the first time. It was able to do some stuff but over the last few
months I've had to go into the codebase and fix many bugs, edge cases and missing features myself.
Under the hood it uses badger as a key-value database and translates datastore calls into ACID
transactions compatible with Badger.

### **StreamSaver.js (Fork)** | [GitHub](https://github.com/magnus-rattlehead/StreamSaver.js)

_Asynchronous browser-to-filesystem stream writing utility._

Forked from the original repository with custom improvements (adding ZIP64 support) to the core
stream handling logic. Built in JavaScript.

This was actually for a feature I was building at my first internship (Titanfile Inc). The task was
to stream a folder full of encrypted files through a decryption pipeline and into a single
downloadable zip folder. The problem was that we needed to support legacy browsers on low power
machines as many of our customers were still on stuff like Internet Explorer, which doesn't have
access to the File System Access API. I added ZIP64 support and improved the stream handling so
large downloads could be written reliably without buffering the entire archive in memory.

---

## Education

University of Waterloo alumni 2025. I majored in Combinatorics and Optimization. I would describe
combinatorics in laymans terms as the math behind counting things. More technically, it's about
discrete structures and their properties. The optimization refers to mathematical programming, which
is essentially finding boundaries of mathematical functions, given certain constraints/criteria. My
favourite courses I took in my undergrad would probably be: Information Theory (CO 432),
Computational Discrete Optimization (CO 353), Coding Theory (CO 331) and Introduction to German (GER
101). I do continue practicing what I've learned (even German) in my free time.

---

## About

Outside of software, I like skiing, cycling and wrestling. I'm hoping to move somewhere warm in the
future to learn how to surf and drive a convertible. I also have an extremely clingy cat, Gabriella.

![Gabriella relaxing on a rug](/web/assets/static/about-960.webp)

## Links

- [Résumé (PDF)](/web/assets/static/resume.pdf)
- [Email](mailto:guranjakustivi@gmail.com)
- [GitHub](https://github.com/magnus-rattlehead)
- [LinkedIn](https://www.linkedin.com/in/stiviguranjaku/)
