import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export function sized(base, w, h) {
  const t = base.clone();
  t.needsUpdate = true;
  t.repeat.set(Math.max(0.15, w / 3.2), Math.max(0.15, h / 3.2));
  return t;
}

function wrap(t) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// name -> dossier assets/textures/<dir> (sets PBR ambientCG CC0 : color/normal/rma)
const SETS = {
  sand: 'sand_rippled',
  plaster: 'plaster_old',
  plasterDark: 'plaster_002',
  concrete: 'concrete_033',
  wood: 'planks_024a',
  metal: 'corrugated_steel_001',
  containerRed: 'corrugated_yellow',
  containerBlue: 'corrugated_blue_rusty',
  containerGreen: 'corrugated_green',
  barrel: 'steel_rusty',
  door: 'metal_hazard_stripes',
};

const FALLBACK_COLORS = {
  sand: '#c9b183', plaster: '#b8a888', plasterDark: '#8a7c66', concrete: '#9a978c',
  wood: '#7a5c36', metal: '#6a7076', containerRed: '#a0522d', containerBlue: '#33506b',
  containerGreen: '#4a5a3a', barrel: '#5a6b4a', door: '#6e6a5e',
};

function flatTex(hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return wrap(t);
}

export function fallbackTextures() {
  const out = {};
  for (const k of Object.keys(FALLBACK_COLORS)) {
    out[k] = { map: flatTex(FALLBACK_COLORS[k]), normal: flatTex('#8080ff'), rough: flatTex('#bbbbbb'), metal: flatTex('#000000') };
  }
  return out;
}

// rma.jpg = R:roughness, G:metalness, B:AO  ->  three veut roughness en G, metalness en B
function repackChannel(srcTex, channel) {
  const img = srcTex.image;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = channel === 'r' ? d[i] : d[i + 1];
    d[i] = 0;
    d[i + 1] = channel === 'r' ? v : 0;
    d[i + 2] = channel === 'g' ? v : 0;
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return wrap(new THREE.CanvasTexture(c));
}

async function loadSet(dir) {
  const base = `assets/textures/${dir}/`;
  const [color, normal, rma] = await Promise.all([
    loader.loadAsync(base + 'color.jpg'),
    loader.loadAsync(base + 'normal.jpg'),
    loader.loadAsync(base + 'rma.jpg'),
  ]);
  color.colorSpace = THREE.SRGBColorSpace;
  for (const t of [color, normal, rma]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map: color, normal, rough: repackChannel(rma, 'r'), metal: repackChannel(rma, 'g') };
}

export async function loadTextures(onProgress) {
  const keys = Object.keys(SETS);
  const out = {};
  let done = 0;
  await Promise.all(keys.map(async (key) => {
    try {
      out[key] = await loadSet(SETS[key]);
    } catch (e) {
      console.warn('fallback texture for', key, e);
      out[key] = fallbackTextures()[key];
    }
    done++;
    if (onProgress) onProgress(done, keys.length);
  }));
  out.flash = makeFlash();
  return out;
}

function makeFlash() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,230,1)');
  g.addColorStop(0.25, 'rgba(255,210,110,0.95)');
  g.addColorStop(0.6, 'rgba(255,130,30,0.55)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
  const sg = ctx.createRadialGradient(16, 400, 4, 16, 400, 130);
  sg.addColorStop(0, 'rgba(255,244,214,0.95)');
  sg.addColorStop(0.25, 'rgba(255,226,160,0.5)');
  sg.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, 32, 512);
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
