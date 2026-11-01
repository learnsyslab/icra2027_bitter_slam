// Apps Script web app behind the junior voices form and the pre-workshop poll (see tools/backend.gs).
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzUBGtjIw-kRQjG-buHZx83VaBMiRCNKeRDBidfaOUbaMDCgTKj8z7ZlXkPJXphXLo0/exec';

// ---------- Avatar colors ----------
document.querySelectorAll('.avatar[data-h]').forEach(el => {
  const h = +el.dataset.h;
  el.style.background = `linear-gradient(140deg, hsl(${h} 70% 42%), hsl(${(h + 50) % 360} 70% 28%))`;
});

// ---------- Nav background on scroll ----------
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('solid', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

// ---------- Reveal on scroll ----------
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 }) : null;
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
