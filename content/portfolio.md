# Welcome!
Hi, I'm Stivi:

Software Engineer based in Toronto, currently building and refining products at **Dialpad**. Focus centers on backend reliability, data consistency, and the development of high-velocity developer tooling.

---

## 🛠 Professional Focus
### **Dialpad Canada** | *Software Engineer, Product*
*January 2026 – Present*

Currently managing the critical data consistency layer for Dialpad's revenue infrastructure. Work involves high-stakes orchestration between internal services and financial platforms.

* **Financial Integration:** Designing complex schemas and synchronization logic to bridge core services with **Salesforce**, **NetSuite**, and **Braintree**.
* **Infrastructure:** Building within a custom, in-house version of the **Sanic** framework, managing transactional data at enterprise scale.
* **Responsive UI:** Building usable, intuitive billing interfaces from designs, ensuring a smooth experience for customers.
* **Agentic Integration:** Building agentic integration into billing user experience, allowing
  customers to easily navigate and understand how they are billed, reducing requests made to support
  and improving customer experience.
* **Developer Experience:** Built end-to-end developer tooling to replicate production company data locally — a parallelized BigQuery → Datastore import pipeline covering 55+ entity types, SHA-256 query caching, cross-entity reference resolution, and a synthetic data generator using SDV's HMASynthesizer for PII-free test environments.

---

## 🚀 Projects & Research

### **Hearthstore** | [GitHub](https://github.com/magnus-rattlehead/hearthstore)
*Open-source, disk-backed replacement for Cloud Firestore/Datastore emulators.*

Engineered as a high-performance alternative to the official Java emulator. By moving storage from the JVM heap to SQLite with WAL mode, Hearthstore allows memory usage to scale with the active working set rather than total data size. Built in Go.

* **Architecture:** Multiplexed gRPC, WebChannel, and REST APIs on a single port. Converts Firestore/Datastore requests to native SQL where possible.
* **Impact:** Eliminated the need for heavy memory overhead in local development environments.

### **Phantom** | [GitHub](https://github.com/magnus-rattlehead/phantom)
*GPU-accelerated terminal emulator for macOS with LLM-powered shell command autocomplete.*

Built in C on SDL3 + OpenGL 3.3, with inference running on Metal via llama.cpp. Full VT100/ANSI/xterm-256color emulation with LZFSE-compressed infinite scrollback.

* **LLM Autocomplete:** FIM (Fill-in-Middle) ghost-text suggestions powered by a local GGUF model; KV cache split so the stable history prefix is encoded once and reused across keystrokes.
* **Architecture:** Async autocomplete worker with 80 ms debounce, bloom-filter-indexed scrollback chunks, and incremental in-terminal search.

### **StreamSaver.js (Fork)** | [GitHub](https://github.com/magnus-rattlehead/StreamSaver.js)
*Asynchronous browser-to-filesystem stream writing utility.*

Forked from the original repository with custom improvements (adding ZIP64 support) to the core stream handling logic. Built in JavaScript.

* **Architecture:** Leverages the modern web streams API to write data directly to the user's filesystem asynchronously. 
* **Impact:** Bypasses browser memory bottlenecks, enabling the processing and saving of massive files directly to disk without crashing the client.

---

## 💻 Technical Arsenal

Work mostly with Python and Typescript/Javascript, but prefer C-style languages like Go and C. I
prefer using Vim as my editor, mostly because I already have a terminal window open and I don't like
switching windows. You can find my Vim config [here](https://github.com/magnus-rattlehead/vimrc)

---

## 📚 Education

University of Waterloo alumni 2025. I majored in Combinatorics and Optimization. I would
describe combinatorics in laymans terms as the math behind counting things. More technically, it's about discrete
structures and their properties. The optimization refers to mathematical programming, which is
essentially finding boundaries of mathematical functions, given certain constraints/criteria. My
favourite courses I took in my undergrad would probably be: Information Theory (CO 432),
Computational Discrete Optimization (CO 353), Coding Theory (CO 331) and Introduction to German (GER
101). I do continue practicing what I've learned (even German) in my free time.

---

## 🔍 About

Building tools that make teams move faster and with fewer blockers is the primary motivator. Outside
of software, I like skiing, cycling and wrestling. I'm hoping to move somewhere warm in the future
to learn how to surf and drive a convertible. My cat, Gabriella, is the brains: I just type what she
says into the terminal.

![The real engineer](/web/assets/static/gabriella_working.jpg "Gabriella, the real engineer")
![Gabs, relaxing on the couch after a hard day at work](/web/assets/static/gabriella_relaxing.jpg "Gabs relaxing on the couch after a hard day at work")

<div id="resume-preview"></div>
<div id="contact-terminal"></div>
<div class="profile-badges">
<a href="https://github.com/magnus-rattlehead" class="github-card">
<img src="https://github.com/magnus-rattlehead.png" alt="GitHub Avatar" class="github-card-avatar">
<div class="github-card-body">
<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
<span class="github-card-name">magnus-rattlehead</span>
<span class="github-card-sub">View GitHub Profile</span>
</div>
</a>
<div class="badge-base LI-profile-badge" data-locale="en_US" data-size="medium" data-theme="dark" data-type="VERTICAL" data-vanity="stiviguranjaku" data-version="v1"></div>
<script src="https://platform.linkedin.com/badges/js/profile.js" async defer type="text/javascript"></script>
</div>

<p class="site-source"><a href="https://github.com/magnus-rattlehead/stivi.xyz">stivi.xyz (Source)</a></p>
