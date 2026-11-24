import * as THREE from 'three';

const NAMES = ['Viper', 'Ghost', 'Reaper', 'Havoc', 'Spectre'];

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export class Bot {
  constructor(scene, world, name, route, spawn) {
    this.scene = scene;
    this.world = world;
    this.name = name;
    this.route = route;
    this.pos = spawn.clone();
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.hp = 100;
    this.armor = 100;
    this.alive = true;
    this.state = 'patrol';
    this.wpIdx = 0;
    this.reaction = 0;
    this.burst = 0;
    this.cool = 0;
    this.fireCd = 0;
    this.strafeDir = 1;
    this.strafeT = 0;
    this.deathT = 0;
    this.walkPhase = 0;
    this.moving = false;
    this._stuck = 0;
    this._lastX = this.pos.x;
    this._lastZ = this.pos.z;
    this._ground = true;
    this._build();
  }

  _build() {
    const g = new THREE.Group();
    const uniform = new THREE.MeshStandardMaterial({ color: 0x6b5d3f, roughness: 0.9 });
    const vest = new THREE.MeshStandardMaterial({ color: 0x33362c, roughness: 0.85 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.95 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc9a077, roughness: 0.7 });
    const helm = new THREE.MeshStandardMaterial({ color: 0x2f332a, roughness: 0.6, metalness: 0.2 });
    const gunM = new THREE.MeshStandardMaterial({ color: 0x1b1d20, metalness: 0.7, roughness: 0.45 });
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    this.legL = add(new THREE.BoxGeometry(0.2, 0.78, 0.24), pants, -0.14, 0.39, 0);
    this.legR = add(new THREE.BoxGeometry(0.2, 0.78, 0.24), pants, 0.14, 0.39, 0);
    add(new THREE.BoxGeometry(0.55, 0.62, 0.34), uniform, 0, 1.08, 0);
    add(new THREE.BoxGeometry(0.6, 0.5, 0.4), vest, 0, 1.12, 0);
    add(new THREE.BoxGeometry(0.5, 0.12, 0.12), uniform, 0.28, 1.32, -0.15);
    this.gun = add(new THREE.BoxGeometry(0.07, 0.07, 0.65), gunM, 0.28, 1.36, -0.45);
    this.head = add(new THREE.BoxGeometry(0.28, 0.28, 0.28), skin, 0, 1.6, 0);
    add(new THREE.BoxGeometry(0.33, 0.15, 0.33), helm, 0, 1.72, 0);

    const hidden = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 });
    this.hitBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.45, 0.45), hidden);
    this.hitBody.position.set(0, 0.85, 0);
    this.hitBody.userData = { bot: this, part: 'body' };
    this.hitHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hidden);
    this.hitHead.position.set(0, 1.62, 0);
    this.hitHead.userData = { bot: this, part: 'head' };
    g.add(this.hitBody);
    g.add(this.hitHead);

    this.group = g;
    this.scene.add(g);
    this.group.position.copy(this.pos);
    g.updateMatrixWorld(true);
  }

  eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
  }

  muzzleWorld() {
    return this.group.localToWorld(new THREE.Vector3(0.28, 1.36, -0.8));
  }

  takeDamage(dmg, isHead, fromPos, fx) {
    if (!this.alive) return { died: false };
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.5);
      this.armor -= absorbed;
      dmg = dmg * 0.5 + (dmg * 0.5 - absorbed);
    }
    this.hp -= dmg;
    if (fx) {
      fx.impact(
        new THREE.Vector3(this.pos.x, this.pos.y + (isHead ? 1.6 : 1.1), this.pos.z),
        null, 'blood'
      );
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathT = 0;
      return { died: true };
    }
    if (fromPos) {
      this.state = 'engage';
      this.reaction = Math.min(this.reaction > 0 ? this.reaction : 0.3, 0.25);
    }
    return { died: false };
  }

  update(dt, ctx) {
    if (!this.alive) {
      this.deathT += dt;
      const t = Math.min(1, this.deathT / 0.3);
      this.group.rotation.x = -t * Math.PI / 2 * 0.92;
      this.group.position.y = this.pos.y + Math.sin(t * Math.PI) * 0.08;
      if (this.deathT > 4.5) this.group.visible = false;
      return;
    }

    const p = ctx.player;
    const dx = p.pos.x - this.pos.x;
    const dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    let seen = false;
    if (p.alive && dist < 65) {
      const diff = Math.abs(wrapAngle(Math.atan2(-dx, -dz) - this.yaw));
      if (diff < 1.9 || dist < 7) {
        if (this.world.losClear(this.eye(), p.eyePos())) seen = true;
      }
    }
    if (seen) {
      if (this.state !== 'engage') {
        this.state = 'engage';
        this.reaction = 0.22 + Math.random() * 0.3;
      }
    } else if (this.state === 'engage' && (!p.alive || dist > 75)) {
      this.state = 'patrol';
    }

    let moveX = 0, moveZ = 0, speed = 0;
    if (this.state === 'engage' && seen && p.alive) {
      this.yaw += Math.max(-6 * dt, Math.min(6 * dt, wrapAngle(Math.atan2(-dx, -dz) - this.yaw)));
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
        this.strafeT = 0.4 + Math.random() * 0.7;
      }
      speed = 2.6;
      moveX = Math.cos(this.yaw) * this.strafeDir;
      moveZ = -Math.sin(this.yaw) * this.strafeDir;
      if (this.reaction > 0) {
        this.reaction -= dt;
      } else {
        if (this.burst <= 0) {
          if (this.cool > 0) this.cool -= dt;
          else {
            this.burst = 3 + ((Math.random() * 4) | 0);
            this.cool = 0.45 + Math.random() * 0.7;
          }
        }
        if (this.burst > 0) {
          this.fireCd -= dt;
          if (this.fireCd <= 0) {
            this._fire(ctx, dist);
            this.burst--;
            this.fireCd = 0.1;
          }
        }
      }
    } else {
      const wp = this.route[this.wpIdx];
      const wdx = wp[0] - this.pos.x;
      const wdz = wp[1] - this.pos.z;
      if (Math.hypot(wdx, wdz) < 1.8) {
        this.wpIdx = (this.wpIdx + 1) % this.route.length;
      } else {
        this.yaw += Math.max(-4.5 * dt, Math.min(4.5 * dt, wrapAngle(Math.atan2(-wdx, -wdz) - this.yaw)));
        speed = 3.4;
        moveX = -Math.sin(this.yaw);
        moveZ = -Math.cos(this.yaw);
      }
    }

    this.moving = speed > 0;
    if (this.state === 'patrol' && this.moving && this._ground && this._stuck > 1.0) {
      this.vel.y = 7.4;
      this._stuck = 0;
    }
    this.vel.x = moveX * speed;
    this.vel.z = moveZ * speed;
    this.vel.y -= 22 * dt;
    const res = this.world.resolveMove(this.pos, this.vel, dt, 0.35, 1.75);
    this._ground = res.onGround;
    if (this.state === 'patrol' && this.moving) {
      const moved = Math.hypot(this.pos.x - this._lastX, this.pos.z - this._lastZ);
      this._stuck += speed * dt - moved;
      if (this._stuck < 0) this._stuck = 0;
    }
    this._lastX = this.pos.x;
    this._lastZ = this.pos.z;
    if (this.moving) this.walkPhase += dt * speed * 2.6;

    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    const sw = this.moving ? Math.sin(this.walkPhase) * 0.45 : 0;
    this.legL.rotation.x = sw;
    this.legR.rotation.x = -sw;
  }

  _fire(ctx, dist) {
    const p = ctx.player;
    const eye = this.eye();
    const dir = p.eyePos().sub(eye).normalize();
    const sp = 0.014 + dist * 0.0011 + (p.hSpeed > 3 ? 0.02 : 0) + (this.moving ? 0.015 : 0);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    dir.addScaledVector(right, gauss() * sp).addScaledVector(up, gauss() * sp).normalize();

    const wallHit = this.world.raycastWorld(eye, dir, 200);
    const end = wallHit ? wallHit.point : eye.clone().addScaledVector(dir, 200);
    const mw = this.muzzleWorld();
    ctx.fx.tracer(mw, end, 0xffb060);
    ctx.fx.botFlash(mw);
    const rel = ctx.camera.worldToLocal(this.pos.clone());
    const pan = Math.max(-1, Math.min(1, rel.x / 18));
    ctx.audio.shot('ak', pan, dist);

    const hitChance = Math.max(0.05, Math.min(0.65, 0.6 - dist * 0.0075 - (p.hSpeed > 3 ? 0.18 : 0)));
    if (p.alive && Math.random() < hitChance) {
      const dmg = (8 + Math.random() * 5) * Math.pow(0.985, dist);
      p.takeDamage(dmg, false, this.pos);
    }
  }
}

export class BotManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.bots = [];
  }

  reset() {
    for (const b of this.bots) this.scene.remove(b.group);
    this.bots = [];
    for (let i = 0; i < 5; i++) {
      const b = new Bot(this.scene, this.world, NAMES[i], this.world.routes[i], this.world.spawnT[i]);
      b.wpIdx = (i * 2) % this.world.routes[i].length;
      this.bots.push(b);
    }
  }

  update(dt, ctx) {
    for (const b of this.bots) b.update(dt, ctx);
  }

  hitMeshes() {
    const arr = [];
    for (const b of this.bots) {
      if (b.alive) {
        arr.push(b.hitBody, b.hitHead);
      }
    }
    return arr;
  }

  aliveCount() {
    return this.bots.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
  }
}
