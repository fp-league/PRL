/* PRL — synthesised F1 sounds (no audio files). Off by default; toggled by the viewer. */
(() => {
  let ctx = null, on = false;
  try { on = localStorage.getItem('prl_sound') === '1'; } catch (_) {}
  const ac = () => {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const sync = () => document.querySelectorAll('[data-sound]').forEach(b => {
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    b.innerHTML = on ? '🔊 <span>Sound on</span>' : '🔇 <span>Sound off</span>';
  });

  function beep(freq = 880, dur = .14){
    if (!on) return; const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(.08, c.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur + .05);
  }

  // V6 hybrid-ish launch: harmonics sweeping up through gear changes + tyre noise
  function launch(){
    if (!on) return; const c = ac(); if (!c) return;
    const t0 = c.currentTime, dur = 3.4;
    const master = c.createGain(); master.gain.setValueAtTime(.0001, t0);
    master.gain.exponentialRampToValueAtTime(.32, t0 + .08); master.gain.setValueAtTime(.32, t0 + dur - 1.2);
    master.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    const shaper = c.createWaveShaper(); const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3.2); }
    shaper.curve = curve;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t0); lp.frequency.linearRampToValueAtTime(3200, t0 + dur);
    shaper.connect(lp).connect(master).connect(c.destination);
    // rpm curve with 3 gear shifts
    const shifts = [[0, 70], [.75, 330], [.8, 210], [1.5, 380], [1.55, 250], [2.3, 410], [2.35, 290], [dur, 430]];
    [[1, 'sawtooth', .5], [2, 'sawtooth', .28], [3, 'square', .12], [.5, 'triangle', .35]].forEach(([mul, type, vol]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; g.gain.value = vol;
      o.frequency.setValueAtTime(shifts[0][1] * mul, t0);
      shifts.slice(1).forEach(([t, f]) => o.frequency.linearRampToValueAtTime(f * mul, t0 + t));
      o.detune.value = (Math.random() - .5) * 18;
      o.connect(g).connect(shaper); o.start(t0); o.stop(t0 + dur + .1);
    });
    // wheelspin / tyre noise
    const nb = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const ns = c.createBufferSource(); ns.buffer = nb;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .8;
    const ng = c.createGain(); ng.gain.value = .18;
    ns.connect(bp).connect(ng).connect(c.destination); ns.start(t0);
  }

  function toggle(){ on = !on; try { localStorage.setItem('prl_sound', on ? '1' : '0'); } catch (_) {} if (on) { ac(); beep(660, .08); } sync(); }
  document.addEventListener('click', e => { if (e.target.closest('[data-sound]')) { e.preventDefault(); toggle(); } });
  // unlock audio on first interaction if the viewer already chose sound on
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (on) ac(); }, { once: true }));
  window.PRLSound = { beep, launch, sync, get on(){ return on; } };
  document.addEventListener('DOMContentLoaded', sync); sync();
})();
