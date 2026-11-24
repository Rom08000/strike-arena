import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const DEFS = {
  p2000: {
    key: 'p2000', name: 'P2000', slot: 2, price: 0, auto: false, rpm: 352, dmg: 26, headMult: 4,
    mag: 20, reserveMax: 120, reloadTime: 2.2, spread: 0.009, moveSpread: 0.045, bloom: 0.006,
    recoil: [0.02, 0.009], snd: 'deagle', adsFov: 66, speedMul: 0.97, kick: 0.05, view: 'pistol',
    model: 'assets/weapons/p2000.glb', modelLen: 0.34,
  },
  deagle: {
    key: 'deagle', name: 'Desert Eagle', slot: 2, price: 700, auto: false, rpm: 267, dmg: 54, headMult: 4,
    mag: 7, reserveMax: 35, reloadTime: 2.1, spread: 0.008, moveSpread: 0.055, bloom: 0.012,
    recoil: [0.03, 0.014], snd: 'deagle', adsFov: 62, speedMul: 0.95, kick: 0.09, view: 'deagle',
    model: 'assets/weapons/deagle.glb', modelLen: 0.36,
  },
  ak: {
    key: 'ak', name: 'AK-47', slot: 1, price: 2700, auto: true, rpm: 600, dmg: 36, headMult: 4,
    mag: 30, reserveMax: 120, reloadTime: 2.45, spread: 0.0065, moveSpread: 0.026, bloom: 0.0038,
    recoil: [0.0165, 0.008], snd: 'ak', adsFov: 67, speedMul: 0.92, kick: 0.05, view: 'ak',
    model: 'assets/weapons/ak47.glb', modelLen: 0.62,
  },
  awp: {
    key: 'awp', name: 'AWP', slot: 3, price: 4750, auto: false, rpm: 41, dmg: 115, headMult: 1,
    mag: 5, reserveMax: 30, reloadTime: 3.4, spread: 0.02, moveSpread: 0.09, bloom: 0.01,
    recoil: [0.085, 0.02], snd: 'awp', adsFov: 14, speedMul: 0.8, kick: 0.15, view: 'awp',
    model: 'assets/weapons/awp.glb', modelLen: 0.9,
  },
};

function buildViewmodel(view, flashTex) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.75, roughness: 0.4 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x17191c, metalness: 0.7, roughness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6e4f2e, metalness: 0.05, roughness: 0.85 });
  const green = new THREE.MeshStandardMaterial({ color: 0x3c4a34, metalness: 0.2, roughness: 0.8 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };
  let mz;
  if (view === 'ak') {
    add(new THREE.BoxGeometry(0.07, 0.1, 0.46), metal, 0, 0, -0.02);
    add(new THREE.BoxGeometry(0.075, 0.085, 0.24), wood, 0, -0.01, -0.32);
    add(new THREE.CylinderGeometry(0.017, 0.017, 0.34, 10), metalDark, 0, 0.01, -0.5, Math.PI / 2);
    add(new THREE.BoxGeometry(0.05, 0.18, 0.09), metalDark, 0, -0.13, -0.08, 0.28);
    add(new THREE.BoxGeometry(0.045, 0.12, 0.05), wood, 0, -0.1, 0.08, 0.35);
    add(new THREE.BoxGeometry(0.06, 0.11, 0.26), wood, 0, -0.02, 0.2);
    add(new THREE.BoxGeometry(0.02, 0.05, 0.02), metalDark, 0, 0.075, -0.18);
    add(new THREE.BoxGeometry(0.025, 0.025, 0.03), metalDark, 0, 0.075, 0.02);
    mz = -0.68;
  } else if (view === 'awp') {
    add(new THREE.BoxGeometry(0.075, 0.11, 0.5), green, 0, 0, 0);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 10), metalDark, 0, 0.015, -0.55, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), metalDark, 0, 0.1, -0.05, Math.PI / 2);
    add(new THREE.BoxGeometry(0.06, 0.12, 0.28), green, 0, -0.03, 0.32);
    add(new THREE.BoxGeometry(0.05, 0.16, 0.08), metalDark, 0, -0.13, 0.12, 0.3);
    mz = -0.88;
  } else {
    const deagle = view === 'deagle';
    const len = deagle ? 0.3 : 0.24;
    add(new THREE.BoxGeometry(0.05, 0.07, len), metal, 0, 0.01, -len / 2 + 0.02);
    add(new THREE.BoxGeometry(0.045, 0.05, 0.08), metalDark, 0, 0.045, -len + 0.04);
    add(new THREE.BoxGeometry(0.045, 0.14, 0.06), deagle ? metalDark : wood, 0, -0.08, len / 2 - 0.04, -0.25);
    add(new THREE.BoxGeometry(0.015, 0.02, 0.015), metalDark, 0, 0.055, -len + 0.03);
    mz = -len - 0.03;
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, view === 'awp' ? 0.015 : 0.01, mz);
  g.add(muzzle);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  flash.position.set(0, 0, 0.06);
  flash.scale.set(0.3, 0.3, 1);
  flash.visible = false;
  muzzle.add(flash);
  const light = new THREE.PointLight(0xffaa44, 0, 9, 2);
  muzzle.add(light);
  g.userData.muzzle = muzzle;
  g.userData.flash = flash;
  g.userData.light = light;
  return g;
}

