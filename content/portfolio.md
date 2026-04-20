# Welcome!
Hi, I'm Stivi:

Software Engineer based in Toronto, currently building and refining products at **Dialpad**. Focus centers on backend reliability, high-stakes data consistency, and the development of high-velocity developer tooling.

---

## 🛠 Professional Focus
### **Dialpad Canada** | *Software Engineer, Product*
*January 2026 – Present*

Currently managing the critical data consistency layer for Dialpad's revenue infrastructure. Work involves high-stakes orchestration between internal services and financial platforms.

* **Financial Integration:** Designing complex schemas and synchronization logic to bridge core services with **Salesforce**, **NetSuite**, and **Braintree**.
* **Infrastructure:** Building within a custom, in-house version of the **Sanic** framework, managing transactional data at enterprise scale.
* **Responsive UI** Building usable, intuitive billing interfaces from designs, ensuring a smooth
  experience for customers
* **Developer Experience:** Built end-to-end developer tooling to replicate production company data locally — a parallelized BigQuery → Datastore import pipeline covering 55+ entity types, SHA-256 query caching, cross-entity reference resolution, and a synthetic data generator using SDV's HMASynthesizer for PII-free test environments

---

## 🚀 Projects & Research

### **Hearthstore** | [GitHub](https://github.com/magnus-rattlehead/hearthstore)
*Open-source, disk-backed replacement for Cloud Firestore/Datastore emulators.*

Engineered as a high-performance alternative to the official Java emulator. By moving storage from the JVM heap to SQLite with WAL mode, Hearthstore allows memory usage to scale with the active working set rather than total data size. 

* **Architecture:** Multiplexed gRPC, WebChannel, and REST APIs on a single port. Converts
  Firestore/Datastore requests to native SQL where possible.
* **Impact:** Eliminated the need for heavy memory overhead in local development environments.

---

## ⚙️ Technical Arsenal

Work mostly with Python and Typescript/Javascript, but prefer C-style languages like Go and C.

---

## 🔍 About

Building tools that make teams move faster and with fewer blockers is the primary motivator. I like
attending local shows, working on my car, driving fast and spedinng time with my cat, Gabriella.

![Gabs, relaxing on the couch](/web/assets/static/gabriella.jpg)
---

**Links**
* [GitHub Profile](https://github.com/magnus-rattlehead)
* [LinkedIn Profile](https://ca.linkedin.com/in/stivi-guranjaku-438bb6403)
* [Full Resume (PDF)](/web/assets/static/resume.pdf)
* [Contact](mailto:guranjakustivi@gmail.com)
