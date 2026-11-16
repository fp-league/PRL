/* PRL — F1 car models (original artwork). carTop(colour, number) = top-down, nose up.
   carSide(colour, accent, number) = side profile, facing right, wheels spin with .spin class. */
(() => {
let uid = 0;
const shade = (hex, amt) => {
  let c = (hex || '#ff6a00').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  return '#' + [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
};
const lum = hex => { const n = parseInt((hex || '#000').replace('#','').padEnd(6,'0'), 16); return ((n>>16&255)*.299 + (n>>8&255)*.587 + (n&255)*.114) / 255; };

window.carTop = function(c, n){
  const id = 'ct' + (++uid), dk = shade(c, -.45), lt = shade(c, .35), acc = lum(c) > .6 ? '#111' : '#fff';
  return `<svg viewBox="-6 0 112 244" aria-hidden="true" class="car-top">
  <defs>
    <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${dk}"/><stop offset=".3" stop-color="${c}"/><stop offset=".5" stop-color="${lt}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
    <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="#0a0a0a"/><stop offset=".35" stop-color="#2b2b2b"/><stop offset=".6" stop-color="#1c1c1c"/><stop offset="1" stop-color="#050505"/></linearGradient>
    <radialGradient id="${id}h" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="${acc === '#fff' ? '#e8e8e8' : '#ffd9bd'}"/><stop offset="1" stop-color="#777"/></radialGradient>
  </defs>
  <!-- floor -->
  <path d="M30 96 L22 104 L16 176 L22 206 L78 206 L84 176 L78 104 L70 96 Z" fill="#111"/>
  <path d="M16 176 L22 206 L78 206 L84 176" fill="none" stroke="#2a2a2a" stroke-width="1.2"/>
  <!-- rear tyres -->
  <rect x="-4" y="172" width="25" height="50" rx="6" fill="url(#${id}t)" stroke="#3a3a3a" stroke-width=".8"/><rect x="79" y="172" width="25" height="50" rx="6" fill="url(#${id}t)" stroke="#3a3a3a" stroke-width=".8"/>
  <rect x="-4" y="172" width="2.4" height="50" rx="1" fill="#e10600" opacity=".9"/><rect x="101.6" y="172" width="2.4" height="50" rx="1" fill="#e10600" opacity=".9"/>
  <!-- front tyres -->
  <rect x="0" y="46" width="21" height="40" rx="5" fill="url(#${id}t)" stroke="#3a3a3a" stroke-width=".8"/><rect x="79" y="46" width="21" height="40" rx="5" fill="url(#${id}t)" stroke="#3a3a3a" stroke-width=".8"/>
  <rect x="0" y="46" width="2.2" height="40" rx="1" fill="#e10600" opacity=".9"/><rect x="97.8" y="46" width="2.2" height="40" rx="1" fill="#e10600" opacity=".9"/>
  <!-- suspension -->
  <g stroke="#1a1a1a" stroke-width="2.4" stroke-linecap="round">
    <path d="M20 60 L42 70 M20 72 L42 82 M80 60 L58 70 M80 72 L58 82"/>
    <path d="M20 186 L36 178 M20 200 L36 196 M80 186 L64 178 M80 200 L64 196"/>
  </g>
  <!-- front wing -->
  <path d="M4 18 Q50 8 96 18 L96 26 Q50 17 4 26 Z" fill="#141414"/>
  <path d="M6 22 Q50 13 94 22 L94 27 Q50 19 6 27 Z" fill="${c}"/>
  <path d="M8 28 Q50 21 92 28 L92 31 Q50 25 8 31 Z" fill="${dk}"/>
  <rect x="1" y="12" width="5" height="22" rx="1.5" fill="#0d0d0d" stroke="#3a3a3a" stroke-width=".7"/><rect x="94" y="12" width="5" height="22" rx="1.5" fill="#0d0d0d" stroke="#3a3a3a" stroke-width=".7"/>
  <!-- nose -->
  <path d="M44 6 Q50 2 56 6 L60 70 L40 70 Z" fill="url(#${id}b)"/>
  <path d="M48.5 8 L51.5 8 L53 68 L47 68 Z" fill="${acc}" opacity=".85"/>
  <!-- sidepods -->
  <path d="M38 98 L24 112 Q20 140 26 168 Q34 188 42 196 L58 196 Q66 188 74 168 Q80 140 76 112 L62 98 Z" fill="url(#${id}b)"/>
  <path d="M26 112 L34 104 L34 112 Z M74 112 L66 104 L66 112 Z" fill="#050505"/>
  <path d="M27 120 Q24 146 30 166 L36 160 Q32 142 33 122 Z M73 120 Q76 146 70 166 L64 160 Q68 142 67 122 Z" fill="#000" opacity=".28"/>
  <!-- chassis + engine cover -->
  <path d="M40 66 L60 66 L63 104 L60 150 L56 200 L44 200 L40 150 L37 104 Z" fill="url(#${id}b)"/>
  <path d="M48.6 120 L51.4 120 L52 198 L48 198 Z" fill="${acc}" opacity=".9"/>
  <path d="M50 118 L50 200" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>
  <!-- cockpit, halo, mirrors -->
  <rect x="31" y="92" width="7" height="4" rx="1.5" fill="#111" transform="rotate(-12 34 94)"/><rect x="62" y="92" width="7" height="4" rx="1.5" fill="#111" transform="rotate(12 66 94)"/>
  <ellipse cx="50" cy="94" rx="8.5" ry="15" fill="#0b0b0b"/>
  <circle cx="50" cy="97" r="6.2" fill="url(#${id}h)"/>
  <path d="M45 94.5 Q50 91.5 55 94.5" stroke="#111" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M41.5 103 Q41 82 50 79 Q59 82 58.5 103" stroke="#1d1d1d" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <path d="M50 79 L50 86" stroke="#1d1d1d" stroke-width="3"/>
  <!-- airbox -->
  <path d="M45 108 Q50 104 55 108 L54 116 L46 116 Z" fill="#0a0a0a"/>
  <!-- rear wing -->
  <rect x="8" y="222" width="84" height="5" rx="1" fill="#141414"/>
  <rect x="10" y="227" width="80" height="8" rx="1.5" fill="${c}"/>
  <rect x="10" y="227" width="80" height="2" fill="${lt}" opacity=".6"/>
  <rect x="5" y="218" width="5" height="22" rx="1.5" fill="#0d0d0d" stroke="#3a3a3a" stroke-width=".7"/><rect x="90" y="218" width="5" height="22" rx="1.5" fill="#0d0d0d" stroke="#3a3a3a" stroke-width=".7"/>
  <rect x="47" y="236" width="6" height="4" rx="1" fill="#ff2a2a"/>
  ${n !== undefined && n !== '' ? `<text x="50" y="233.5" font-size="7" font-weight="900" text-anchor="middle" fill="${acc}" font-family="Arial Black,Arial,sans-serif">${n}</text>` : ''}
  </svg>`;
};

window.carSide = function(c, accent, n){
  const id = 'cs' + (++uid), dk = shade(c, -.45), lt = shade(c, .35);
  const a = accent || (lum(c) > .6 ? '#111' : '#fff');
  const wheel = (cx, cy, r) => `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0c0c0c" stroke="#3a3a3a" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="#e10600" stroke-width="1.6" opacity=".9"/>
      <circle cx="${cx}" cy="${cy}" r="${r * .62}" fill="#1a1a1a" stroke="#333" stroke-width="1.2"/>
      <g class="spin" style="transform-origin:${cx}px ${cy}px">
        ${[0,60,120].map(d => `<rect x="${cx - 1.4}" y="${cy - r * .58}" width="2.8" height="${r * 1.16}" fill="#3a3a3a" transform="rotate(${d} ${cx} ${cy})"/>`).join('')}
        <path d="M${cx - r + 4} ${cy} A${r - 4} ${r - 4} 0 0 1 ${cx} ${cy - r + 4}" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r * .16}" fill="${c}"/>
    </g>`;
  return `<svg viewBox="0 0 400 112" aria-hidden="true" class="car-side">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
    <radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="200" cy="104" rx="190" ry="8" fill="url(#${id}s)"/>
  <!-- rear wing -->
  <path d="M30 38 L40 38 L56 70 L46 72 Z" fill="#161616" stroke="#333" stroke-width=".8"/>
  <path d="M24 62 L58 66 L58 71 L26 68 Z" fill="${dk}"/>
  <rect x="12" y="20" width="10" height="52" rx="2" fill="#151515" stroke="#3a3a3a" stroke-width="1"/>
  <path d="M14 22 L56 24 L56 32 L14 31 Z" fill="${c}"/>
  <path d="M15 34 L54 35 L54 40 L15 40 Z" fill="${dk}"/>
  <path d="M14 22 L56 24 L56 25.5 L14 23.5 Z" fill="${lt}"/>
  <!-- floor -->
  <path d="M60 91 L352 89 L352 94 L60 95 Z" fill="#0d0d0d"/>
  <!-- body -->
  <path d="M46 86 L50 64 C 92 58 122 40 148 29 L170 26 L174 39 L178 45 L214 47 C 254 52 300 63 342 74 L382 84 L376 90 L300 90 L120 92 Z" fill="url(#${id}g)"/>
  <!-- sidepod -->
  <path d="M122 90 C 126 64 150 57 198 61 L262 68 C 274 76 274 84 266 90 Z" fill="${dk}" opacity=".55"/>
  <path d="M196 61 L206 61 L206 72 L196 72 Z" fill="#050505" opacity=".85"/>
  <!-- livery stripe -->
  <path d="M60 70 C 120 64 170 60 230 62 L330 76 L332 80 L230 67 C 170 65 120 69 62 75 Z" fill="${a}" opacity=".9"/>
  <!-- airbox + tcam -->
  <path d="M164 27 L170 26 L174 39 L168 39 Z" fill="#0a0a0a"/>
  <rect x="150" y="22" width="12" height="4" rx="1" fill="#111"/>
  <!-- cockpit / halo / driver -->
  <circle cx="196" cy="40" r="9" fill="${a === '#111' ? '#ffd9bd' : '#f2f2f2'}"/>
  <path d="M188 39 L205 37 L205 42 L189 43 Z" fill="#0a0a0a"/>
  <path d="M176 45 Q 186 30 214 36 L 216 46" stroke="#1b1b1b" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <rect x="222" y="43" width="12" height="4" rx="1.5" fill="#111"/>
  <!-- front wing -->
  <rect x="380" y="76" width="14" height="20" rx="2" fill="#151515" stroke="#3a3a3a" stroke-width="1"/>
  <path d="M330 90 L396 88 L396 93 L330 95 Z" fill="${c}"/>
  <path d="M340 84 L392 82 L392 86 L340 88 Z" fill="${dk}"/>
  <!-- suspension -->
  <path d="M290 74 L318 80 M292 82 L318 82 M96 74 L78 76 M98 84 L78 80" stroke="#1a1a1a" stroke-width="2.4" stroke-linecap="round"/>
  ${wheel(78, 78, 27)}
  ${wheel(318, 80, 24.5)}
  ${n !== undefined && n !== '' ? `<text x="118" y="64" font-size="16" font-weight="900" text-anchor="middle" fill="${a}" font-family="Arial Black,Arial,sans-serif" font-style="italic">${n}</text>` : ''}
  </svg>`;
};
})();
