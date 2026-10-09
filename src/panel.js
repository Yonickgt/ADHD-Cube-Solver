// Left "signal-box" panel + scramble strip + control state. Pure DOM rendering from a model:
// { scramble: string[], steps: [{stage,label,name,alg,moves}], moves: [{tok, si, mi}], cursor, playing }
const STAGES = [
  { id: 'Cross', long: 'White, on D' },
  { id: 'F2L', long: 'First Two Layers' },
  { id: 'OLL', long: 'Orient Last Layer' },
  { id: 'PLL', long: 'Permute Last Layer' },
];

// Terse, cuber-register explanations.
const EXPLAIN = {
  Cross: () => 'Four white edges onto D, each matched to its side centre. Optimal for this scramble, found at inspection.',
  F2L: s => `Pair the ${s.name} and insert it into the ${s.slot} slot. Cross and earlier pairs stay intact.`,
  OLL: s => `Make the U face all yellow. Case: ${s.name}.`,
  PLL: s => (/^[A-Z][a-z]?$/.test(s.name) ? `Permute the last layer: ${s.name}-perm.` : `Permute the last layer: ${s.name}.`),
};
const explain = s => s.label === 'AUF'
  ? (s.name === 'Final U turn' ? 'AUF: turn U to align the top layer with the centres. Solved after this.' : 'AUF: turn U so the next alg starts from the right angle.')
  : EXPLAIN[s.stage](s);

// Recognisable sub-sequences, matched against the alg text.
const TRIGGERS = [
  [/R U R' U'/, 'Sexy move', "R U R' U'"], [/R' F R F'/, 'Sledgehammer', "R' F R F'"],
  [/(^| )M/, 'Slice move', 'M'], [/(^| )[rfbld]/, 'Wide move', 'r f b l d'],
];

const GLOSSARY = [
  ['CFOP', 'Cross, F2L, OLL, PLL. The Fridrich method.'],
  ['Cross', 'Four white edges on D, matched to their centres.'],
  ['F2L', 'First Two Layers: solve a corner + edge as a pair and insert it.'],
  ['Pair', 'A white-layer corner joined to its middle-layer edge.'],
  ['Slot', 'One of FR, FL, BR, BL where a pair lives.'],
  ['OLL', 'Orient Last Layer: every U sticker yellow.'],
  ['PLL', 'Permute Last Layer: move oriented pieces to place.'],
  ['AUF', "Adjust U Face: a U, U' or U2 before or after an alg."],
  ['Trigger', "A short repeated sequence, e.g. sexy move R U R' U'."],
  ['y rotation', "Turn the whole cube like U so the next slot is at front-right. Shown by turning the view, not the cube."],
  ['Notation', "Letter = clockwise quarter turn of that face, ' = counter-clockwise, 2 = half turn. r f = wide, M = middle slice."],
];

const esc = s => s; // ASCII primes stay in the DOM so the scramble can be copied into a timer

export function createPanel(root, scrambleEl, btns) {
  root.innerHTML = `
    <header class="p-head">
      <h1 class="legend">CFOP Route</h1>
      <p class="lamp" id="status" role="status" aria-live="polite"></p>
    </header>
    <div class="p-body">
      <ol class="track" id="track"></ol>
      <section class="note" id="note" aria-live="polite"></section>
      <details class="gloss"><summary class="legend">Glossary</summary><dl id="gloss"></dl></details>
    </div>`;
  const $ = id => root.querySelector('#' + id);
  $('gloss').innerHTML = GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${esc(d)}</dd>`).join('');

  const tokens = (step, base, cursor) => step.moves.map((tok, i) => {
    const g = base + i, st = g < cursor ? 'played' : g === cursor ? 'next' : 'todo';
    return `<span class="mv" data-s="${st}">${esc(tok)}</span>`;
  }).join(' ');

  function render({ scramble, steps, moves, cursor, playing, ready = true }) {
    const N = moves.length;
    scrambleEl.querySelector('.tokens').innerHTML = scramble.map(t => `<span>${esc(t)}</span>`).join(' ');

    const base = []; let acc = 0; steps.forEach(s => { base.push(acc); acc += s.moves.length; });
    const cur = cursor < N ? moves[cursor].si : steps.length - 1;
    const showStage = steps.length ? steps[cur].stage : 'Cross';
    const prog = STAGES.map(st => {
      const idx = steps.map((s, i) => (s.stage === st.id ? i : -1)).filter(i => i >= 0);
      const total = idx.reduce((a, i) => a + steps[i].moves.length, 0);
      const applied = idx.reduce((a, i) => a + Math.max(0, Math.min(steps[i].moves.length, cursor - base[i])), 0);
      return { ...st, idx, total, applied };
    });

    $('track').innerHTML = prog.map((p, k) => {
      const state = !p.total ? 'skip' : p.applied === p.total ? 'done' : p.id === showStage || p.applied ? 'current' : 'todo';
      const open = p.id === showStage && p.total;
      const body = open ? `<ul class="steps">${p.idx.map(i => {
        const s = steps[i], ss = base[i] + s.moves.length <= cursor ? 'done' : i === cur ? 'current' : 'todo';
        return `<li class="step" data-s="${ss}"><p class="step-head"><span class="step-label">${s.label}</span><span class="step-name">${esc(s.name)}</span></p><p class="alg">${tokens(s, base[i], cursor)}</p></li>`;
      }).join('')}</ul>` : '';
      return `<li class="stn" data-state="${state}" style="--p:${p.total ? (100 * p.applied / p.total).toFixed(1) : 0}%" data-k="${k}">
        <span class="mark" aria-hidden="true"></span><span class="jog" aria-hidden="true"></span>
        <p class="stn-head"><span class="legend">${p.id}</span><span class="stn-long">${p.long}</span><span class="count">${p.total ? `${p.applied}/${p.total}` : 'skipped'}</span></p>${body}</li>`;
    }).join('');

    if (!steps.length) $('note').innerHTML = '<p>Solved. Rescramble for a new route.</p>';
    else {
      const s = steps[cur];
      const chips = TRIGGERS.filter(([re]) => re.test(s.alg)).slice(0, 2)
        .map(([, n, a]) => `<span class="chip"><b>${n}</b> <code>${esc(a)}</code></span>`).join('');
      $('note').innerHTML = `<p>${esc(explain(s))}</p>${chips ? `<p class="chips">${chips}</p>` : ''}`;
    }

    $('status').textContent = !N ? 'Solved' : cursor >= N ? 'Route complete' : `Move ${cursor + 1} of ${N}`;
    $('status').dataset.on = N && cursor < N ? '1' : '';

    const [prev, next, play] = btns;
    prev.disabled = cursor <= 0 || !ready; next.disabled = cursor >= N || !ready; play.disabled = cursor >= N || !ready;
    play.querySelector('span').textContent = playing ? 'Pause' : 'Full solve';
    play.dataset.playing = playing ? '1' : '';
  }
  return { render };
}
