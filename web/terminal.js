document.addEventListener('DOMContentLoaded', () => {
  buildContactTerminal();

  const content = document.querySelector('.content');
  if (!content) return;

  const h2s = Array.from(content.querySelectorAll('h2'));
  if (!h2s.length) return;

  h2s.forEach(h2 => {
    // Collect all siblings until the next h2
    const siblings = [];
    let el = h2.nextElementSibling;
    while (el && el.tagName !== 'H2') {
      siblings.push(el);
      el = el.nextElementSibling;
    }

    // Wrap h2 + its siblings in a hidden section container
    const section = document.createElement('div');
    section.className = 'section-content';
    h2.before(section);
    section.append(h2, ...siblings);

    // Build and insert terminal window before the section
    const terminal = buildTerminal(h2.textContent);
    section.before(terminal);

    setupReveal(terminal, section);
  });
});

function slugify(text) {
  return text
    .replace(/[^\x00-\x7F]/g, '')   // strip emoji / non-ASCII
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function buildTerminal(headerText) {
  const cmd = `cat ${slugify(headerText)}.md`;
  const win = document.createElement('div');
  win.className = 'terminal-window';
  win.dataset.cmd = cmd;
  win.innerHTML = `
    <div class="terminal-titlebar">
      <div class="terminal-buttons">
        <span class="terminal-btn close"></span>
        <span class="terminal-btn minimize"></span>
        <span class="terminal-btn maximize"></span>
      </div>
      <span class="terminal-title">bash \u2014 80\u00d724</span>
    </div>
    <div class="terminal-body">
      <span class="terminal-prompt">$ </span><span
        class="terminal-cmd-text"></span><span class="terminal-cursor"></span>
    </div>`;
  return win;
}

function setupReveal(terminal, section) {
  // Already scrolled past on load — reveal instantly, no animation
  if (terminal.getBoundingClientRect().bottom < 0) {
    section.style.transition = 'none';
    section.style.display = 'block';
    section.style.opacity = '1';
    section.style.transform = 'none';
    const cmdEl = terminal.querySelector('.terminal-cmd-text');
    cmdEl.textContent = terminal.dataset.cmd;
    terminal.querySelector('.terminal-cursor').classList.add('done');
    return;
  }

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.unobserve(terminal);
    typeCommand(terminal, section);
  }, { threshold: 0.4 });

  obs.observe(terminal);
}

function typeCommand(terminal, section) {
  const cmd = terminal.dataset.cmd;
  const cmdEl = terminal.querySelector('.terminal-cmd-text');
  const cursor = terminal.querySelector('.terminal-cursor');
  let i = 0;
  const tick = setInterval(() => {
    cmdEl.textContent += cmd[i++];
    if (i >= cmd.length) {
      clearInterval(tick);
      cursor.classList.add('done');
      setTimeout(() => reveal(section), 280);
    }
  }, 55);
}

function reveal(section) {
  section.style.display = 'block';
  // Double rAF: let browser compute layout before starting transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      section.classList.add('revealed');
    });
  });
}

function buildContactTerminal() {
  const container = document.getElementById('contact-terminal');
  if (!container) return;

  const win = document.createElement('div');
  win.className = 'terminal-window';
  win.tabIndex = 0;
  win.innerHTML = `
    <div class="terminal-titlebar">
      <div class="terminal-buttons">
        <span class="terminal-btn close"></span>
        <span class="terminal-btn minimize"></span>
        <span class="terminal-btn maximize"></span>
      </div>
      <span class="terminal-title">bash \u2014 80\u00d724</span>
    </div>
    <div class="terminal-body contact-body">
      <div class="contact-hint"># try: email &lt;your message here&gt;</div>
    </div>`;

  container.replaceWith(win);

  const body = win.querySelector('.contact-body');
  let buffer = '';

  addContactPrompt(body);

  win.addEventListener('click', () => win.focus());
  win.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();

    if (e.key === 'Enter') {
      runEmailCommand(buffer.trim(), body);
      buffer = '';
    } else if (e.key === 'Backspace') {
      buffer = buffer.slice(0, -1);
      body.querySelector('.contact-line:last-child .contact-typed').textContent = buffer;
    } else if (e.key.length === 1) {
      buffer += e.key;
      body.querySelector('.contact-line:last-child .contact-typed').textContent = buffer;
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
  } else if (cmd !== '') {
    addContactOutput(body, `command not found: ${cmd.split(' ')[0]}`, true);
  }

  addContactPrompt(body);
  body.querySelector('.contact-line:last-child').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
