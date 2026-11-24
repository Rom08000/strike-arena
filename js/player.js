import * as THREE from 'three';

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(0, 0, -45);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.radius = 0.35;
    this.height = 1.75;
    this.eyeH = 1.62;
    this.hp = 100;
    this.armor = 0;
    this.helmet = false;
    this.alive = true;
    this.onGround = true;
    this.sens = 1;
    this.sensScale = 1;
    this.speedMul = 1;
    this.bobPhase = 0;
    this.stepAcc = 0;
    this.hSpeed = 0;
    this.crouching = false;
    this.hooks = { onDamage: () => {}, onDeath: () => {} };
  }

  resetForRound() {
    this.pos.set(0, 0, -45);
    this.vel.set(0, 0, 0);
    this.yaw = Math.PI;
    this.pitch = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.hp = 100;
    this.alive = true;
  }

  resetMatch() {
    this.resetForRound();
    this.armor = 0;
    this.helmet = false;
  }

  eyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeH, this.pos.z);
  }

  addRecoil(p, y) {
    this.recoilPitch += p;
    this.recoilYaw += y;
  }

  takeDamage(dmg, isHead, fromPos) {
    if (!this.alive) return { died: false };
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.5);
      this.armor -= absorbed;
      dmg = dmg * 0.5 + (dmg * 0.5 - absorbed);
    }
    if (isHead && this.helmet) dmg *= 0.7;
    this.hp -= dmg;
    const died = this.hp <= 0;
    if (died) {
      this.hp = 0;
      this.alive = false;
      this.hooks.onDeath();
    }
    this.hooks.onDamage(dmg, fromPos);
    return { died };
  }

  update(dt, input, audio) {
    const s = 0.0022 * this.sens * this.sensScale;
    this.yaw -= input.mouseDX * s;
    this.pitch -= input.mouseDY * s;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
    const rec = Math.min(1, 9 * dt);
    this.recoilPitch += (0 - this.recoilPitch) * rec;
    this.recoilYaw += (0 - this.recoilYaw) * rec;

    this.crouching = !!input.crouch && this.onGround;
    const targetH = this.crouching ? 1.2 : 1.75;
    const targetEye = this.crouching ? 1.1 : 1.62;
    const hl = Math.min(1, 10 * dt);
    this.height += (targetH - this.height) * hl;
    this.eyeH += (targetEye - this.eyeH) * hl;

    const f = (input.fwd ? 1 : 0) - (input.back ? 1 : 0);
    const r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let wx = -sin * f + cos * r;
    let wz = -cos * f - sin * r;
    const wl = Math.hypot(wx, wz);
    if (wl > 0) { wx /= wl; wz /= wl; }
    const sprint = input.sprint && f > 0 && !this.crouching;
    let speed = this.crouching ? 2.0 : sprint ? 6.1 : 4.2;
    speed *= this.speedMul;
    const wishX = wx * speed, wishZ = wz * speed;

    if (this.onGround) {
      if (wl < 0.01) {
        const fr = Math.max(0, 1 - 6.5 * dt);
        this.vel.x *= fr;
        this.vel.z *= fr;
      } else {
        const acc = Math.min(1, 11 * dt);
        this.vel.x += (wishX - this.vel.x) * acc;
        this.vel.z += (wishZ - this.vel.z) * acc;
      }
    } else {
      const acc = Math.min(1, 2.2 * dt);
      this.vel.x += (wishX - this.vel.x) * acc;
      this.vel.z += (wishZ - this.vel.z) * acc;
    }

    if (input.jump && this.onGround) {
      this.vel.y = 7.4;
      this.onGround = false;
    }
    this.vel.y -= 22 * dt;
    if (this.vel.y < -32) this.vel.y = -32;

    const res = this.world.resolveMove(this.pos, this.vel, dt, this.radius, this.height);
    this.onGround = res.onGround;

    this.hSpeed = Math.hypot(this.vel.x, this.vel.z);

    if (this.onGround && this.hSpeed > 1.2) {
      this.stepAcc += this.hSpeed * dt;
      if (this.stepAcc > 2.4) {
        this.stepAcc = 0;
        if (audio) audio.step(sprint);
      }
    }
    this.bobPhase += dt * (2 + this.hSpeed * 1.35);

    const moveAmt = Math.min(1, this.hSpeed / 4);
    const bobY = this.onGround && this.hSpeed > 0.5 ? Math.abs(Math.cos(this.bobPhase)) * 0.045 * moveAmt : 0;
    const bobX = this.onGround && this.hSpeed > 0.5 ? Math.sin(this.bobPhase) * 0.02 * moveAmt : 0;
    this.camera.position.set(
      this.pos.x + bobX * cos,
      this.pos.y + this.eyeH + bobY,
      this.pos.z - bobX * sin
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this.recoilYaw;
    this.camera.rotation.x = this.pitch + this.recoilPitch;
  }
}
