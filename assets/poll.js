// ---------- Pre-workshop poll ----------
// Each .poll[data-motion] block gets the live tally from ENDPOINT (assets/site.js, see tools/backend.gs)
// and lets visitors vote for / undecided / against, with an optional argument. A random voter id in
// localStorage lets people change their stance; the server counts only the latest one per motion.
(() => {
  const polls = [...document.querySelectorAll('.poll[data-motion]')];
  if (!polls.length || !ENDPOINT) return;
  const MIN_SHOWN = 20;  // show the split only once a motion has this many votes
  const LABELS = { for: 'For', undecided: 'Undecided', against: 'Against' };

  const store = {
    get: k => { try { return localStorage.getItem('bitterslam-' + k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem('bitterslam-' + k, v); } catch { /* private mode: vote still counts */ } },
  };
  let voter = store.get('voter');
  if (!voter) {
    voter = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    store.set('voter', voter);
  }

  const render = (res) => polls.forEach(el => {
    const m = el.dataset.motion, c = res.tally[m], bar = el.querySelector('.bar');
    const n = c.for + c.undecided + c.against;
    el.querySelector('.poll-n').textContent = `pre-workshop poll · ${n} vote${n === 1 ? '' : 's'}`;
    if (n < MIN_SHOWN) {
      bar.classList.add('pending');
      bar.dataset.msg = res.open ? `Results appear after ${MIN_SHOWN} votes. Cast yours below.` : 'The pre-workshop poll is closed.';
    } else {
      bar.classList.remove('pending');
      // whole percentages that add up to 100
      const pct = { for: Math.round(100 * c.for / n), against: Math.round(100 * c.against / n) };
      pct.undecided = 100 - pct.for - pct.against;
      [['p', 'for'], ['u', 'undecided'], ['o', 'against']].forEach(([cls, s]) => {
        const seg = bar.querySelector('.' + cls);
        seg.style.width = pct[s] + '%';
        seg.style.padding = pct[s] < 1 ? '0' : '';
        seg.textContent = pct[s] >= 18 ? `${LABELS[s]} ${pct[s]}%` : pct[s] >= 8 ? `${pct[s]}%` : '';
        seg.title = `${LABELS[s]}: ${c[s]} vote${c[s] === 1 ? '' : 's'} (${pct[s]}%)`;
      });
    }
    const row = el.querySelector('.vote-row'), mine = store.get('vote-' + m);
    row.hidden = !res.open;
    row.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.stance === mine));
    el.querySelector('.vote-arg').hidden = !res.open || !mine;
  });

  const fail = (el, msg) => {
    const st = el.querySelector('.vote-status');
    st.className = 'vote-status err';
    st.textContent = msg && isNaN(msg) && msg !== 'Failed to fetch' ? msg : 'The poll could not be reached. Please try again later.';
  };

  const send = async (el, stance, argument = '') => {
    const st = el.querySelector('.vote-status'), buttons = el.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
    st.className = 'vote-status'; st.textContent = 'Sending…';
    try {
      const body = new URLSearchParams({ kind: 'poll', voter, motion: el.dataset.motion, stance, argument, t: Math.round(performance.now()) });
      const r = await fetch(ENDPOINT, { method: 'POST', body });
      const res = await r.json().catch(() => ({}));
      if (!r.ok || !res.ok || !res.tally) throw new Error(res.error || r.status);
      store.set('vote-' + el.dataset.motion, stance);
      render(res);
      st.textContent = argument ? 'Thank you! Your argument has been received.'
        : `Your vote: ${LABELS[stance]}. You can change it at any time, and add an argument if you like.`;
      return true;
    } catch (err) {
      fail(el, err.message);
      return false;
    } finally { buttons.forEach(b => b.disabled = false); }
  };

  polls.forEach(el => {
    el.querySelectorAll('.vote-row button').forEach(b => b.addEventListener('click', () => send(el, b.dataset.stance)));
    const form = el.querySelector('.vote-arg');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = form.elements.argument.value.trim(), stance = store.get('vote-' + el.dataset.motion);
      if (!text || !stance) return;
      if ((text.match(/\S+/g) || []).length > 60) return fail(el, 'Please keep your argument within 60 words.');
      if (await send(el, stance, text)) form.reset();
    });
  });

  fetch(ENDPOINT).then(r => r.json()).then(res => {
    if (!res.ok || !res.tally) throw new Error();
    render(res);
  }).catch(() => polls.forEach(el => { el.querySelector('.bar').dataset.msg = 'The poll is unavailable right now.'; }));
})();
