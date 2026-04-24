document.addEventListener('about-revealed', () => {
  const container = document.getElementById('resume-preview');
  if (!container) return;

  const PDF_SRC = '/web/assets/static/resume.pdf#toolbar=0&navpanes=0&scrollbar=0';
  const PDF_DL  = '/web/assets/static/resume.pdf';

  const wrapper = document.createElement('div');
  wrapper.className = 'resume-wrapper';
  wrapper.innerHTML = `
    <div class="resume-clip">
      <iframe src="${PDF_SRC}" class="resume-frame" title="Resume"></iframe>
      <div class="resume-fade"></div>
      <div class="resume-shield"></div>
    </div>`;

  container.replaceWith(wrapper);

  const clip   = wrapper.querySelector('.resume-clip');
  const frame  = wrapper.querySelector('.resume-frame');
  const fade   = wrapper.querySelector('.resume-fade');
  const shield = wrapper.querySelector('.resume-shield');

  let ptW = 612, ptH = 792; // US Letter fallback
  let expanded = false;

  function fullHeight() {
    return clip.clientWidth * (ptH / ptW);
  }

  function sizeFrame() {
    const h = fullHeight();
    if (h > 0) frame.style.height = h + 'px';
  }

  function expand() {
    if (expanded) return;
    expanded = true;
    window.removeEventListener('scroll', checkExpand, { passive: true });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      clip.style.height = fullHeight() + 'px';
      fade.hidden = true;
    }));
  }

  function checkExpand() {
    if (clip.getBoundingClientRect().bottom <= window.innerHeight + 2) expand();
  }

  // Parse MediaBox → native px width + aspect ratio
  fetch(PDF_DL)
    .then(r => r.arrayBuffer())
    .then(buf => {
      const text = new TextDecoder('latin1').decode(new Uint8Array(buf));
      const m = text.match(/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/);
      if (m) {
        ptW = parseFloat(m[1]);
        ptH = parseFloat(m[2]);
        clip.style.maxWidth = Math.round(ptW * 96 / 72) + 'px';
      }
      sizeFrame();
      checkExpand();
    });

  const ro = new ResizeObserver(() => {
    sizeFrame();
    if (expanded) clip.style.height = fullHeight() + 'px';
  });
  ro.observe(clip);

  window.addEventListener('scroll', checkExpand, { passive: true });
  checkExpand(); // handle case where clip already in viewport on init

  // Click to download
  shield.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = PDF_DL;
    a.download = 'resume.pdf';
    a.click();
  });
});
