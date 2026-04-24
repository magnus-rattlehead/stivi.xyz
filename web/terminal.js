document.addEventListener('DOMContentLoaded', () => {
  buildContactTerminal();

  const content = document.querySelector('.content');
  if (!content) return;

  const h2s = Array.from(content.querySelectorAll('h2'));
  if (!h2s.length) return;

  const stopEl = document.getElementById('resume-preview');

  const sections = h2s.map(h2 => {
    const siblings = [];
    let el = h2.nextElementSibling;
    while (el && el.tagName !== 'H2' && el !== stopEl) {
      siblings.push(el);
      el = el.nextElementSibling;
    }

    const section = document.createElement('div');
    section.className = 'section-content';
    h2.before(section);
    section.append(h2, ...siblings);

    const sentinel = document.createElement('div');
    sentinel.className = 'section-sentinel';
    section.appendChild(sentinel);

    const cmd = `cat ${slugify(h2.textContent)}.md`;
    const cmdLine = document.createElement('div');
    cmdLine.className = 'term-cmd-line';
    cmdLine.dataset.cmd = cmd;
    cmdLine.innerHTML =
      `<span class="terminal-prompt">$ </span>` +
      `<span class="term-cmd-text"></span>` +
      `<span class="terminal-cursor"></span>`;
    section.before(cmdLine);

    return { section, sentinel, cmdLine, cmd };
  });

  const lastIndex = sections.length - 1;

  // Instantly reveal sections already scrolled above viewport
  let startIndex = 0;
  for (let i = 0; i < sections.length; i++) {
    const { cmdLine, section, cmd } = sections[i];
    if (cmdLine.getBoundingClientRect().bottom >= 0) break;
    cmdLine.querySelector('.term-cmd-text').textContent = cmd;
    cmdLine.querySelector('.terminal-cursor').classList.add('done');
    section.style.transition = 'none';
    section.style.display = 'block';
    section.style.opacity = '1';
    section.style.transform = 'none';
    if (i === lastIndex) document.dispatchEvent(new CustomEvent('about-revealed'));
    startIndex = i + 1;
  }

  if (startIndex < sections.length) {
    setTimeout(() => runChain(sections, startIndex, lastIndex), 300);
  }

  // Move badges + source link outside the terminal window
  const portfolio = document.querySelector('.portfolio');
  ['.profile-badges', '.site-source'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el && portfolio) portfolio.appendChild(el);
  });
});

// ── Chain ─────────────────────────────────────────────────────────────────────

function runChain(sections, index, lastIndex) {
  if (index >= sections.length) return;
  const { cmdLine, section, sentinel } = sections[index];

  typeCmdLine(cmdLine, () => {
    revealSection(section, () => {
      if (index === lastIndex) document.dispatchEvent(new CustomEvent('about-revealed'));
      observeSentinel(sentinel, () => {
        runChain(sections, index + 1, lastIndex);
      });
    });
  });
}

function typeCmdLine(cmdLineEl, onDone) {
  const cmd = cmdLineEl.dataset.cmd;
  const cmdText = cmdLineEl.querySelector('.term-cmd-text');
  const cursor = cmdLineEl.querySelector('.terminal-cursor');
  let i = 0;
  const tick = setInterval(() => {
    cmdText.textContent += cmd[i++];
    if (i >= cmd.length) {
      clearInterval(tick);
      cursor.classList.add('done');
      setTimeout(onDone, 280);
    }
  }, 28);
}

function revealSection(sectionEl, onDone) {
  sectionEl.style.display = 'block';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sectionEl.classList.add('revealed');
      let fired = false;
      const done = () => { if (!fired) { fired = true; onDone(); } };
      sectionEl.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'opacity') return;
        sectionEl.removeEventListener('transitionend', handler);
        done();
      });
      setTimeout(done, 500);
    });
  });
}

function observeSentinel(sentinelEl, onDone) {
  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.unobserve(sentinelEl);
    onDone();
  }, { threshold: 0 });
  obs.observe(sentinelEl);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

// ── Contact terminal (inline) ─────────────────────────────────────────────────

function buildContactTerminal() {
  const container = document.getElementById('contact-terminal');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'contact-inline';
  div.innerHTML =
    `<div class="contact-hint"># try: email &lt;your message here&gt; | cat</div>` +
    `<input class="contact-input" type="text"
      autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
      aria-label="terminal input">`;

  container.replaceWith(div);

  const input = div.querySelector('.contact-input');

  addContactPrompt(div);

  div.addEventListener('click', () => input.focus());

  input.addEventListener('input', () => {
    div.querySelector('.contact-line:last-child .contact-typed').textContent = input.value;
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runEmailCommand(input.value.trim(), div);
      input.value = '';
    }
  });
}

function addContactPrompt(body) {
  const line = document.createElement('div');
  line.className = 'contact-line';
  line.innerHTML = `<span class="terminal-prompt">$ </span><span class="contact-typed"></span><span class="terminal-cursor"></span>`;
  body.appendChild(line);
}

function addContactOutput(body, text, isError) {
  const out = document.createElement('div');
  out.className = 'contact-output' + (isError ? ' contact-error' : '');
  out.textContent = text;
  body.appendChild(out);
}

function runEmailCommand(cmd, body) {
  body.querySelector('.contact-line:last-child .terminal-cursor').classList.add('done');

  if (cmd.startsWith('email ')) {
    const msg = cmd.slice(6).trim();
    addContactOutput(body, 'sending...', false);
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    }).then(r => {
      const last = body.querySelector('.contact-output:last-of-type');
      if (r.ok) {
        last.textContent = 'message sent.';
      } else {
        last.textContent = 'send failed — try again later.';
        last.classList.add('contact-error');
      }
      addContactPrompt(body);
      body.querySelector('.contact-line:last-child').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return;
  } else if (cmd === 'email') {
    addContactOutput(body, 'usage: email <your message>', true);
  } else if (cmd === 'cat') {
    if (typeof window.cat === 'function') window.cat();
    addContactOutput(body, 'meow.', false);
  } else if (cmd !== '') {
    addContactOutput(body, `command not found: ${cmd.split(' ')[0]}`, true);
  }

  addContactPrompt(body);
  body.querySelector('.contact-line:last-child').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