// oriente un modèle d'arme : axe long -> Z, bouche vers -Z, échelle targetLen, centré sur l'origine
export function prepareGunScene(inner, targetLen) {
  const root = new THREE.Group();
  root.add(inner);
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(inner);
  let size = box.getSize(new THREE.Vector3());
  if (size.x > size.z * 1.05) {
    inner.rotation.y = -Math.PI / 2;
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(inner);
    size = box.getSize(new THREE.Vector3());
  }
  const muzzleNode = inner.getObjectByName('Attach_Muzzle') || null;
  if (muzzleNode) {
    const mp = new THREE.Vector3();
    muzzleNode.getWorldPosition(mp);
    const c = box.getCenter(new THREE.Vector3());
    if (mp.z > c.z) inner.rotation.y += Math.PI;
  }
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(inner);
  size = box.getSize(new THREE.Vector3());
  const len = Math.max(size.z, 0.05);
  inner.scale.setScalar(targetLen / len);
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.sub(c);
  root.updateMatrixWorld(true);
  return { root, muzzleNode };
}

function buildGLBViewmodel(gltf, def, flashTex) {
  const inner = gltf.scene;
  const { root, muzzleNode } = prepareGunScene(inner, def.modelLen);
  inner.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.frustumCulled = false;
      if (o.material) {
        o.material.metalness = 0.85;
        o.material.roughness = 0.42;
        o.material.envMapIntensity = 1.2;
      }
    }
  });
  let muzzle = muzzleNode;
  if (!muzzle) {
    const box = new THREE.Box3().setFromObject(inner);
    muzzle = new THREE.Object3D();
    muzzle.position.set(0, box.getCenter(new THREE.Vector3()).y, box.min.z - 0.02);
    inner.add(muzzle);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flashTex, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
  }));
  flash.position.set(0, 0, -0.05);
  flash.scale.set(0.3, 0.3, 1);
  flash.visible = false;
  muzzle.add(flash);
  const light = new THREE.PointLight(0xffaa44, 0, 9, 2);
  muzzle.add(light);
  root.userData.muzzle = muzzle;
  root.userData.flash = flash;
  root.userData.light = light;
  return root;
}

export class WeaponSystem {
  constructor(camera, scene, world, player, bots, hud, audio, fx) {
    this.camera = camera;
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.bots = bots;
    this.hud = hud;
    this.audio = audio;
    this.fx = fx;
    this.inv = { 1: null, 2: this._mk(DEFS.p2000), 3: null };
    this.currentSlot = 2;
    this.current = this.inv[2];
    this.lastSlot = 2;
    this.vmGroup = new THREE.Group();
    this.vmGroup.position.set(0.22, -0.2, -0.45);
    camera.add(this.vmGroup);
    this.kick = 0;
    this.flashT = 0;
    this.scoped = false;
    this.currentSpread = 0.006;
    this.vmPos = null;
    this.onKill = () => {};
    this._ray = new THREE.Raycaster();
    this._buildVM();
  }

  _mk(def) {
    return { def, mag: def.mag, reserve: def.reserveMax, cd: 0, reloading: false, reloadT: 0, switchT: 0, bloom: 0 };
  }

  async loadModels() {
    const gltfLoader = new GLTFLoader();
    const jobs = [];
    for (const key of Object.keys(DEFS)) {
      const def = DEFS[key];
      if (def.model && !def._gltf) {
        jobs.push(
          gltfLoader.loadAsync(def.model)
            .then(g => { def._gltf = g; })
            .catch(e => console.warn('model GLB fallback (procedural) for', def.model, e))
        );
      }
    }
    await Promise.all(jobs);
    this._buildVM();
  }

