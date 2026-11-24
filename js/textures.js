import * as THREE from 'three';

function makeCanvas(size, fn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  fn(ctx, size);
  return c;
}

function toTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function sized(baseTex, w, h) {
  const t = baseTex.clone();
  t.needsUpdate = true;
  t.repeat.set(Math.max(0.15, w / 3.2), Math.max(0.15, h / 3.2));
  return t;
}

function speckle(ctx, s, n, alpha, colors) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.6);
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    const px = Math.random() * s, py = Math.random() * s;
    ctx.fillRect(px, py, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
  }
  ctx.globalAlpha = 1;
}

export function makeTextures() {
  const s = 256;

  const sand = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#c9b489'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 5200, 0.5, ['#b39a6d', '#d8c69a', '#a08a5f', '#c2ab7e']);
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.05 + Math.random() * 0.06;
      ctx.fillStyle = '#8f7c56';
      ctx.beginPath();
      ctx.ellipse(Math.random() * s, Math.random() * s, 8 + Math.random() * 26, 5 + Math.random() * 16, Math.random() * 3, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }));

  const plaster = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#b3a284'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 3200, 0.35, ['#a08e6f', '#c2b294', '#96855f']);
    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#7d6c4e';
      const x = Math.random() * s;
      ctx.fillRect(x, 0, 2 + Math.random() * 5, s);
    }
    ctx.globalAlpha = 1;
  }));

  const plasterDark = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#7e7462'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 2600, 0.4, ['#6b6250', '#8d8371', '#5c5343']);
  }));

  const concrete = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#96938a'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 2200, 0.35, ['#84817a', '#a5a29a', '#757269']);
    ctx.strokeStyle = 'rgba(40,40,38,0.55)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * s / 4); ctx.lineTo(s, i * s / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * s / 4, 0); ctx.lineTo(i * s / 4, s); ctx.stroke();
    }
  }));

  const wood = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#7a5c36'; ctx.fillRect(0, 0, s, s);
    const boards = 6;
    for (let i = 0; i < boards; i++) {
      const x = i * s / boards;
      ctx.fillStyle = ['#7a5c36', '#836540', '#6f5330', '#8a6c44'][i % 4];
      ctx.fillRect(x, 0, s / boards, s);
      speckle(ctx, s, 0, 0, []);
      ctx.globalAlpha = 0.25; ctx.strokeStyle = '#4f3a20'; ctx.lineWidth = 2;
      for (let g = 0; g < 7; g++) {
        ctx.beginPath();
        ctx.moveTo(x + 3 + Math.random() * (s / boards - 6), Math.random() * s);
        ctx.lineTo(x + 3 + Math.random() * (s / boards - 6), Math.random() * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(40,28,14,0.8)';
      ctx.fillRect(x, 0, 3, s);
    }
    ctx.strokeStyle = '#4f3a20'; ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, s - 12, s - 12);
    ctx.fillStyle = '#3a2b16';
    [[16, 16], [s - 16, 16], [16, s - 16], [s - 16, s - 16]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    });
  }));

  const metal = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#5d6367'; ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) {
      ctx.globalAlpha = 0.12 + Math.random() * 0.12;
      ctx.fillStyle = Math.random() < 0.5 ? '#4a4f52' : '#6d7276';
      ctx.fillRect(0, y, s, 1.5);
    }
    ctx.globalAlpha = 1;
    speckle(ctx, s, 900, 0.25, ['#43484b', '#7b8084']);
  }));

  const barrelTex = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#5a6b4a'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 1400, 0.35, ['#4a5a3d', '#687a55', '#3f4c34']);
    ctx.fillStyle = 'rgba(30,38,24,0.75)';
    [0.18, 0.5, 0.82].forEach(f => ctx.fillRect(0, s * f - 7, s, 14));
  }));

  const doorTex = toTex(makeCanvas(s, (ctx) => {
    ctx.fillStyle = '#6e6a5e'; ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 1200, 0.3, ['#5d594e', '#7d7969']);
    ctx.strokeStyle = 'rgba(30,28,24,0.7)'; ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, s - 36, s / 2 - 28);
    ctx.strokeRect(18, s / 2 + 10, s - 36, s / 2 - 28);
  }));

  const flash = new THREE.CanvasTexture(makeCanvas(128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,230,1)');
    g.addColorStop(0.25, 'rgba(255,210,110,0.95)');
    g.addColorStop(0.6, 'rgba(255,130,30,0.55)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  }));
  flash.colorSpace = THREE.SRGBColorSpace;

  return { sand, plaster, plasterDark, concrete, wood, metal, barrel: barrelTex, door: doorTex, flash };
}
