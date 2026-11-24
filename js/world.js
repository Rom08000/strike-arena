import * as THREE from 'three';
import { makeSkyTexture, sized } from './textures.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.textures = null;
    this.solids = [];      // meshes used for raycasts
    this.colliders = [];   // {min:Vector3, max:Vector3}
    this.minimapRects = [];
    this._ray = new THREE.Raycaster();
    this.spawnCT = new THREE.Vector3(0, 0, -45);
    this.spawnT = [
      new THREE.Vector3(-4, 0, 40), new THREE.Vector3(4, 0, 40),
      new THREE.Vector3(-13, 0, 36), new THREE.Vector3(13, 0, 36),
      new THREE.Vector3(0, 0, 45),
    ];
    this.routes = [
      // A long -> A doors -> mid -> CT
      [[-23, 16], [-25, 6], [-16, -6], [-17, -16], [-20, -28], [-15, -32], [-4, -32], [0, -36], [0, -43]],
      // B tunnels -> B doors -> mid -> CT
      [[23, 16], [18, 10], [17, -16], [14, -28], [11, -32], [4, -32], [0, -36], [0, -43]],
      // A site push
      [[-23, 16], [-25, 6], [-16, -6], [-22, -18], [-28, -22], [-36, -22], [-40, -14]],
      // B site push
      [[23, 16], [18, 10], [22, -18], [28, -22], [33, -22], [44, -16]],
      // mid via A
      [[-23, 16], [-25, 6], [-16, -6], [-18, -28], [-12, -32], [-4, -32], [-7, -24], [-7, -14], [0, -6]],
    ];
  }

  setTextures(t) { this.textures = t; }

  _mat(name, w, h) {
    const t = this.textures[name];
    const metal = name === 'metal' || name === 'barrel' || name === 'door' || name.startsWith('container');
    const m = {
      map: sized(t.map, w, h),
      normalMap: sized(t.normal, w, h),
      roughnessMap: sized(t.rough, w, h),
      roughness: 1.0,
      metalness: 0.0,
      normalScale: new THREE.Vector2(1.2, 1.2),
    };
    if (metal) {
      m.metalness = 1.0;
      m.metalnessMap = sized(t.metal, w, h);
    }
    m.envMapIntensity = 0.6;
    return new THREE.MeshStandardMaterial(m);
  }

  _addCollider(min, max) {
    this.colliders.push({ min, max });
  }

  wallX(x, z1, z2, h, name = 'plaster', thick = 0.8) {
    const len = Math.abs(z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thick, h, len), this._mat(name, len, h));
    mesh.position.set(x, h / 2, (z1 + z2) / 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    this.solids.push(mesh);
    this._addCollider(
      new THREE.Vector3(x - thick / 2, 0, Math.min(z1, z2)),
      new THREE.Vector3(x + thick / 2, h, Math.max(z1, z2))
    );
    this.minimapRects.push({ x1: x - thick / 2, z1: Math.min(z1, z2), x2: x + thick / 2, z2: Math.max(z1, z2) });
  }

  wallZ(z, x1, x2, h, name = 'plaster', thick = 0.8) {
    const len = Math.abs(x2 - x1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), this._mat(name, len, h));
    mesh.position.set((x1 + x2) / 2, h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    this.solids.push(mesh);
    this._addCollider(
      new THREE.Vector3(Math.min(x1, x2), 0, z - thick / 2),
      new THREE.Vector3(Math.max(x1, x2), h, z + thick / 2)
    );
    this.minimapRects.push({ x1: Math.min(x1, x2), z1: z - thick / 2, x2: Math.max(x1, x2), z2: z + thick / 2 });
  }

  box(cx, cz, w, d, h, name = 'wood') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat(name, w, h));
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    this.solids.push(mesh);
    this._addCollider(new THREE.Vector3(cx - w / 2, 0, cz - d / 2), new THREE.Vector3(cx + w / 2, h, cz + d / 2));
    this.minimapRects.push({ x1: cx - w / 2, z1: cz - d / 2, x2: cx + w / 2, z2: cz + d / 2 });
  }

  barrel(cx, cz) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12), this._mat('barrel', 2.2, 1.1));
    mesh.position.set(cx, 0.55, cz);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
    this.solids.push(mesh);
    this._addCollider(new THREE.Vector3(cx - 0.35, 0, cz - 0.35), new THREE.Vector3(cx + 0.35, 1.1, cz + 0.35));
    this.minimapRects.push({ x1: cx - 0.35, z1: cz - 0.35, x2: cx + 0.35, z2: cz + 0.35 });
  }

  palette(cx, cz, w = 2, d = 2) {
    this.box(cx, cz, w, d, 0.14, 'wood');
  }

  // ---------- détails de map ----------
  trimZ(z, x1, x2, y, h = 0.35, name = 'plasterDark') {
    this.box((x1 + x2) / 2, z, Math.abs(x2 - x1), 0.28, h, name);
    this.group.children[this.group.children.length - 1].position.y = y;
    this.colliders.pop();
    this.minimapRects.pop();
  }

  trimX(x, z1, z2, y, h = 0.35, name = 'plasterDark') {
    this.box(x, (z1 + z2) / 2, 0.28, Math.abs(z2 - z1), h, name);
    this.group.children[this.group.children.length - 1].position.y = y;
    this.colliders.pop();
    this.minimapRects.pop();
  }

  pillar(x, z, h = 8) {
    this.box(x, z, 0.7, 0.7, h, 'plasterDark');
  }

  pipeZ(x, y, z1, z2, r = 0.06) {
    const len = Math.abs(z2 - z1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), this._mat('metal', len, 0.3));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, (z1 + z2) / 2);
    m.castShadow = true;
    this.group.add(m);
  }

  pipeX(z, y, x1, x2, r = 0.06) {
    const len = Math.abs(x2 - x1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), this._mat('metal', len, 0.3));
    m.rotation.z = Math.PI / 2;
    m.position.set((x1 + x2) / 2, y, z);
    m.castShadow = true;
    this.group.add(m);
  }

  lamp(x, z, h = 3.4) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, h, 8), this._mat('metal', 0.4, h));
    pole.position.set(x, h / 2, z);
    pole.castShadow = true;
    this.group.add(pole);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffd9a0, emissiveIntensity: 2.4 })
    );
    head.position.set(x, h + 0.12, z);
    this.group.add(head);
    const light = new THREE.PointLight(0xffd9a0, 16, 24, 1.8);
    light.position.set(x, h, z);
    this.group.add(light);
    this._addCollider(new THREE.Vector3(x - 0.12, 0, z - 0.12), new THREE.Vector3(x + 0.12, h, z + 0.12));
  }

  decal(x, z, w, d, rot = 0, op = 0.65) {
    if (!this.decalTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) {
        const px = Math.random() * 256, py = Math.random() * 256, r = 12 + Math.random() * 46;
        const g = ctx.createRadialGradient(px, py, 2, px, py, r);
        g.addColorStop(0, 'rgba(28,22,15,0.5)');
        g.addColorStop(1, 'rgba(28,22,15,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
      }
      this.decalTex = new THREE.CanvasTexture(c);
    }
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: this.decalTex, transparent: true, opacity: op, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.position.set(x, 0.02, z);
    this.group.add(m);
  }

  rock(x, z, s) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(s, 1),
      new THREE.MeshStandardMaterial({ color: 0x9a8f78, roughness: 1, metalness: 0, flatShading: true, envMapIntensity: 0.4 })
    );
    m.position.set(x, s * 0.55, z);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    this.solids.push(m);
    this._addCollider(new THREE.Vector3(x - s * 0.7, 0, z - s * 0.7), new THREE.Vector3(x + s * 0.7, s * 1.1, z + s * 0.7));
  }

  doorFrameX(x, z1, z2) {
    const w = Math.abs(z2 - z1);
    this.box(x, z1 - 0.2, 0.5, 0.5, 3.2, 'metal');
    this.box(x, z2 + 0.2, 0.5, 0.5, 3.2, 'metal');
    this.box(x, (z1 + z2) / 2, 0.5, w + 0.9, 0.5, 'metal');
    this.group.children[this.group.children.length - 1].position.y = 3.2;
    this.colliders.pop(); this.minimapRects.pop();
  }

  doorFrameZ(z, x1, x2) {
    this.box(x1 - 0.2, z, 0.5, 0.5, 3.2, 'metal');
    this.box(x2 + 0.2, z, 0.5, 0.5, 3.2, 'metal');
    this.box((x1 + x2) / 2, z, Math.abs(x2 - x1) + 0.9, 0.5, 0.5, 'metal');
    this.group.children[this.group.children.length - 1].position.y = 3.2;
    this.colliders.pop(); this.minimapRects.pop();
  }

  container(cx, cz, w, d, h, name) {
    this.box(cx, cz, w, d, h, name);
  }

  build() {
    // ---- sky dome ----
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(380, 24, 16),
      new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
    );
    this.group.add(sky);

    // ---- ground ----
    const sand = this.textures.sand;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({
        map: sized(sand.map, 70, 70),
        normalMap: sized(sand.normal, 70, 70),
        roughnessMap: sized(sand.rough, 70, 70),
        roughness: 1.0,
        metalness: 0.0,
        normalScale: new THREE.Vector2(1.5, 1.5),
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // ---- perimeter (adobe/stucco walls) ----
    this.wallX(-50, -52, 52, 9, 'plaster', 1.4);
    this.wallX(50, -52, 52, 9, 'plaster', 1.4);
    this.wallZ(-50, -52, 52, 9, 'plaster', 1.4);
    this.wallZ(50, -52, 52, 9, 'plaster', 1.4);

    // ---- CT spawn room (north) ----
    this.wallZ(-40, -50, -40, 8);
    this.wallZ(-40, -36, -4, 8);   // gap [-40,-36] = "short A"
    this.wallZ(-40, 4, 36, 8);     // gap [-4,4] = mid door
    this.wallZ(-40, 40, 50, 8);    // gap [36,40] = "short B"
    this.wallX(-14, -50, -40, 8);
    this.wallX(14, -50, -40, 8);

    // ---- mid street x in [-8,8], z in [-40,20]; door gaps z in [-34,-30] ----
    this.wallX(-8, -40, -34, 8);
    this.wallX(-8, -30, 20, 8);
    this.wallX(8, -40, -34, 8);
    this.wallX(8, -30, 20, 8);

    // ---- A corridor x in [-26,-8]; gap in x=-26 wall at z in [-24,-20] ----
    this.wallX(-26, -50, -24, 8);
    this.wallX(-26, -20, 20, 8);
    this.wallZ(-34, -26, -8, 8);   // north wall of A doors
    this.wallZ(-8, -50, -26, 8);   // south wall of A site

    // ---- B corridor x in [8,26] ----
    this.wallX(26, -50, -24, 8);
    this.wallX(26, -20, 20, 8);
    this.wallZ(-34, 8, 26, 8);
    this.wallZ(-8, 26, 50, 8);

    // ---- T boundary at z=20 (metal doors / fences) ----
    this.wallZ(20, -20, -8, 5, 'metal');
    this.wallZ(20, -8, 8, 5, 'door');
    this.wallZ(20, 8, 20, 5, 'metal');

    // ================= props =================
    // T plaza
    this.box(-6, 32, 3, 3, 1); this.box(6, 32, 3, 3, 1);
    this.box(0, 38, 4, 2, 1); this.box(-16, 30, 2.5, 2.5, 1); this.box(16, 30, 2.5, 2.5, 1);
    this.barrel(-14, 44); this.barrel(14, 44); this.barrel(0, 46);
    this.container(-19, 44, 6, 2.5, 2.6, 'containerGreen');
    this.container(19, 44, 6, 2.5, 2.6, 'containerBlue');
    this.palette(-8, 42, 3, 2); this.palette(8, 42, 3, 2);
    // mid
    this.box(-4, -12, 2, 2, 1); this.box(4, -4, 2, 2, 1); this.box(0, 6, 3, 3, 1);
    this.wallZ(-20, -6, 2, 1.1, 'concrete', 0.5);
    this.barrel(-6, 14); this.barrel(6, 16);
    this.palette(0, -2, 2.5, 2);
    // A doors / A long
    this.box(-20, -32, 2, 2, 1.5);
    this.box(-20, 10, 2.5, 2.5, 1); this.box(-14, -6, 2, 4, 1);
    this.wallZ(8, -24, -14, 1.1, 'concrete', 0.5);
    this.palette(-17, 2, 3, 2);
    // A site
    this.box(-40, -26, 7, 6, 1.3, 'concrete');
    this.box(-34, -36, 2, 2, 2); this.box(-46, -14, 3, 2, 1); this.box(-30, -12, 2, 2, 1);
    this.barrel(-44, -34); this.barrel(-31, -30);
    this.container(-46, -40, 6, 2.5, 2.6, 'containerRed');
    this.box(-36, -20, 2, 2, 1); this.box(-44, -20, 2, 2, 1);
    this.palette(-40, -16, 3, 3);
    // CT spawn
    this.box(-7, -45, 3, 2, 1); this.box(7, -45, 3, 2, 1); this.barrel(11, -44);
    this.palette(-11, -44, 3, 2);
    // B doors / B tunnels
    this.box(20, -32, 2, 2, 1.5);
    this.box(16, 10, 2, 3, 1); this.box(12, -8, 2, 2, 1);
    this.wallX(22, 4, 10, 1.1, 'concrete', 0.5);
    this.palette(17, -2, 3, 2);
    // B site
    this.box(38, -24, 7, 5, 1.3, 'concrete');
    this.box(44, -36, 2, 2, 2); this.box(30, -14, 3, 2, 1);
    this.barrel(46, -20); this.barrel(32, -32);
    this.container(46, -40, 6, 2.5, 2.6, 'containerBlue');
    this.box(34, -18, 2, 2, 1); this.box(42, -14, 2, 2, 1);
    this.palette(38, -14, 3, 3);
    // side strips + north rooms
    this.box(-40, 4, 2, 2, 1); this.box(40, 4, 2, 2, 1);
    this.box(-30, -46, 2, 2, 1); this.box(30, -46, 2, 2, 1);
    this.container(-38, -46, 5, 2.5, 2.6, 'containerGreen');
    this.container(38, -46, 5, 2.5, 2.6, 'containerRed');

    // ================= détails =================
    // corniches + plinthes sur le périmètre et les murs principaux
    for (const y of [0.28, 8.55]) {
      this.trimZ(-50, -52, 52, y); this.trimZ(50, -52, 52, y);
      this.trimX(-50, -52, 52, y); this.trimX(50, -52, 52, y);
    }
    this.trimZ(-40, -50, 50, 0.28); this.trimZ(-40, -50, 50, 7.7);
    this.trimZ(-8, -40, 20, 0.28); this.trimX(-8, -40, 20, 7.7);
    this.trimX(8, -40, 20, 7.7); this.trimZ(20, -26, 26, 4.7);
    // piliers aux jonctions de murs
    for (const [px, pz] of [[-8, -40], [8, -40], [-8, -34], [8, -34], [-8, -30], [8, -30], [-8, 20], [8, 20], [-26, -34], [26, -34], [-14, -40], [14, -40], [-26, 20], [26, 20], [-8, -20], [8, -20]])
      this.pillar(px, pz);
    // cadres de portes métalliques
    this.doorFrameZ(-40, -4, 4);
    this.doorFrameZ(-40, -40, -36);
    this.doorFrameZ(-40, 36, 40);
    this.doorFrameX(-8, -34, -30);
    this.doorFrameX(8, -34, -30);
    this.doorFrameZ(20, -26, -20);
    this.doorFrameZ(20, 20, 26);
    // tuyaux le long des corridors
    this.pipeZ(-25.6, 2.4, -30, 18); this.pipeZ(-25.6, 2.7, -30, 18, 0.045);
    this.pipeZ(25.6, 2.4, -30, 18); this.pipeX(-8.4 - 0.0, 2.6, -38, 18); this.pipeX(8.4, 2.6, -38, 18);
    this.pipeZ(-40, 2.2, -46, -42);
    // lampadaires (lumière chaude ponctuelle)
    this.lamp(-4, -37); this.lamp(-6, -20); this.lamp(6, -20);
    this.lamp(-17, -32.5); this.lamp(17, -32.5);
    this.lamp(0, 30); this.lamp(0, -44);
    // décals au sol (taches d'huile, traces)
    this.decal(-14, 44, 5, 4, 0.4); this.decal(14, 44, 4, 5, 1.2);
    this.decal(0, 6, 6, 5, 0.9, 0.5); this.decal(-6, 14, 4, 3, 2.1);
    this.decal(-44, -34, 5, 4, 0.2); this.decal(46, -20, 4, 4, 1.8);
    this.decal(0, 38, 7, 5, 0.5, 0.45); this.decal(-20, 10, 4, 4, 2.6);
    this.decal(17, -8, 4, 3, 0.8); this.decal(0, -44, 4, 3, 1.5);
    // rochers / gravats
    this.rock(-48, 30, 0.5); this.rock(47, 34, 0.65); this.rock(-30, -44, 0.45);
    this.rock(31, -45, 0.5); this.rock(-12, 24, 0.4); this.rock(11, 26, 0.35);
    this.rock(-27, -8, 0.4); this.rock(27, 2, 0.45); this.rock(0, 12, 0.3);

    // ================= lighting =================
    const hemi = new THREE.HemisphereLight(0xd6e6ff, 0x9a8a68, 0.45);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2b0, 2.4);
    sun.position.set(55, 85, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 5; sc.far = 260;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    this.scene.add(sun.target);
    const fill = new THREE.DirectionalLight(0xbfd0e8, 0.35);
    fill.position.set(-40, 50, -60);
    this.scene.add(fill);
    this.scene.updateMatrixWorld(true);
  }

  _footOverlap(x, z, r, c) {
    return x + r > c.min.x && x - r < c.max.x && z + r > c.min.z && z - r < c.max.z;
  }

  resolveMove(pos, vel, dt, r, h) {
    let onGround = false;
    const prevY = pos.y;

    pos.x += vel.x * dt;
    for (const c of this.colliders) {
      if (c.max.y <= pos.y + 0.05 || c.min.y >= pos.y + h) continue;
      if (this._footOverlap(pos.x, pos.z, r, c)) {
        if (pos.x < (c.min.x + c.max.x) / 2) pos.x = c.min.x - r; else pos.x = c.max.x + r;
        vel.x = 0;
      }
    }
    pos.z += vel.z * dt;
    for (const c of this.colliders) {
      if (c.max.y <= pos.y + 0.05 || c.min.y >= pos.y + h) continue;
      if (this._footOverlap(pos.x, pos.z, r, c)) {
        if (pos.z < (c.min.z + c.max.z) / 2) pos.z = c.min.z - r; else pos.z = c.max.z + r;
        vel.z = 0;
      }
    }

    pos.y += vel.y * dt;
    let ground = 0;
    for (const c of this.colliders) {
      if (!this._footOverlap(pos.x, pos.z, r, c)) continue;
      if (c.max.y <= prevY + 0.001 && c.max.y > ground && c.max.y >= pos.y - 0.001) ground = c.max.y;
    }
    if (pos.y <= ground) {
      pos.y = ground;
      if (vel.y < 0) vel.y = 0;
      onGround = true;
    }
    return { onGround };
  }

  raycastWorld(origin, dir, maxDist = 400) {
    this._ray.set(origin, dir);
    this._ray.far = maxDist;
    const hits = this._ray.intersectObjects(this.solids, false);
    return hits.length ? hits[0] : null;
  }

  losClear(a, b) {
    const dir = b.clone().sub(a);
    const dist = dir.length();
    if (dist < 0.001) return true;
    dir.normalize();
    const hit = this.raycastWorld(a, dir, dist - 0.1);
    return !hit;
  }
}
