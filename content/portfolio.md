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
* **Developer Experience:** Built end-to-end developer tooling to replicate production company data locally — a parallelized BigQuery → Datastore import pipeline covering 55+ entity types, SHA-256 query caching, cross-entity reference resolution, and a synthetic data generator using SDV's HMASynthesizer for PII-free test environments.

---

## 🚀 Projects & Research

### **Hearthstore** | [GitHub](https://github.com/magnus-rattlehead/hearthstore)
*Open-source, disk-backed replacement for Cloud Firestore/Datastore emulators.*

Engineered as a high-performance alternative to the official Java emulator. By moving storage from the JVM heap to SQLite with WAL mode, Hearthstore allows memory usage to scale with the active working set rather than total data size. Built in Go.

* **Architecture:** Multiplexed gRPC, WebChannel, and REST APIs on a single port. Converts Firestore/Datastore requests to native SQL where possible.
* **Impact:** Eliminated the need for heavy memory overhead in local development environments.

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

---

<div class="profile-badges">
<a href="https://github.com/magnus-rattlehead"><img src="https://img.shields.io/badge/GitHub-magnus--rattlehead-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
<div class="badge-base LI-profile-badge" data-locale="en_US" data-size="medium" data-theme="dark" data-type="VERTICAL" data-vanity="stiviguranjaku" data-version="v1"></div>
<script src="https://platform.linkedin.com/badges/js/profile.js" async defer type="text/javascript"></script>
</div>
<div id="contact-terminal"></div>

<div id="resume-preview"></div>