  _buildVM() {
    if (this.gunGroup) this.vmGroup.remove(this.gunGroup);
    const def = this.current.def;
    this.gunGroup = def._gltf
      ? buildGLBViewmodel(def._gltf, def, this.fx.flashTex)
      : buildViewmodel(def.view, this.fx.flashTex);
    this.gunGroup.rotation.y = 0.05;
    this.vmGroup.add(this.gunGroup);
    this.muzzle = this.gunGroup.userData.muzzle;
    this.flashSprite = this.gunGroup.userData.flash;
    this.flashLight = this.gunGroup.userData.light;
  }

  has(slot) { return !!this.inv[slot]; }

  resetInventory() {
    this.inv = { 1: null, 2: this._mk(DEFS.p2000), 3: null };
    this.currentSlot = 2;
    this.lastSlot = 2;
    this.current = this.inv[2];
    this._buildVM();
    this.hud.setAmmo(this.current.mag, this.current.reserve, this.current.def.name);
  }

  refill() {
    for (const s of [1, 2, 3]) {
      const w = this.inv[s];
      if (w) {
        w.mag = w.def.mag;
        w.reserve = w.def.reserveMax;
        w.reloading = false;
        w.cd = 0;
      }
    }
    this.hud.setAmmo(this.current.mag, this.current.reserve, this.current.def.name);
  }

  buyWeapon(key) {
    const def = DEFS[key];
    if (!def) return;
    this.inv[def.slot] = this._mk(def);
    if (this.currentSlot === def.slot) {
      this.current = this.inv[def.slot];
      this.current.switchT = 0.35;
      this._buildVM();
    } else {
      this.switchSlot(def.slot);
    }
    this.hud.setAmmo(this.current.mag, this.current.reserve, this.current.def.name);
  }

  switchSlot(slot) {
    const w = this.inv[slot];
    if (!w || slot === this.currentSlot) return;
    this.lastSlot = this.currentSlot;
    this.currentSlot = slot;
    this.current = w;
    w.switchT = 0.35;
    w.reloading = false;
    this._buildVM();
    this.hud.setAmmo(w.mag, w.reserve, w.def.name);
    this.audio.ui();
  }

  switchLast() { this.switchSlot(this.lastSlot); }

  cycle(dir) {
    const order = [1, 2, 3].filter(s => this.inv[s]);
    if (order.length < 2) return;
    let i = order.indexOf(this.currentSlot);
    i = (i + dir + order.length) % order.length;
    this.switchSlot(order[i]);
  }

  startReload() {
    const w = this.current, def = w.def;
    if (w.reloading || w.mag >= def.mag || w.reserve <= 0 || w.switchT > 0) return;
    w.reloading = true;
    w.reloadT = def.reloadTime;
    this.audio.reload();
  }

  tryFire() {
    const w = this.current, def = w.def;
    if (w.cd > 0 || w.reloading || w.switchT > 0) return;
    if (w.mag <= 0) {
      this.audio.dry();
      this.startReload();
      return;
    }
    w.cd = 60 / def.rpm;
    w.mag--;
    w.bloom = Math.min(0.05, w.bloom + def.bloom);
    this.hud.setAmmo(w.mag, w.reserve, def.name);

    const eye = this.player.eyePos();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    let sp = this.scoped ? 0.00012 : this.currentSpread;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    dir.addScaledVector(right, gauss() * sp).addScaledVector(up, gauss() * sp).normalize();

    this._ray.set(eye, dir);
    this._ray.far = 400;
    const targets = this.world.solids.concat(this.bots.hitMeshes());
    const hits = this._ray.intersectObjects(targets, false);

    const mw = new THREE.Vector3();
    this.muzzle.getWorldPosition(mw);
    let end;
    if (hits.length) {
      const h = hits[0];
      end = h.point.clone();
      const bot = h.object.userData.bot;
      if (bot && bot.alive) {
        const isHead = h.object.userData.part === 'head';
        let dmg = def.dmg * Math.pow(0.985, h.distance);
        if (isHead) {
          dmg *= def.headMult;
          if (this.player.helmet) dmg *= 0.7;
        }
        const res = bot.takeDamage(dmg, isHead, this.player.pos, this.fx);
        this.fx.impact(h.point, h.face ? h.face.normal : null, 'blood');
        if (res.died) this.onKill(bot, isHead, def.name);
        this.hud.hitmarker(isHead || res.died);
        this.audio.hit(isHead);
      } else {
        this.fx.impact(h.point, h.face ? h.face.normal : null, 'dust');
      }
    } else {
      end = eye.clone().addScaledVector(dir, 400);
    }
    this.fx.tracer(mw, end);
    this.audio.shot(def.snd, 0, 0);
    this.player.addRecoil(def.recoil[0] * (0.9 + Math.random() * 0.25), (Math.random() - 0.5) * 2 * def.recoil[1]);
    this.kick = Math.min(0.14, this.kick + def.kick);
    this.flashT = 0.045;
  }

