document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('resume-preview');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'resume-wrapper';
  wrapper.innerHTML = `
    <div class="resume-clip">
      <iframe
        src="/web/assets/static/resume.pdf#toolbar=0&navpanes=0&scrollbar=0"
        class="resume-frame"
        title="Resume"
      ></iframe>
      <div class="resume-fade"></div>
    </div>
    <button class="resume-btn">&#9660; expand resume</button>`;

  container.replaceWith(wrapper);

  const clip = wrapper.querySelector('.resume-clip');
  const fade = wrapper.querySelector('.resume-fade');
  const btn = wrapper.querySelector('.resume-btn');

  const PREVIEW_H = 300;
  let expanded = false;

  btn.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      const frame = wrapper.querySelector('.resume-frame');
      clip.style.height = frame.offsetHeight + 'px';
      fade.hidden = true;
      btn.innerHTML = '&#9650; collapse resume';
    } else {
      clip.style.height = PREVIEW_H + 'px';
      fade.hidden = false;
      btn.innerHTML = '&#9660; expand resume';
    }
  });
});
