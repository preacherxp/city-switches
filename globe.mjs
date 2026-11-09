// Pixel world map for the city switches. The map is painted into a canvas one
// logical pixel per cell and scaled up by CSS, so it shares the switches' look.
// Natural Earth geometry is rasterized into a channel mask, then each cell is
// coloured from a palette that follows the selected switch from day to night.

const LAT_TOP = 84, LAT_BOTTOM = -60, MAX_SCALE = 131072;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function mercator(lon, lat) {
  const phi = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
  return { x: (lon + 180) / 360, y: (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2 };
}
export function unmercator(x, y) {
  return { lon: x * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI };
}
export const wrapDelta = (from, to) => to - from - Math.round(to - from);

export function clusterPoints(points, radius) {
  const remaining = new Set(points), groups = [];
  for (const point of points) {
    if (!remaining.delete(point)) continue;
    const group = [point];
    for (let i = 0; i < group.length; i++) {
      for (const other of remaining) {
        if (Math.hypot(group[i].x - other.x, group[i].y - other.y) < radius) {
          remaining.delete(other); group.push(other);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

// Smooth zoom-and-pan path (van Wijk & Nuij). Views are [x, y, width] in world units.
export function zoomPath([x0, y0, w0], [x1, y1, w1]) {
  const rho = Math.SQRT2, dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
  if (d2 < 1e-18) {
    const S = Math.log(w1 / w0) / rho;
    return { length: Math.abs(S), at: (t) => [x0 + t * dx, y0 + t * dy, w0 * Math.exp(rho * t * S)] };
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + 4 * d2) / (2 * w0 * 2 * d1), b1 = (w1 * w1 - w0 * w0 - 4 * d2) / (2 * w1 * 2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), S = (r1 - r0) / rho;
  return {
    length: S,
    at(t) {
      const s = t * S, u = w0 / (2 * d1) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return [x0 + u * dx, y0 + u * dy, w0 * Math.cosh(r0) / Math.cosh(rho * s + r0)];
    },
  };
}

// ---- Bitmap fonts, after the switch engine's sign lettering
const font = (rows) => Object.fromEntries(Object.entries(rows).map(([ch, glyph]) => [ch, glyph.split(',')]));
export const FONT3 = font({
  0: '###,#.#,#.#,#.#,###', 1: '.#.,##.,.#.,.#.,###', 2: '###,..#,###,#..,###', 3: '###,..#,.##,..#,###',
  4: '#.#,#.#,###,..#,..#', 5: '###,#..,###,..#,###', 6: '###,#..,###,#.#,###', 7: '###,..#,..#,.#.,.#.',
  8: '###,#.#,###,#.#,###', 9: '###,#.#,###,..#,###',
  A: '###,#.#,###,#.#,#.#', B: '##.,#.#,##.,#.#,##.', C: '###,#..,#..,#..,###', D: '##.,#.#,#.#,#.#,##.',
  E: '###,#..,##.,#..,###', F: '###,#..,##.,#..,#..', G: '###,#..,#.#,#.#,###', H: '#.#,#.#,###,#.#,#.#',
  I: '###,.#.,.#.,.#.,###', J: '..#,..#,..#,#.#,###', K: '#.#,#.#,##.,#.#,#.#', L: '#..,#..,#..,#..,###',
  Ł: '#..,#..,##.,#..,###', M: '#...#,##.##,#.#.#,#...#,#...#', N: '#..#,##.#,#.##,#..#,#..#', O: '###,#.#,#.#,#.#,###',
  P: '###,#.#,###,#..,#..', Q: '###,#.#,#.#,###,..#', R: '##.,#.#,##.,#.#,#.#', S: '###,#..,###,..#,###',
  T: '###,.#.,.#.,.#.,.#.', U: '#.#,#.#,#.#,#.#,###', V: '#.#,#.#,#.#,#.#,.#.', W: '#...#,#...#,#.#.#,##.##,#...#',
  X: '#.#,#.#,.#.,#.#,#.#', Y: '#.#,#.#,###,.#.,.#.', Z: '###,..#,.#.,#..,###',
  '.': '.,.,.,.,#', '-': '...,...,###,...,...', '+': '...,.#.,###,.#.,...', "'": '#,#,.,.,.', ' ': '..,..,..,..,..',
});
export const FONT5 = font({
  A: '.###.,#...#,#...#,#####,#...#,#...#,#...#', B: '####.,#...#,#...#,####.,#...#,#...#,####.',
  C: '.####,#....,#....,#....,#....,#....,.####', D: '####.,#...#,#...#,#...#,#...#,#...#,####.',
  E: '#####,#....,#....,####.,#....,#....,#####', F: '#####,#....,#....,####.,#....,#....,#....',
  G: '.####,#....,#....,#.###,#...#,#...#,.###.', H: '#...#,#...#,#...#,#####,#...#,#...#,#...#',
  I: '###,.#.,.#.,.#.,.#.,.#.,###', J: '..###,...#.,...#.,...#.,...#.,#..#.,.##..',
  K: '#...#,#..#.,#.#..,##...,#.#..,#..#.,#...#', L: '#....,#....,#....,#....,#....,#....,#####',
  Ł: '#....,#....,#.#..,##...,#....,#....,#####', M: '#...#,##.##,#.#.#,#.#.#,#...#,#...#,#...#',
  N: '#...#,##..#,##..#,#.#.#,#..##,#..##,#...#', O: '.###.,#...#,#...#,#...#,#...#,#...#,.###.',
  P: '####.,#...#,#...#,####.,#....,#....,#....', Q: '.###.,#...#,#...#,#...#,#.#.#,#..#.,.##.#',
  R: '####.,#...#,#...#,####.,#.#..,#..#.,#...#', S: '.####,#....,#....,.###.,....#,....#,####.',
  T: '#####,..#..,..#..,..#..,..#..,..#..,..#..', U: '#...#,#...#,#...#,#...#,#...#,#...#,.###.',
  V: '#...#,#...#,#...#,#...#,.#.#.,.#.#.,..#..', W: '#...#,#...#,#...#,#.#.#,#.#.#,##.##,#...#',
  X: '#...#,#...#,.#.#.,..#..,.#.#.,#...#,#...#', Y: '#...#,#...#,.#.#.,..#..,..#..,..#..,..#..',
  Z: '#####,....#,...#.,..#..,.#...,#....,#####',
  0: '.###.,#...#,#..##,#.#.#,##..#,#...#,.###.', 1: '..#..,.##..,..#..,..#..,..#..,..#..,.###.',
  2: '.###.,#...#,....#,..##.,.#...,#....,#####', 3: '####.,....#,....#,.###.,....#,....#,####.',
  4: '...#.,..##.,.#.#.,#..#.,#####,...#.,...#.', 5: '#####,#....,####.,....#,....#,#...#,.###.',
  6: '.###.,#....,#....,####.,#...#,#...#,.###.', 7: '#####,....#,...#.,..#..,.#...,.#...,.#...',
  8: '.###.,#...#,#...#,.###.,#...#,#...#,.###.', 9: '.###.,#...#,#...#,.####,....#,....#,.###.',
  '.': '.,.,.,.,.,.,#', '-': '....,....,....,####,....,....,....', "'": '#,#,.,.,.,.,.', ' ': '...,...,...,...,...,...,...',
});
// Combining marks, so accented names keep their accents: [x from centre or edge, row].
const MARKS = {
  '́': (w, c) => [[Math.min(w - 1, c + 1), -2]],
  '̀': (w, c) => [[Math.max(0, c - 1), -2]],
  '̇': (w, c) => [[c, -2]],
  '̈': (w) => [[0, -2], [w - 1, -2]],
  '̂': (w, c) => [[c, -3], [c - 1, -2], [c + 1, -2]],
  '̌': (w, c) => [[c - 1, -3], [c + 1, -3], [c, -2]],
  '̃': (w, c) => [[c - 1, -2], [c, -3], [c + 1, -3], [c + 2, -2]],
  '̊': (w, c) => [[c, -3], [c - 1, -2], [c + 1, -2]],
  '̨': (w, c, h) => [[w - 2, h], [w - 1, h + 1]],
  '̧': (w, c, h) => [[c, h], [c - 1, h + 1]],
};
export function textBitmap(text, glyphs = FONT3) {
  const height = glyphs.A.length, points = [];
  let x = 0, top = 0, bottom = height - 1;
  for (const ch of text.toUpperCase()) {
    const [base, ...marks] = glyphs[ch] ? [ch] : ch.normalize('NFD');
    const rows = glyphs[base] || glyphs[' '], w = rows[0].length, c = (w - 1) >> 1;
    rows.forEach((row, y) => { for (let i = 0; i < w; i++) if (row[i] === '#') points.push([x + i, y]); });
    for (const mark of marks) for (const [mx, my] of MARKS[mark]?.(w, c, height) || []) {
      points.push([x + mx, my]); top = Math.min(top, my); bottom = Math.max(bottom, my);
    }
    x += w + 1;
  }
  return { width: Math.max(0, x - 1), top, bottom, points };
}
// Crisp SVG lettering for headings; the real text stays in the document for assistive tech.
export function pixelSvg(text, glyphs) {
  const { width, top, bottom, points } = textBitmap(text, glyphs), height = bottom - top + 1;
  const d = points.map(([x, y]) => `M${x} ${y - top}h1v1h-1z`).join('');
  return `<svg aria-hidden="true" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges"><path fill="currentColor" d="${d}"/></svg>`;
}
function pixelHeading(element) {
  const cell = Number(element.dataset.pixel);
  const label = element.querySelector('.sr-only') || Object.assign(document.createElement('span'), { className: 'sr-only' });
  label.textContent = element.dataset.text || element.textContent;
  element.replaceChildren(label);
  element.insertAdjacentHTML('beforeend', pixelSvg(label.textContent, FONT5));
  const svg = element.lastElementChild;
  svg.style.width = `${svg.viewBox.baseVal.width * cell}px`;
}

// ---- Palette: each colour has a day and a night value
const PALETTE = {
  deep: ['#2c566b', '#06111d'], sea: ['#346379', '#091827'], shallow: ['#4a8796', '#0f2539'], foam: ['#9fd0c8', '#21435a'],
  wave: ['#5893a6', '#173451'], grid: ['#41758a', '#11283d'],
  sand: ['#ddd2a0', '#2c3a3e'], grass: ['#a3b982', '#1d2c31'], grass2: ['#96ad77', '#1a282d'], forest: ['#7e9a68', '#152328'],
  tundra: ['#bec4a5', '#28363b'], snow: ['#eaeee8', '#3b4b56'], border: ['#5c7350', '#4a6265'], water: ['#4f8aa0', '#12304a'],
  desert: ['#dcc995', '#2e3536'], desert2: ['#c9b07a', '#283032'], rock: ['#b4a588', '#2e3a3e'], rockDark: ['#857a66', '#1d272b'], peak: ['#f4f2ea', '#56656e'],
  roofA: ['#bd735a', '#2a2a34'], roofB: ['#8e8d88', '#22252d'], roofC: ['#d4c7a6', '#30303b'], street: ['#6c6e6b', '#181b22'],
  lit: ['#f6dc9c', '#ffcf73'], lit2: ['#e8c07a', '#f39a4f'],
  ink: ['#10212b', '#03080e'], pin: ['#f4ecd8', '#e8dfc8'], selected: ['#f2b45c', '#ffc56a'], text: ['#f8f3e6', '#f3ecd8'],
};
const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const PALETTE_RGB = Object.fromEntries(Object.entries(PALETTE).map(([key, pair]) => [key, pair.map(hexRgb)]));
// The map is painted in colour roles; a lookup table turns roles into the colours of the hour
const ROLE = Object.fromEntries(Object.keys(PALETTE).map((key, i) => [key, i]));
function paletteAt(dark, duskHex) {
  const tint = hexRgb(duskHex || '#967c69'), dusk = 4 * dark * (1 - dark) * 0.42, out = new Uint32Array(256);
  for (const [key, [day, night]] of Object.entries(PALETTE_RGB)) {
    const c = day.map((v, i) => v + (night[i] - v) * dark).map((v, i) => key === 'lit' || key === 'lit2' || key === 'selected' ? v : v + (tint[i] - v) * dusk);
    out[ROLE[key]] = (255 << 24 | Math.round(c[2]) << 16 | Math.round(c[1]) << 8 | Math.round(c[0])) >>> 0;
  }
  return out;
}
const hash = (x, y) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Smooth value noise on a unit grid, for organic edges that do not follow parallels
function valueNoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ---- Pixel sprites. # outline, o fill, * window that lights at night
const PIN = ['.#####.', '#ooooo#', '#oo*oo#', '#o***o#', '#oo*oo#', '#ooooo#', '.#ooo#.', '..#o#..', '...#...'];
const PEAK = ['...s...', '..sld..', '.llldd.', 'lllddd.'];

// ---- Geometry: decode the packed Natural Earth layers into world units and cache simplified paths
function decodeRing(encoded, scale) {
  const out = new Float64Array(encoded.length);
  let lon = 0, lat = 0;
  for (let i = 0; i < encoded.length; i += 2) {
    lon += encoded[i]; lat += encoded[i + 1];
    const p = mercator(lon / scale, lat / scale); out[i] = p.x; out[i + 1] = p.y;
  }
  return out;
}
function bounds(rings) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings) for (let i = 0; i < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]); minY = Math.min(minY, ring[i + 1]); maxY = Math.max(maxY, ring[i + 1]);
  }
  return { minX, minY, maxX, maxY };
}
const LOD = [1 / 4096, 1 / 16384, 1 / 65536, 0];
function makeShape(rings, closed, rank = 0) {
  const paths = [];
  return {
    ...bounds(rings), rank,
    path(level) {
      if (paths[level]) return paths[level];
      const tolerance = LOD[level], path = new Path2D();
      for (const ring of rings) {
        let lx = ring[0], ly = ring[1], count = 1;
        path.moveTo(lx, ly);
        for (let i = 2; i < ring.length; i += 2) {
          const last = i === ring.length - 2;
          if (!last && Math.abs(ring[i] - lx) < tolerance && Math.abs(ring[i + 1] - ly) < tolerance) continue;
          lx = ring[i]; ly = ring[i + 1]; path.lineTo(lx, ly); count++;
        }
        if (closed) path.closePath();
      }
      return (paths[level] = path);
    },
  };
}
function loadWorld(data) {
  const s = data.scale;
  return {
    land: data.land.map((rings) => makeShape(rings.map((r) => decodeRing(r, s)), true)),
    lakes: data.lakes.map(({ rank, rings }) => makeShape(rings.map((r) => decodeRing(r, s)), true, rank)),
    rivers: data.rivers.map(({ rank, line }) => makeShape([decodeRing(line, s)], false, rank)),
    borders: data.borders.map(({ rank, line }) => makeShape([decodeRing(line, s)], false, rank)),
    deserts: data.deserts.map((rings) => makeShape(rings.map((r) => decodeRing(r, s)), true)),
    mountains: data.mountains.map((rings) => makeShape(rings.map((r) => decodeRing(r, s)), true)),
  };
}

function niceStep(value, steps) { return steps.find((step) => step >= value) ?? steps[steps.length - 1]; }

// ---- The map itself
function createMap(view, canvas, options) {
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas'), maskCtx = mask.getContext('2d', { willReadFrequently: true });
  const region = document.createElement('canvas'), regionCtx = region.getContext('2d', { willReadFrequently: true });
  const top = mercator(0, LAT_TOP).y, bottom = mercator(0, LAT_BOTTOM).y;
  const MARGIN = 8;
  let world, W = 0, H = 0, P = 2, scale = 0, cx = 0.54, cy = 0.33, image, pixels, roles, base, baseKey = '', type, dist, desert, dark = 0, dusk, blink = 0, visible = true, stale = false;
  let frame = 0, flight = 0, markers = [];
  const state = { get scale() { return scale; }, get minScale() { return minScale(); } };

  const minScale = () => Math.max(1, H / (bottom - top));
  function clampView() {
    scale = Math.max(minScale(), Math.min(MAX_SCALE, scale));
    cx -= Math.floor(cx);
    const half = H / 2 / scale;
    cy = bottom - top <= 2 * half ? (top + bottom) / 2 : Math.max(top + half, Math.min(bottom - half, cy));
  }
  function resize() {
    const { width, height } = view.getBoundingClientRect();
    P = width >= 1500 ? 3 : 2;
    const nextW = Math.max(1, Math.ceil(width / P)), nextH = Math.max(1, Math.ceil(height / P));
    if (nextW === W && nextH === H) return;
    const wasMin = !scale || scale <= minScale() + 1e-6;
    W = nextW; H = nextH;
    canvas.width = W; canvas.height = H;
    canvas.style.width = `${W * P}px`; canvas.style.height = `${H * P}px`;
    region.width = mask.width = W + MARGIN * 2; region.height = mask.height = H + MARGIN * 2;
    image = ctx.createImageData(W, H); pixels = new Uint32Array(image.data.buffer);
    roles = new Uint8Array(W * H); base = new Uint8Array(W * H); baseKey = '';
    type = new Uint8Array(mask.width * mask.height); dist = new Uint8Array(type.length); desert = new Uint8Array(type.length);
    if (wasMin) scale = minScale();
    clampView(); request();
  }

  // Off screen the map only remembers that it is out of date
  function request() {
    if (!visible) { stale = true; return; }
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); });
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && stale) { stale = false; request(); } }).observe(view);

  function rasterize(S, ox, oy) {
    const level = LOD.findIndex((tolerance) => tolerance * S <= 0.6);
    const riverRank = S < 1400 ? -1 : S < 3000 ? 2 : S < 8000 ? 4 : S < 20000 ? 6 : 99;
    const lakeRank = S < 1400 ? 0 : S < 4000 ? 3 : 99;
    draw(maskCtx, S, ox, oy, level, [
      ['land', 'fill', '#f00', () => true],
      ['lakes', 'fill', '#0f0', (shape) => shape.rank <= lakeRank],
      ['rivers', 'stroke', '#0c0', (shape) => shape.rank <= riverRank],
      ['borders', 'stroke', '#00f', () => S >= 700],
    ]);
    draw(regionCtx, S, ox, oy, Math.min(level, 2), [
      ['deserts', 'fill', '#f00', () => true],
      ['mountains', 'fill', '#0f0', () => true],
    ]);
  }
  // Paints layers as additive colour channels on black, one mask cell per map cell
  function draw(target, S, ox, oy, level, layers) {
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.globalCompositeOperation = 'source-over';
    target.fillStyle = '#000'; target.fillRect(0, 0, mask.width, mask.height);
    if (!world) return;
    target.globalCompositeOperation = 'lighter';
    const left = (ox - MARGIN) / S, right = (ox + W + MARGIN) / S, upper = (oy - MARGIN) / S, lower = (oy + H + MARGIN) / S;
    for (let k = Math.floor(left); k <= Math.floor(right); k++) {
      target.setTransform(S, 0, 0, S, k * S - ox + MARGIN, -oy + MARGIN);
      target.lineWidth = 1.25 / S;
      for (const [name, mode, colour, visible] of layers) {
        target.fillStyle = target.strokeStyle = colour;
        for (const shape of world[name] || []) {
          if (shape.maxX < left - k || shape.minX > right - k || shape.maxY < upper || shape.minY > lower || !visible(shape)) continue;
          if (mode === 'fill') target.fill(shape.path(level), 'evenodd'); else target.stroke(shape.path(level));
        }
      }
    }
  }

  function classify() {
    const MW = mask.width, MH = mask.height, data = maskCtx.getImageData(0, 0, MW, MH).data, regions = regionCtx.getImageData(0, 0, MW, MH).data;
    for (let i = 0, p = 0; i < type.length; i++, p += 4) {
      const water = data[p + 1] >= 110, land = data[p] >= 128 && !water;
      // bit 0 land, bit 1 inland water, bit 2 border, bit 3 mountains
      type[i] = (land ? 1 : 0) | (water ? 2 : 0) | (land && data[p + 2] >= 90 ? 4 : 0) | (land && regions[p + 1] >= 128 ? 8 : 0);
      desert[i] = land ? regions[p] : 0;
    }
    // Chebyshev distance from the open sea to anything else, capped, in two passes
    const CAP = 9;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (type[i] & 3) { dist[i] = 0; continue; }
      let d = CAP;
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) {
        d = Math.min(d, dist[i - MW] + 1);
        if (x > 0) d = Math.min(d, dist[i - MW - 1] + 1);
        if (x < MW - 1) d = Math.min(d, dist[i - MW + 1] + 1);
      }
      dist[i] = d;
    }
    for (let y = MH - 1; y >= 0; y--) for (let x = MW - 1; x >= 0; x--) {
      const i = y * MW + x;
      if (!dist[i]) continue;
      let d = dist[i];
      if (x < MW - 1) d = Math.min(d, dist[i + 1] + 1);
      if (y < MH - 1) {
        d = Math.min(d, dist[i + MW] + 1);
        if (x < MW - 1) d = Math.min(d, dist[i + MW + 1] + 1);
        if (x > 0) d = Math.min(d, dist[i + MW - 1] + 1);
      }
      dist[i] = d;
    }
  }

  function paint(S, ox, oy, colours) {
    const MW = mask.width, sInt = S;
    const degPerCell = 360 / S, step = niceStep(degPerCell * 70, [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30]);
    const meridian = new Uint8Array(W), parallel = new Uint8Array(H), rowLat = new Float32Array(H), colLon = new Float32Array(W);
    for (let i = 0; i < W; i++) {
      const lon = (ox + i) / S * 360 - 180;
      colLon[i] = lon;
      meridian[i] = Math.floor(lon / step) !== Math.floor((lon + degPerCell) / step) ? 1 : 0;
    }
    for (let j = 0; j < H; j++) {
      const a = unmercator(0, (oy + j) / S).lat, b = unmercator(0, (oy + j + 1) / S).lat;
      rowLat[j] = (a + b) / 2;
      parallel[j] = Math.floor(a / step) !== Math.floor(b / step) ? 1 : 0;
    }
    for (let j = 0; j < H; j++) {
      const gy = oy + j, lat = rowLat[j], polar = Math.abs(lat) > 50;
      for (let i = 0; i < W; i++) {
        const m = (j + MARGIN) * MW + i + MARGIN, t = type[m];
        const gx = ((ox + i) % sInt + sInt) % sInt, threshold = (BAYER[(gy & 3) * 4 + (gx & 3)] + 0.5) / 16;
        let colour;
        if (t & 2) colour = colours.water;
        else if (t & 1) {
          const coast = !(type[m - 1] & 3) || !(type[m + 1] & 3) || !(type[m - MW] & 3) || !(type[m + MW] & 3);
          // A ragged snowline: latitude nudged by smooth noise over longitude and latitude
          const cold = polar ? Math.abs(lat) + (valueNoise(colLon[i] / 9, lat / 5) - 0.5) * 12 : 0;
          if (t & 4 && (gx + gy) % 3 !== 2) colour = colours.border;
          else if (coast) colour = cold > 72 ? colours.snow : colours.sand;
          else if (cold > 72 + threshold * 4) colour = threshold < 0.12 ? colours.tundra : colours.snow;
          else if (cold > 63 + threshold * 4) colour = hash(gx, gy) < 0.15 ? colours.forest : colours.tundra;
          else if (desert[m] / 255 > threshold * 0.9 + 0.05) colour = hash(gx >> 1, gy) < 0.1 ? colours.desert2 : colours.desert;
          else {
            // Field patchwork in staggered blocks, with tree dots in the darker ones
            const row = gy >> 2, patch = hash((gx + (row & 1) * 3) / 6 | 0, row), fine = hash(gx, gy);
            colour = patch < 0.16 ? (fine < 0.5 ? colours.forest : colours.grass2) : patch < 0.42 ? colours.grass2 : colours.grass;
            if (fine > 0.985) colour = colours.forest;
          }
        } else {
          const d = dist[m];
          if (d <= 1) colour = colours.foam;
          else if (d === 2) colour = colours.shallow;
          else if (d === 3) colour = threshold < 0.5 ? colours.shallow : colours.sea;
          else if (d < 7) colour = colours.sea;
          else colour = (d - 6) / 3 > threshold ? colours.deep : colours.sea;
          if (d > 3 && (meridian[i] || parallel[j]) && ((gx + gy) & 1)) colour = colours.grid;
          else if (d > 4 && hash(gx >> 1, gy) < 0.004) colour = colours.wave;
        }
        roles[j * W + i] = colour;
      }
    }
    mountains(S, ox, oy, colours);
  }

  // Small peaks on a staggered grid wherever a mountain range covers the land. Ranges are
  // coarse label regions, so peaks thin out as the map zooms in and vanish up close.
  function mountains(S, ox, oy, colours) {
    if (S > 50000) return;
    const map = { s: colours.peak, l: colours.rock, d: colours.rockDark };
    const sx = Math.max(8, Math.round(S / 1200)), sy = Math.max(5, Math.round(sx * 0.62)), keep = S > 6000 ? 0.45 : 0.7;
    for (let ay = Math.floor((oy - 4) / sy) * sy; ay < oy + H + 4; ay += sy) {
      const stagger = Math.floor(ay / sy) & 1 ? sx >> 1 : 0;
      for (let ax = Math.floor((ox - 8) / sx) * sx + stagger; ax < ox + W + 8; ax += sx) {
        const x = ax + Math.floor(hash(ax, ay) * 3) - ox, y = ay - oy;
        if (x + 3 < -MARGIN || y + 3 < -MARGIN || x + 3 >= W + MARGIN || y + 3 >= H + MARGIN) continue;
        const m = (y + 3 + MARGIN) * mask.width + x + 3 + MARGIN;
        if ((type[m] & 9) !== 9 || hash(ax + 5, ay - 9) > keep) continue;
        sprite(PEAK, x, y, map);
      }
    }
  }

  const put = (x, y, colour) => { if (x >= 0 && y >= 0 && x < W && y < H) roles[y * W + x] = colour; };
  function sprite(rows, x, y, map) {
    rows.forEach((row, dy) => { for (let dx = 0; dx < row.length; dx++) { const c = map[row[dx]]; if (c !== undefined) put(x + dx, y + dy, c); } });
  }
  function text(label, x, y, fill, outline) {
    const bitmap = textBitmap(label);
    for (const [px, py] of bitmap.points) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) put(x + px + ox, y + py + oy, outline);
    for (const [px, py] of bitmap.points) put(x + px, y + py, fill);
  }

  function cityFootprint(x, y, radius, seedX, seedY, colours) {
    const r = Math.ceil(radius * 1.25);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const m = (py + MARGIN) * mask.width + px + MARGIN;
      if (!(type[m] & 1)) continue;
      const gx = seedX + dx, gy = seedY + dy, wobble = 0.75 + 0.5 * hash(gx >> 1, (gy >> 1) + 7);
      if (Math.hypot(dx, dy * 1.15) > radius * wobble) continue;
      const block = radius > 10 ? 4 : 3, street = ((gx % block) + block) % block === 0 || ((gy % block) + block) % block === 0;
      const h = hash(gx + 11, gy - 5), threshold = (BAYER[(gy & 3) * 4 + (gx & 3)] + 0.5) / 16;
      let colour = street ? colours.street : h < 0.45 ? colours.roofA : h < 0.75 ? colours.roofB : colours.roofC;
      if (!street && hash(gx - 3, gy + 17) < 0.45 && dark > threshold) colour = h < 0.2 ? colours.lit2 : colours.lit;
      roles[py * W + px] = colour;
    }
  }

  function render() {
    if (!W || !H) return;
    const S = Math.round(scale), ox = Math.round(cx * S - W / 2), oy = Math.round(cy * S - H / 2);
    const colours = ROLE, key = `${S},${ox},${oy},${W},${H},${!!world}`;
    // Land, sea and terrain only change with the view; a new hour just recolours them
    if (key !== baseKey) {
      rasterize(S, ox, oy);
      classify();
      paint(S, ox, oy, colours);
      base.set(roles); baseKey = key;
    } else roles.set(base);

    // Cities: one marker per visible copy of the world, grouped when close
    const kmPerCell = 40075 / S;
    const instances = [];
    for (const city of options.cities) {
      const p = mercator(city.longitude, city.latitude);
      for (let k = Math.floor((ox - 20) / S); k <= Math.floor((ox + W + 20) / S); k++) {
        const x = Math.round((p.x + k) * S - ox), y = Math.round(p.y * S - oy);
        if (x > -12 && x < W + 12 && y > -12 && y < H + 16) instances.push({ city, x, y, k, gx: Math.round(p.x * S), gy: Math.round(p.y * S) });
      }
    }
    const selected = options.selected();
    for (const point of instances) {
      const radius = 6.5 / (kmPerCell * Math.cos(point.city.latitude * Math.PI / 180));
      if (radius >= 2) cityFootprint(point.x, point.y, Math.min(radius, 42), point.gx, point.gy, colours);
      else if (dark > 0.25) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (hash(point.gx + dx, point.gy + dy) < dark) put(point.x + dx, point.y + dy, colours.lit);
    }
    const groups = clusterPoints(instances, 11), occupied = [];
    groups.sort((a, b) => b.some((p) => p.city === selected) - a.some((p) => p.city === selected));
    markers = groups.map((group) => {
      const x = Math.round(group.reduce((s, p) => s + p.x, 0) / group.length), y = Math.round(group.reduce((s, p) => s + p.y, 0) / group.length);
      const current = group.some((p) => p.city === selected);
      return { group, x, y, current, key: `${group[0].k}:${group.map((p) => p.city.id).sort().join(',')}` };
    });
    // The selected marker is labelled first but painted last, so it stays on top
    for (const marker of [...markers].reverse()) {
      const { group, x, y, current } = marker, fill = current ? colours.selected : colours.pin;
      if (current && blink) for (let a = 0; a < 24; a++) {
        const angle = a / 24 * Math.PI * 2; put(x + Math.round(Math.cos(angle) * 6), y + Math.round(Math.sin(angle) * 2.5), colours.selected);
      }
      if (group.length === 1) {
        sprite(PIN, x - 3, y - 8, { '#': colours.ink, o: fill, '*': dark > 0.4 ? colours.lit : colours.ink });
        occupied.push([x - 4, y - 9, x + 4, y + 1]);
      } else {
        const label = String(group.length), bitmap = textBitmap(label), w = bitmap.width + 6, left = x - (w >> 1), topY = y - 11;
        for (let dy = 0; dy < 9; dy++) for (let dx = 0; dx < w; dx++) {
          const edge = dy === 0 || dy === 8 || dx === 0 || dx === w - 1;
          if ((dy === 0 || dy === 8) && (dx === 0 || dx === w - 1)) continue;
          put(left + dx, topY + dy, edge ? colours.ink : fill);
        }
        sprite(['#o#', '.#.'], x - 1, topY + 8, { '#': colours.ink, o: fill });
        for (const [px, py] of bitmap.points) put(left + 3 + px, topY + 2 + py, colours.ink);
        occupied.push([left - 1, topY - 1, left + w, topY + 11]);
      }
    }
    // Names beside single markers, placed where they do not collide
    const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
    for (const marker of markers) {
      if (marker.group.length !== 1) continue;
      const name = marker.group[0].city.name, bitmap = textBitmap(name), w = bitmap.width;
      const { x, y } = marker;
      for (const [lx, ly] of [[x + 6, y - 7], [x - 6 - w, y - 7], [x - (w >> 1), y - 16], [x - (w >> 1), y + 4]]) {
        const box = [lx - 1, ly + bitmap.top - 1, lx + w, ly + bitmap.bottom + 1];
        if (box[0] < 1 || box[2] > W - 2 || box[1] < 1 || box[3] > H - 2 || occupied.some((o) => overlaps(o, box))) continue;
        text(name, lx, ly, marker.current ? colours.selected : colours.text, colours.ink);
        occupied.push(box);
        break;
      }
    }
    const lut = paletteAt(dark, dusk);
    for (let i = 0; i < roles.length; i++) pixels[i] = lut[roles[i]];
    ctx.putImageData(image, 0, 0);
    options.onRender({ S, ox, oy, W, H, P, markers, kmPerCell, center: unmercator(cx, cy) });
  }

  function setView(x, y, s) { cx = x; cy = y; scale = s; clampView(); request(); }
  function stop() { cancelAnimationFrame(flight); flight = 0; }
  function flyTo(x, y, s, reduced) {
    stop();
    s = Math.max(minScale(), Math.min(MAX_SCALE, s));
    const tx = cx + wrapDelta(cx, x);
    if (reduced) { setView(x, y, s); return; }
    const path = zoomPath([cx, cy, W / scale], [tx, y, W / s]);
    const duration = Math.max(350, Math.min(1800, Math.abs(path.length) * 420)), began = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - began) / duration), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const [vx, vy, vw] = path.at(e); cx = vx; cy = vy; scale = W / vw; clampView(); render();
      flight = t < 1 ? requestAnimationFrame(step) : 0;
    };
    flight = requestAnimationFrame(step);
  }
  function zoomAt(factor, px = W / 2, py = H / 2) {
    stop();
    const wx = cx + (px - W / 2) / scale, wy = cy + (py - H / 2) / scale;
    scale = Math.max(minScale(), Math.min(MAX_SCALE, scale * factor));
    cx = wx - (px - W / 2) / scale; cy = wy - (py - H / 2) / scale;
    clampView(); request();
  }
  function panBy(dx, dy) { stop(); cx -= dx / scale; cy -= dy / scale; clampView(); request(); }

  return {
    state, resize, request, render, flyTo, zoomAt, panBy, stop, setView,
    load(data) { world = loadWorld(data); request(); },
    setDark(value, duskHex) { if (value !== dark || duskHex !== dusk) { dark = value; dusk = duskHex; request(); } },
    setBlink(value) { if (value !== blink) { blink = value; request(); } },
    get size() { return { W, H, P }; },
    get view() { return { cx, cy, scale }; },
    worldScale: minScale,
  };
}