  update(dt, input) {
    const w = this.current, def = w.def;
    if (w.cd > 0) w.cd -= dt;
    if (w.switchT > 0) w.switchT -= dt;
    w.bloom = Math.max(0, w.bloom - 3.2 * dt);
    this.kick += (0 - this.kick) * Math.min(1, 11 * dt);

    if (w.reloading) {
      w.reloadT -= dt;
      if (w.reloadT <= 0) {
        const need = def.mag - w.mag;
        const take = Math.min(need, w.reserve);
        w.mag += take;
        w.reserve -= take;
        w.reloading = false;
        this.hud.setAmmo(w.mag, w.reserve, def.name);
      }
    }

    this.scoped = def.view === 'awp' && !!input.aim && !w.reloading && w.switchT <= 0;
    const ads = !!input.aim && !this.scoped && !w.reloading;
    const targetFov = this.scoped ? def.adsFov : ads ? def.adsFov : 75;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 14 * dt);
      this.camera.updateProjectionMatrix();
    }
    this.player.speedMul = def.speedMul * (this.scoped ? 0.45 : ads ? 0.92 : 1);
    this.player.sensScale = this.scoped ? 0.32 : 1;
    this.hud.scope(this.scoped);
    this.hud.setCrosshairVisible(!this.scoped);

    if ((def.auto && input.fire) || input.firePressed) this.tryFire();

    let sp = def.spread;
    if (this.scoped) sp = 0.00012;
    else {
      sp += def.moveSpread * Math.min(1, this.player.hSpeed / 5);
      if (!this.player.onGround) sp += 0.02;
      sp += w.bloom;
      if (ads) sp *= 0.6;
    }
    this.currentSpread = Math.min(sp, 0.12);

    const base = { x: 0.22, y: -0.2, z: -0.45 };
    const adsPos = { x: 0, y: -0.148, z: -0.38 };
    const moveAmt = Math.min(1, this.player.hSpeed / 6);
    const bobX = Math.sin(this.player.bobPhase) * 0.009 * moveAmt;
    const bobY = Math.abs(Math.cos(this.player.bobPhase)) * 0.009 * moveAmt;
    if (this.scoped) {
      this.gunGroup.visible = false;
    } else {
      this.gunGroup.visible = true;
      const t = ads ? adsPos : base;
      const k = Math.min(1, 12 * dt);
      if (!this.vmPos) this.vmPos = { ...base };
      this.vmPos.x += (t.x + bobX - this.vmPos.x) * k;
      this.vmPos.y += (t.y + bobY - this.vmPos.y) * k;
      this.vmPos.z += (t.z - this.vmPos.z) * k;
    }
    let tx = this.vmPos ? this.vmPos.x : base.x;
    let ty = this.vmPos ? this.vmPos.y : base.y;
    let tz = this.vmPos ? this.vmPos.z : base.z;

    if (w.reloading) {
      const p = 1 - w.reloadT / def.reloadTime;
      ty -= Math.sin(p * Math.PI) * 0.16;
      this.gunGroup.rotation.x = -Math.sin(p * Math.PI) * 0.75;
    } else if (w.switchT > 0) {
      const p = w.switchT / 0.35;
      ty -= Math.sin(p * Math.PI) * 0.22;
      this.gunGroup.rotation.x = -Math.sin(p * Math.PI) * 0.4;
    } else {
      this.gunGroup.rotation.x = this.kick * 1.6;
    }
    this.vmGroup.position.set(tx, ty, tz + this.kick);
    this.gunGroup.rotation.z = bobX * 0.6;

    if (this.flashT > 0) {
      this.flashT -= dt;
      const f = Math.max(0, this.flashT / 0.045);
      this.flashSprite.visible = true;
      this.flashSprite.material.opacity = f;
      this.flashSprite.material.rotation = Math.random() * Math.PI;
      const s = 0.25 + Math.random() * 0.12;
      this.flashSprite.scale.set(s, s, 1);
      this.flashLight.intensity = f * 5;
    } else {
      this.flashSprite.visible = false;
      this.flashLight.intensity = 0;
    }
  }
}
