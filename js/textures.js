import * as THREE from 'three';

const SZ = 1024;

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function wrap(t) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function sized(base, w, h) {
  const t = base.clone();
  t.needsUpdate = true;
  t.repeat.set(Math.max(0.15, w / 3.2), Math.max(0.15, h / 3.2));
  return t;
}

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// wrapped random grid
function randGrid(cells) {
  const g = new Float32Array((cells + 1) * (cells + 1));
  for (let i = 0; i < g.length; i++) g[i] = Math.random();
  return g;
}

function sampleGrid(grid, cells, x, y) {
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  const x0 = Math.floor(x) % cells, x1 = (x0 + 1) % cells;
  const y0 = Math.floor(y) % cells, y1 = (y0 + 1) % cells;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const i00 = grid[y0 * (cells + 1) + x0], i10 = grid[y0 * (cells + 1) + x1];
  const i01 = grid[y1 * (cells + 1) + x0], i11 = grid[y1 * (cells + 1) + x1];
  return (i00 * (1 - sx) + i10 * sx) * (1 - sy) + (i01 * (1 - sx) + i11 * sx) * sy;
}

// domain-warped fBm heightmap, 0..1
function fbm(size, octaves = 5, warpPx = 48) {
  const w1 = new Float32Array(size * size);
  const w2 = new Float32Array(size * size);
  {
    const g1 = randGrid(8), g2 = randGrid(8);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        w1[i] = sampleGrid(g1, 8, x / (size / 8), y / (size / 8));
        w2[i] = sampleGrid(g2, 8, x / (size / 8), y / (size / 8));
      }
    }
  }
  const H = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = 3 << o;
    const grid = randGrid(cells);
    const cell = size / cells;
    const w = warpPx * (1 << (octaves - o)) / cells * 8; // warp scales with octave
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const sx = (x + (w1[i] - 0.5) * w) / cell;
        const sy = (y + (w2[i] - 0.5) * w) / cell;
        H[i] += sampleGrid(grid, cells, sx, sy) * amp;
      }
    }
    tot += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < H.length; i++) H[i] /= tot;
  return H;
}

// Build {map, normal, rough} from heightmap + colorFn + optional 2D overlay
function surface(H, colorFn, postDraw) {
  const size = SZ;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const col = colorFn(H[i], x, y, i);
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (postDraw) postDraw(ctx, size);

  const map = wrap(new THREE.CanvasTexture(c));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const nc = canvas(size);
  const nctx = nc.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  const nd = nimg.data;
  const str = 4.0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = H[y * size + (x - 1 + size) % size];
      const xr = H[y * size + (x + 1) % size];
      const yt = H[((y - 1 + size) % size) * size + x];
      const yb = H[((y + 1) % size) * size + x];
      let nx = (xl - xr) * str, ny = (yt - yb) * str, nz = 1;
      const il = 1 / Math.hypot(nx, ny, nz);
      const o = (y * size + x) * 4;
      nd[o] = (nx * il * 0.5 + 0.5) * 255;
      nd[o + 1] = (ny * il * 0.5 + 0.5) * 255;
      nd[o + 2] = (nz * il * 0.5 + 0.5) * 255;
      nd[o + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const normal = wrap(new THREE.CanvasTexture(nc));

  const rc = canvas(size);
  const rctx = rc.getContext('2d');
  const rimg = rctx.createImageData(size, size);
  const rd = rimg.data;
  for (let i = 0; i < size * size; i++) {
    const v = 105 + (1 - H[i]) * 135;
    rd[i * 4] = v; rd[i * 4 + 1] = v; rd[i * 4 + 2] = v; rd[i * 4 + 3] = 255;
  }
  rctx.putImageData(rimg, 0, 0);
  const rough = wrap(new THREE.CanvasTexture(rc));

  return { map, normal, rough };
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp255 = c => [Math.max(0, Math.min(255, c[0])), Math.max(0, Math.min(255, c[1])), Math.max(0, Math.min(255, c[2]))];

function sandTex() {
  const H = fbm(SZ, 6, 60);
  const ripple = fbm(SZ, 3, 20);
  // wind ripples
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      const i = y * SZ + x;
      H[i] = H[i] * 0.72 + 0.18 + 0.10 * Math.sin((x * 0.55 + y * 0.83) * 0.045 + ripple[i] * 5.0);
      H[i] = Math.max(0, Math.min(1, H[i]));
    }
  }
  const pebbles = new Set();
  for (let i = 0; i < 900; i++) pebbles.add(((Math.random() * SZ) | 0) * SZ + ((Math.random() * SZ) | 0));
  for (const p of pebbles) H[p] = Math.min(1, H[p] + 0.45);
  const colorFn = (h, x, y, i) => {
    let col = mix([214, 190, 148], [164, 140, 100], h);
    col = mix(col, [150, 128, 92], hash(x >> 3, y >> 3) * 0.25);
    if (pebbles.has(i)) {
      const p = hash(x, y);
      col = [122 + p * 52, 114 + p * 46, 100 + p * 40];
    }
    return clamp255(col);
  };
  return surface(H, colorFn);
}

