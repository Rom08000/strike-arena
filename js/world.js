import * as THREE from 'three';
import { makeTextures, makeSkyTexture, sized } from './textures.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.textures = makeTextures();
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

  _mat(name, w, h) {
    const t = this.textures[name];
    const metal = name === 'metal' || name === 'barrel' || name === 'door' || name.startsWith('container');
    return new THREE.MeshStandardMaterial({
      map: sized(t.map, w, h),
      normalMap: sized(t.normal, w, h),
      roughnessMap: sized(t.rough, w, h),
      metalness: metal ? 0.55 : 0.06,
      roughness: 1.0,
      normalScale: new THREE.Vector2(1.25, 1.25),
    });
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

    // ================= lighting =================
    const hemi = new THREE.HemisphereLight(0xd6e6ff, 0x9a8a68, 0.75);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
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
