// ---------- Junior voices form ----------
// Posts to ENDPOINT (assets/site.js, see tools/backend.gs); while it is empty the form stays disabled.
// Spam guards: the hidden 'website' field must stay empty, and 't' (time on page) tells the script
// whether a person could have filled the form in.
(() => {
  const form = document.getElementById('jv-form'), status = document.getElementById('jv-status');
  const words = t => (t.trim().match(/\S+/g) || []).length;
  form.querySelectorAll('textarea[data-max-words]').forEach(ta => {
    const out = form.querySelector(`.count[data-for="${ta.id}"]`), max = +ta.dataset.maxWords;
    const upd = () => { const n = words(ta.value); out.textContent = `${n} / ${max} words`; out.classList.toggle('over', n > max); };
    ta.addEventListener('input', upd); upd();
  });
  if (!ENDPOINT) {
    form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
    status.textContent = 'Submissions open with the call for papers.';
    return;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const tooLong = [...form.querySelectorAll('textarea[data-max-words]')].some(ta => words(ta.value) > +ta.dataset.maxWords);
    // each motion needs both a side and a statement, or neither; at least one motion is required
    const motions = ['m1', 'm2'].map(m => [form.elements[m + '_side'].value, form.elements[m + '_statement'].value.trim()]);
    const motionErr = motions.some(([side, text]) => !side !== !text) ? 'Please choose a side and write a statement for each motion you address.'
      : motions.every(([side]) => !side) ? 'Please address at least one motion.' : '';
    if (!form.checkValidity() || tooLong || motionErr) {
      status.className = 'jv-status err';
      status.textContent = tooLong ? 'Please keep within the word limits.' : motionErr || 'Please fill in all required fields and accept the privacy note.';
      return;
    }
    form.elements.t.value = Math.round(performance.now());
    const btn = form.querySelector('button'); btn.disabled = true;
    status.className = 'jv-status'; status.textContent = 'Sending…';
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', body: new URLSearchParams(new FormData(form)) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok || !res.ok) throw new Error(res.error || r.status);
      form.reset(); form.querySelectorAll('textarea').forEach(ta => ta.dispatchEvent(new Event('input')));
      status.className = 'jv-status ok'; status.textContent = 'Thank you! Your statement has been received.';
    } catch (err) {
      status.className = 'jv-status err';
      status.textContent = err.message && isNaN(err.message) && err.message !== 'Failed to fetch' ? err.message
        : 'Sending failed. Please try again or email haoming.zhang@tum.de.';
    } finally { btn.disabled = false; }
  });
})();