function plasterTex(base, dark) {
  const n = fbm(SZ, 6, 50);
  const cracks = new Set();
  for (let c = 0; c < 40; c++) {
    let x = (Math.random() * SZ) | 0, y = (Math.random() * SZ) | 0;
    let a = Math.random() * Math.PI * 2;
    const len = 30 + ((Math.random() * 80) | 0);
    for (let s = 0; s < len; s++) {
      cracks.add(y * SZ + x);
      if (Math.random() < 0.12) cracks.add(y * SZ + ((x + 1) % SZ));
      x = (x + Math.round(Math.cos(a) * 2) + SZ) % SZ;
      y = (y + Math.round(Math.sin(a) * 2) + SZ) % SZ;
      a += (Math.random() - 0.5) * 0.8;
    }
  }
  const stains = [];
  for (let s = 0; s < 16; s++) stains.push({ x: Math.random() * SZ, y: Math.random() * SZ, r: 40 + Math.random() * 140 });
  const H = new Float32Array(SZ * SZ);
  for (let i = 0; i < H.length; i++) {
    H[i] = Math.pow(n[i], 1.35);
    if (cracks.has(i)) H[i] *= 0.3;
  }
  const colorFn = (h, x, y, i) => {
    let col = mix(dark, base, h);
    if (cracks.has(i)) col = mix(col, [70, 58, 44], 0.8);
    for (const st of stains) {
      const d = Math.hypot(x - st.x, y - st.y);
      if (d < st.r) col = mix(col, [104, 88, 66], (1 - d / st.r) * 0.4);
    }
    col = col.map(v => v * (0.94 + hash(x, y) * 0.12));
    return clamp255(col);
  };
  return surface(H, colorFn);
}

function concreteTex() {
  const n = fbm(SZ, 5, 40);
  const B = 4, cell = SZ / B;
  const chips = new Set();
  for (let i = 0; i < 700; i++) chips.add(((Math.random() * SZ) | 0) * SZ + ((Math.random() * SZ) | 0));
  const H = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      const fx = (x % cell) / cell, fy = (y % cell) / cell;
      const mortar = fx < 0.035 || fy < 0.035;
      H[y * SZ + x] = mortar ? 0.1 : n[y * SZ + x];
    }
  }
  const colorFn = (h, x, y, i) => {
    const bx = (x / cell) | 0, by = (y / cell) | 0;
    const v = hash(bx * 7 + 1, by * 13 + 5);
    const fx = (x % cell) / cell, fy = (y % cell) / cell;
    let col = mix([126, 123, 114], [172 + v * 30, 169 + v * 30, 158 + v * 28], h);
    if (fx < 0.035 || fy < 0.035) col = [88, 85, 78];
    if (chips.has(i)) col = mix(col, [66, 64, 58], 0.65);
    if (hash(x, y) > 0.997) col = mix(col, [150, 96, 56], 0.5);
    return clamp255(col);
  };
  return surface(H, colorFn);
}

