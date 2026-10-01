# Welcome to my personal page!

Here you can find out some of the work I have done/am doing and other random
facts about me.

## Other pages on this site

* [Blog](/blog/): posts and notes.
* [Media compressor](/compress/): shrink images and videos for sharing, entirely on your device.

---

## Current role
### **Dialpad Canada** | *Software Engineer, Product*
*January 2026 – Present*


Working on the billing team where I do backend development on our in house
billing architecture, as well as frontend work on both customer facing billing
related UIs and workflows as well as internal tools for engineers and customer
reps.

---

## Some projects

### **Hearthstore** | [GitHub](https://github.com/magnus-rattlehead/hearthstore)
*Open-source, disk-backed replacement for Cloud Datastore emulator.*

Was developed as part of an initiative at Dialpad to make local development
easier, especially testing new features on large customer accounts or debugging
edge cases that are difficult to reproduce in our staging environments.

Under the hood it uses badger as a key-value database and translates datastore
calls into ACID transactions compatible with Badger.

### **Phantom** | [GitHub](https://github.com/magnus-rattlehead/phantom)
*GPU-accelerated terminal emulator for macOS with LLM-powered shell command autocomplete.*

I ended up archiving and privating this as I was really struggling to make it
compatible with everythign I use and need in a terminal. When I first created
it, I wanted to learn more about graphics programming and thought a terminal
emulator would be cool to make, especially since there were some features I was
missing from commercially available terminal emulators.

Some things I learned from it that I didn't expect:

- how hard font rasterizing is
- everything (well, not really since I didn't finish it) about terminal emulation
- made be better at async programming
- SIMD instructions

### **StreamSaver.js (Fork)** | [GitHub](https://github.com/magnus-rattlehead/StreamSaver.js)
*Asynchronous browser-to-filesystem stream writing utility.*

Forked from the original repository with custom improvements (adding ZIP64
support) to the core stream handling logic. Built in JavaScript.

This was actually for a feature I was building at my first internship (Titanfile
Inc). The task was to stream a folder full of encrypted files through a
decryption pipeline and into a single downloadable zip folder. The problem was
that we needed to support legacy browsers on low power machines as many of our
customers were still on stuff like Internet Explorer, which doesn't have access
to the File System Access API. I added ZIP64 support and improved the stream
handling so large downloads could be written reliably without buffering the
entire archive in memory.

---

## 💻 Tools I like

* Neovim ([config](https://github.com/magnus-rattlehead/nvim))

---

## 📚 Education

University of Waterloo alumni 2025. I majored in Combinatorics and Optimization.
I would describe combinatorics in laymans terms as the math behind counting
things. More technically, it's about discrete structures and their properties.
The optimization refers to mathematical programming, which is essentially
finding boundaries of mathematical functions, given certain
constraints/criteria. My favourite courses I took in my undergrad would probably
be: Information Theory (CO 432), Computational Discrete Optimization (CO 353),
Coding Theory (CO 331) and Introduction to German (GER 101). I do continue
practicing what I've learned (even German) in my free time.

---

## 🔍 About

Outside of software, I like skiing, cycling and wrestling. I'm hoping to move
somewhere warm in the future to learn how to surf and drive a convertible. I
also have an extremely clingy cat, Gabriella.

![Gabriella relaxing on a rug](/web/assets/static/about-960.webp)

## Links

- [Résumé (PDF)](/web/assets/static/resume.pdf)
- [Email](mailto:guranjakustivi@gmail.com)
- [GitHub](https://github.com/magnus-rattlehead)
- [LinkedIn](https://www.linkedin.com/in/stiviguranjaku/)
- [stivi.xyz (Source)](https://github.com/magnus-rattlehead/stivi.xyz)
