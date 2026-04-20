document.addEventListener('DOMContentLoaded', () => {
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