function metalTex() {
  const n = fbm(SZ, 5, 30);
  const ribs = 26;
  const rustAmt = new Float32Array(SZ);
  const rustY = new Float32Array(SZ);
  for (let x = 0; x < SZ; x++) {
    rustAmt[x] = Math.random();
    rustY[x] = Math.random() * SZ * 0.4;
  }
  const H = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      const p = ((x / SZ) * ribs) % 1;
      const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
      H[y * SZ + x] = tri * 0.7 + n[y * SZ + x] * 0.3;
    }
  }
  const colorFn = (h, x, y) => {
    const p = ((x / SZ) * ribs) % 1;
    const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
    let col = mix([70, 74, 80], [164, 170, 176], tri);
    col = mix(col, [126, 130, 134], h * 0.3);
    if (rustAmt[x] > 0.5 && y > rustY[x]) {
      const k = Math.min(1, (y - rustY[x]) / 120) * (rustAmt[x] - 0.5) * 2.6 * (hash(x, y >> 3) > 0.4 ? 1 : 0);
      col = mix(col, [152, 94, 52], Math.min(1, k));
    }
    if (hash(x, y) > 0.9985) col = mix(col, [216, 220, 224], 0.7);
    return clamp255(col);
  };
  const postDraw = (ctx, size) => {
    ctx.strokeStyle = 'rgba(28,30,34,0.6)';
    ctx.lineWidth = 4;
    for (const yy of [size / 4, size / 2, (3 * size) / 4]) {
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(size, yy); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(18,20,22,0.85)';
    for (const yy of [size / 4, size / 2, (3 * size) / 4]) {
      for (let x = 10; x < size; x += 36) ctx.fillRect(x, yy - 6, 5, 5);
    }
  };
  return surface(H, colorFn, postDraw);
}

function woodTex() {
  const n = fbm(SZ, 5, 26);
  const planks = 6, pw = SZ / planks;
  const knots = [];
  for (let k = 0; k < 9; k++) knots.push({ x: Math.random() * SZ, y: Math.random() * SZ, r: 6 + Math.random() * 9 });
  const H = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      const fx = (x % pw) / pw;
      const seam = fx < 0.06 ? 0.12 : 1;
      const grain = 0.12 * Math.sin(x * 0.22 + n[y * SZ + x] * 10 + y * 0.015);
      H[y * SZ + x] = n[y * SZ + x] * 0.42 * seam + grain + (seam < 1 ? -0.22 : 0);
    }
  }
  const colorFn = (h, x, y) => {
    const px = (x / pw) | 0;
    let col = [116 + hash(px, 7) * 40, 86 + hash(px, 13) * 30, 54 + hash(px, 29) * 20];
    const gg = hash(x, y >> 2);
    col = col.map(v => v * (0.78 + 0.42 * gg));
    col = mix([66, 46, 28], col, Math.max(0, Math.min(1, h * 1.5)));
    const fx = (x % pw) / pw;
    if (fx < 0.06) col = col.map(v => v * 0.5);
    for (const k of knots) {
      const d = Math.hypot(x - k.x, y - k.y);
      if (d < k.r) col = mix(col, [52, 36, 22], (1 - d / k.r) * 0.9);
    }
    return clamp255(col);
  };
  const postDraw = (ctx, size) => {
    ctx.fillStyle = 'rgba(22,16,9,0.9)';
    for (let p = 0; p < planks; p++) {
      const x = p * pw + 7;
      ctx.beginPath(); ctx.arc(x, 14, 3.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x, size - 14, 3.5, 0, 7); ctx.fill();
    }
  };
  return surface(H, colorFn, postDraw);
}

function barrelTex() {
  const n = fbm(SZ, 5, 30);
  const ribsY = [0.2, 0.5, 0.8];
  const H = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      let h = 0.45 + n[y * SZ + x] * 0.3;
      for (const ry of ribsY) {
        const d = Math.abs(y / SZ - ry) * SZ;
        if (d < 11) h = 0.85 + (1 - d / 11) * 0.15;
      }
      H[y * SZ + x] = h;
    }
  }
  const rust = new Set();
  for (let i = 0; i < 2200; i++) rust.add(((Math.random() * SZ) | 0) * SZ + ((Math.random() * SZ) | 0));
  const colorFn = (h, x, y, i) => {
    let col = mix([62, 74, 48], [108, 122, 80], h);
    if (rust.has(i)) col = mix(col, [146, 90, 50], 0.8);
    if (hash(x, y) > 0.9975) col = mix(col, [28, 28, 26], 0.7);
    return clamp255(col);
  };
  return surface(H, colorFn);
}

