import * as THREE from 'three';

const MAX_PARTICLES = 400;
const MAX_TRACERS = 28;

export class FX {
  constructor(scene, flashTex) {
    this.scene = scene;
    this.flashTex = flashTex;

    // ---- particles (one Points cloud) ----
    this.pGeo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    this.pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(this.pGeo, new THREE.PointsMaterial({
      size: 0.07, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.parts = []; // {x,y,z,vx,vy,vz,life,maxLife,r,g,b}
    for (let i = 0; i < MAX_PARTICLES; i++) this.pPos[i * 3 + 1] = -999;

    // ---- tracers ----
    this.tracers = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const m = new THREE.LineBasicMaterial({
        color: 0xffe6a8, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(g, m);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.tracers.push({ line, life: 0, max: 0.07 });
    }

    // ---- bot muzzle flashes (pooled sprites + lights) ----
    this.flashes = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flashTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
      }));
      sp.scale.set(0.7, 0.7, 1);
      sp.visible = false;
      scene.add(sp);
      const light = new THREE.PointLight(0xffaa44, 0, 12, 2);
      scene.add(light);
      this.flashes.push({ sp, light, life: 0 });
    }
  }

  tracer(a, b, color = 0xffe6a8) {
    const t = this.tracers.find(t => t.life <= 0) || this.tracers[0];
    const arr = t.line.geometry.attributes.position.array;
    arr[0] = a.x; arr[1] = a.y; arr[2] = a.z;
    arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.material.color.set(color);
    t.line.visible = true;
    t.life = t.max = 0.07;
  }

  impact(point, normal, kind) {
    const n = kind === 'blood' ? 9 : 7;
    const col = kind === 'blood'
      ? [0.45, 0.05, 0.05]
      : kind === 'spark'
        ? [1.0, 0.75, 0.25]
        : [0.75, 0.68, 0.52];
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= MAX_PARTICLES) this.parts.shift();
      const sp = kind === 'blood' ? 2.2 : 3.2;
      this.parts.push({
        x: point.x, y: point.y, z: point.z,
        vx: (Math.random() - 0.5) * sp + (normal ? normal.x * 2 : 0),
        vy: Math.random() * sp * 0.9 + 0.5,
        vz: (Math.random() - 0.5) * sp + (normal ? normal.z * 2 : 0),
        life: 0.35 + Math.random() * 0.25, maxLife: 0.6,
        r: col[0], g: col[1], b: col[2],
      });
    }
  }

  botFlash(pos) {
    const f = this.flashes.find(f => f.life <= 0) || this.flashes[0];
    f.sp.position.copy(pos);
    f.sp.material.rotation = Math.random() * Math.PI * 2;
    const s = 0.5 + Math.random() * 0.3;
    f.sp.scale.set(s, s, 1);
    f.sp.visible = true;
    f.light.position.copy(pos);
    f.light.intensity = 6;
    f.life = 0.05;
  }

  update(dt) {
    // particles
    let w = 0;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= 9 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
      const f = p.life / p.maxLife;
      this.pPos[w * 3] = p.x; this.pPos[w * 3 + 1] = p.y; this.pPos[w * 3 + 2] = p.z;
      this.pCol[w * 3] = p.r * f; this.pCol[w * 3 + 1] = p.g * f; this.pCol[w * 3 + 2] = p.b * f;
      this.parts[w] = p;
      w++;
    }
    this.parts.length = w;
    for (let i = w; i < MAX_PARTICLES; i++) this.pPos[i * 3 + 1] = -999;
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;

    // tracers
    for (const t of this.tracers) {
      if (t.life <= 0) { t.line.visible = false; continue; }
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / t.max) * 0.9;
    }

    // flashes
    for (const f of this.flashes) {
      if (f.life <= 0) { f.sp.visible = false; f.light.intensity = 0; continue; }
      f.life -= dt;
      f.sp.material.opacity = Math.max(0, f.life / 0.05);
      f.light.intensity = Math.max(0, f.life / 0.05) * 6;
    }
  }
}
