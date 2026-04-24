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

  // Parse MediaBox → native px width
  fetch(PDF_DL)
    .then(r => r.arrayBuffer())
    .then(buf => {
      const text = new TextDecoder('latin1').decode(new Uint8Array(buf));
      const m = text.match(/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/);
      if (m) {
        const pxW = Math.round(parseFloat(m[1]) * 96 / 72);
        clip.style.maxWidth = pxW + 'px';
      }
    });

  // Scroll-to-expand preview
  function checkExpand() {
    if (clip.getBoundingClientRect().bottom <= window.innerHeight + 2) {
      window.removeEventListener('scroll', checkExpand, { passive: true });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        clip.style.height = frame.offsetHeight + 'px';
        fade.hidden = true;
      }));
    }
  }
  window.addEventListener('scroll', checkExpand, { passive: true });

  // Click to download
  shield.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = PDF_DL;
    a.download = 'resume.pdf';
    a.click();
  });
});