function containerTex(tint) {
  const n = fbm(SZ, 4, 30);
  const ribs = 22;
  const H = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      const p = ((x / SZ) * ribs) % 1;
      const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
      let h = tri * 0.68 + n[y * SZ + x] * 0.32;
      if (x < 16 || x > SZ - 16) h = 1;
      H[y * SZ + x] = h;
    }
  }
  const rustAmt = new Float32Array(SZ);
  for (let x = 0; x < SZ; x++) rustAmt[x] = Math.random();
  const colorFn = (h, x, y) => {
    const p = ((x / SZ) * ribs) % 1;
    const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
    let col = mix([50, 54, 58], [122, 128, 132], tri);
    col = col.map((v, i) => v * (0.5 + tint[i] * 0.85));
    if (rustAmt[x] > 0.45 && hash(x, y >> 4) > 0.5) {
      col = mix(col, [154, 96, 54], (rustAmt[x] - 0.45) * 2.2 * (y / SZ));
    }
    if (x < 16 || x > SZ - 16) col = col.map(v => v * 0.42);
    return clamp255(col);
  };
  const postDraw = (ctx, size) => {
    ctx.fillStyle = 'rgba(238,238,232,0.65)';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('MSKU 482 913 7', 90, 140);
    ctx.font = 'bold 28px monospace';
    ctx.fillText('MAX GROSS 30480 KG', 90, size - 70);
    ctx.strokeStyle = 'rgba(20,20,20,0.7)';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, size - 32, size - 32);
  };
  return surface(H, colorFn, postDraw);
}

function doorTex() {
  const n = fbm(SZ, 4, 24);
  const H = new Float32Array(SZ * SZ);
  for (let y = 0; y < SZ; y++) {
    for (let x = 0; x < SZ; x++) {
      let h = 0.5 + n[y * SZ + x] * 0.25;
      const fx = x / SZ, fy = y / SZ;
      const inPanel1 = fx > 0.12 && fx < 0.88 && fy > 0.1 && fy < 0.45;
      const inPanel2 = fx > 0.12 && fx < 0.88 && fy > 0.55 && fy < 0.9;
      if (inPanel1 || inPanel2) h = 0.22;
      if (fy > 0.88) h = 0.92;
      H[y * SZ + x] = h;
    }
  }
  const colorFn = (h, x, y) => {
    const fy = y / SZ;
    let col = mix([84, 82, 74], [132, 130, 120], h);
    if (fy > 0.88) col = [50, 50, 48];
    if (hash(x, y) > 0.995) col = mix(col, [142, 92, 56], 0.6);
    if (hash(x, y) > 0.9985) col = mix(col, [38, 38, 36], 0.8);
    return clamp255(col);
  };
  return surface(H, colorFn);
}

export function makeTextures() {
  const flashCanvas = canvas(128);
  const fctx = flashCanvas.getContext('2d');
  const g = fctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,230,1)');
  g.addColorStop(0.25, 'rgba(255,210,110,0.95)');
  g.addColorStop(0.6, 'rgba(255,130,30,0.55)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  fctx.fillStyle = g;
  fctx.fillRect(0, 0, 128, 128);
  const flash = new THREE.CanvasTexture(flashCanvas);
  flash.colorSpace = THREE.SRGBColorSpace;

  return {
    sand: sandTex(),
    plaster: plasterTex([188, 172, 140], [102, 88, 66]),
    plasterDark: plasterTex([132, 120, 102], [72, 62, 48]),
    concrete: concreteTex(),
    wood: woodTex(),
    metal: metalTex(),
    barrel: barrelTex(),
    door: doorTex(),
    containerRed: containerTex([0.85, 0.28, 0.16]),
    containerBlue: containerTex([0.22, 0.42, 0.62]),
    containerGreen: containerTex([0.3, 0.48, 0.26]),
    flash,
  };
}

export function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#4f83bd');
  g.addColorStop(0.4, '#7fa9d2');
  g.addColorStop(0.68, '#c3cfd2');
  g.addColorStop(0.84, '#eedcae');
  g.addColorStop(1, '#e9cf9c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 512);
  // sun glow near horizon
  const sg = ctx.createRadialGradient(16, 400, 4, 16, 400, 130);
  sg.addColorStop(0, 'rgba(255,244,214,0.95)');
  sg.addColorStop(0.25, 'rgba(255,226,160,0.5)');
  sg.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, 32, 512);
  // soft clouds
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 12; i++) {
    const y = 60 + Math.random() * 260;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 32, y, 10 + Math.random() * 14, 3 + Math.random() * 4, 0, 0, 7);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