async function start() {
  const $ = (id) => document.getElementById(id), canvas = $('map'), menu = $('cluster-menu'), mapView = $('map-view');
  for (const heading of document.querySelectorAll('.pixel-text')) pixelHeading(heading);
  const response = await fetch('cities.json'); if (!response.ok) throw new Error('City catalogue could not load');
  const cities = await response.json(), ids = new Set();
  for (const city of cities) {
    if (!/^[a-z]+$/.test(city.id) || ids.has(city.id) || !Number.isFinite(city.latitude) || Math.abs(city.latitude) > 90 || !Number.isFinite(city.longitude) || Math.abs(city.longitude) > 180 || !customElements.get(`${city.id}-switch`)) throw new Error('Invalid city catalogue');
    ids.add(city.id);
  }
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let selected;
  const panes = new Map(), buttons = new Map(), pins = new Map();

  const map = createMap(mapView, canvas, { cities, selected: () => selected, onRender: placePins });

  function read(entry) {
    $('switch-stage').style.setProperty('--dark', entry.dark.toFixed(3));
    map.setDark(entry.dark, selected?.dusk);
  }
  // Scale that shows a city apart from its nearest neighbour, at least regional
  function cityScale(city) {
    const { W } = map.size, p = mercator(city.longitude, city.latitude);
    let nearest = Infinity;
    for (const other of cities) if (other !== city) {
      const q = mercator(other.longitude, other.latitude);
      nearest = Math.min(nearest, Math.hypot(wrapDelta(p.x, q.x), q.y - p.y));
    }
    const regional = 40075 * Math.cos(city.latitude * Math.PI / 180) * W / 700;
    return Math.max(regional, 30 / nearest);
  }
  function showCity(city, instant = reduced()) {
    const p = mercator(city.longitude, city.latitude);
    map.flyTo(p.x, p.y, cityScale(city), instant);
  }
  function select(id, { updateHash = true, fly = true } = {}) {
    const city = cities.find((c) => c.id === id); if (!city) return;
    selected = city; menu.hidden = true;
    for (const [key, entry] of panes) entry.pane.hidden = key !== id;
    let entry = panes.get(id);
    if (!entry) {
      const pane = document.createElement('div'); pane.className = 'switch-pane';
      const element = document.createElement(`${id}-switch`); element.className = 'switch';
      entry = { pane, element, hour: 12, dark: 0 }; panes.set(id, entry);
      element.addEventListener('scrub', (event) => { Object.assign(entry, event.detail); if (selected.id === id) read(entry); });
      element.addEventListener('change', (event) => { try { localStorage.setItem(`city-switch:${id}`, event.detail.night ? 'night' : 'day'); } catch {} });
      pane.append(element); $('switches').append(pane);
      let night = matchMedia('(prefers-color-scheme: dark)').matches;
      try { const saved = localStorage.getItem(`city-switch:${id}`); if (saved) night = saved === 'night'; } catch {}
      element.jump(night);
    }
    entry.pane.hidden = false; read(entry);
    $('readout').setAttribute('city', city.name); $('readout').switch = entry.element;
    for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === id));
    const heading = $('city-name'); heading.dataset.text = city.name; pixelHeading(heading);
    $('country').textContent = city.country; $('description').textContent = city.description;
    for (const [prop, value] of [['paper', city.paper], ['night', city.night], ['dusk-colour', city.dusk]]) $('switch-stage').style.setProperty(`--${prop}`, value);
    const base = `https://preacherxp.github.io/${id}-switch/`;
    $('demo-link').href = base; $('mp4-link').href = `${base}${id}-day-night-60fps.mp4`; $('repo-link').href = `https://github.com/preacherxp/${id}-switch`;
    $('show-city').textContent = city.name; $('show-city').setAttribute('aria-label', `Zoom to ${city.name}`);
    $('selection-status').textContent = `${city.name} switch selected`;
    if (updateHash) history.replaceState(null, '', `#${id}`);
    if (fly) showCity(city);
    map.request();
  }

  // Groups: zoom until the cities come apart; at the deepest zoom offer a menu instead
  function openGroup(marker) {
    const { S, W, H } = lastFrame, group = marker.group;
    const pts = group.map((p) => mercator(p.city.longitude, p.city.latitude));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, nearest = Infinity;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) nearest = Math.min(nearest, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) || Infinity);
    const fit = Math.min((W - 90) / Math.max(maxX - minX, 1e-9), (H - 60) / Math.max(maxY - minY, 1e-9));
    const target = Math.min(MAX_SCALE, Math.max(S * 1.6, Math.min(fit, 32 / nearest)));
    if (S >= MAX_SCALE * 0.98) { showMenu(marker); return; }
    map.flyTo((minX + maxX) / 2, (minY + maxY) / 2, target, reduced());
  }
  function showMenu(marker) {
    const { P } = lastFrame;
    menu.replaceChildren();
    for (const point of marker.group) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = point.city.name;
      button.onclick = () => { select(point.city.id); buttons.get(point.city.id).focus(); };
      menu.append(button);
    }
    menu.hidden = false;
    menu.style.left = `${Math.max(12, Math.min(mapView.clientWidth - 212, marker.x * P + 18))}px`;
    menu.style.top = `${Math.max(12, Math.min(mapView.clientHeight - menu.offsetHeight - 12, marker.y * P + 18))}px`;
    menu.firstElementChild.focus();
  }

  let lastFrame = { S: 1, W: 1, H: 1, P: 2, markers: [] };
  function placePins(frame) {
    lastFrame = frame;
    const { P, markers, kmPerCell, center } = frame, seen = new Set();
    for (const marker of markers) {
      seen.add(marker.key);
      let pin = pins.get(marker.key);
      if (!pin) {
        pin = document.createElement('button'); pin.type = 'button'; pins.set(marker.key, pin); $('pins').append(pin);
        const names = marker.group.map((p) => p.city.name).join(', ');
        pin.className = `pin${marker.group.length > 1 ? ' cluster' : ''}`;
        pin.dataset.cities = marker.group.map((p) => p.city.id).join(' ');
        pin.setAttribute('aria-label', marker.group.length === 1 ? `Select ${names}` : `Zoom in to ${marker.group.length} cities: ${names}`);
        pin.title = names;
      }
      pin.onclick = () => marker.group.length === 1 ? select(marker.group[0].city.id) : openGroup(marker);
      pin.classList.toggle('current', marker.current);
      pin.style.transform = `translate(${marker.x * P}px, ${(marker.y - 4) * P}px) translate(-50%, -50%)`;
    }
    for (const [key, pin] of pins) if (!seen.has(key)) { pin.remove(); pins.delete(key); }
    canvas.dataset.scale = String(frame.S);
    canvas.dataset.lon = center.lon.toFixed(4); canvas.dataset.lat = center.lat.toFixed(4);
    const zoom = frame.S / map.worldScale();
    $('zoom-level').textContent = `×${zoom < 10 ? zoom.toFixed(1).replace(/\.0$/, '') : Math.round(zoom)}`;
    const ns = center.lat >= 0 ? 'N' : 'S', ew = center.lon >= 0 ? 'E' : 'W';
    $('map-coords').textContent = `${Math.abs(center.lat).toFixed(2)}°${ns} ${Math.abs(center.lon).toFixed(2)}°${ew}`;
    const kmCell = kmPerCell * Math.cos(center.lat * Math.PI / 180);
    const km = niceStep(kmCell * 40, [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]);
    $('scale-bar').style.width = `${Math.round(km / kmCell) * P}px`;
    $('scale-label').textContent = km >= 1 ? `${km} km` : `${km * 1000} m`;
    $('zoom-in').disabled = frame.S >= MAX_SCALE; $('zoom-out').disabled = frame.S <= map.worldScale() + 0.5;
  }

  for (const city of cities) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'city-button'; button.dataset.city = city.id;
    const name = document.createElement('span'), country = document.createElement('small'); name.textContent = city.name; country.textContent = city.country; button.append(name, country);
    button.onclick = () => select(city.id); buttons.set(city.id, button); $('city-list').append(button);
  }

  map.resize();
  const linked = ids.has(location.hash.slice(1));
  select(linked ? location.hash.slice(1) : 'zabrze', { updateHash: linked, fly: false });
  if (linked) showCity(selected, true);
  addEventListener('hashchange', () => select(location.hash.slice(1), { updateHash: false }));
  new ResizeObserver(() => { menu.hidden = true; map.resize(); }).observe(mapView);

  // Blink the selected marker slowly; nothing moves under reduced motion
  setInterval(() => { if (!document.hidden) map.setBlink(reduced() ? 0 : (Math.floor(performance.now() / 700) & 1)); }, 350);

  // Pointer: drag to pan, two fingers to pinch, wheel or double click to zoom
  const pointers = new Map();
  let pinch = null;
  const local = (event) => { const r = canvas.getBoundingClientRect(), { P } = map.size; return [(event.clientX - r.left) / P, (event.clientY - r.top) / P]; };
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    map.stop(); menu.hidden = true; canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, local(event)); pinch = null;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    const next = local(event), previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, next);
    if (pointers.size === 1) { map.panBy(next[0] - previous[0], next[1] - previous[1]); return; }
    const [a, b] = [...pointers.values()], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], span = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) { map.panBy(mid[0] - pinch.mid[0], mid[1] - pinch.mid[1]); if (pinch.span > 0) map.zoomAt(span / pinch.span, mid[0], mid[1]); }
    pinch = { mid, span };
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, (event) => { pointers.delete(event.pointerId); pinch = null; });
  mapView.addEventListener('wheel', (event) => {
    if (event.target.closest('.hud, .cluster-menu')) return;
    event.preventDefault(); menu.hidden = true;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    const [x, y] = local(event);
    map.zoomAt(Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.0022)), x, y);
  }, { passive: false });
  canvas.addEventListener('dblclick', (event) => { const [x, y] = local(event); map.zoomAt(event.shiftKey ? 0.5 : 2, x, y); });
  canvas.addEventListener('keydown', (event) => {
    const { W, H } = map.size, pan = { ArrowLeft: [0.2, 0], ArrowRight: [-0.2, 0], ArrowUp: [0, 0.2], ArrowDown: [0, -0.2] }[event.key];
    if (pan) map.panBy(pan[0] * W, pan[1] * H);
    else if (event.key === '+' || event.key === '=') map.zoomAt(1.6);
    else if (event.key === '-' || event.key === '_') map.zoomAt(1 / 1.6);
    else if (event.key === '0') showWorld();
    else if (event.key === 'Home') showCity(selected);
    else return;
    event.preventDefault(); menu.hidden = true;
  });
  const showWorld = () => { const p = mercator(selected.longitude, 20); map.flyTo(p.x, (mercator(0, LAT_TOP).y + mercator(0, LAT_BOTTOM).y) / 2, map.worldScale(), reduced()); };
  $('zoom-in').onclick = () => map.zoomAt(1.6); $('zoom-out').onclick = () => map.zoomAt(1 / 1.6);
  $('show-world').onclick = showWorld; $('show-city').onclick = () => showCity(selected);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !menu.hidden) { menu.hidden = true; canvas.focus(); } });
  document.addEventListener('pointerdown', (event) => { if (!menu.contains(event.target) && !event.target.closest('.pin')) menu.hidden = true; });

  try {
    const mapResponse = await fetch('data/world.json'); if (!mapResponse.ok) throw new Error('Map data unavailable');
    map.load(await mapResponse.json()); map.render(); canvas.dataset.ready = 'true';
    $('globe-status').textContent = `${cities.length} cities · pixel map from Natural Earth`;
  } catch (error) { $('globe-status').textContent = 'The map could not load. Choose any city below.'; $('globe-status').classList.add('problem'); console.warn(error.message); }
}
if (typeof document !== 'undefined') start().catch((error) => { const status = document.getElementById('globe-status'); status.textContent = `${error.message}. Open the Gallery using the link above.`; status.classList.add('problem'); console.error(error); });
