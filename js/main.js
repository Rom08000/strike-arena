import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { World } from './world.js';
import { loadTextures } from './textures.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { BotManager } from './bots.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { FX } from './fx.js';
import { Game } from './game.js';

// ---------- renderer ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaecbe4);
scene.fog = new THREE.Fog(0xc4b896, 70, 260);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
scene.add(camera);

// ---------- post-processing: SSAO + bloom + color grade ----------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVig: { value: 0.32 },
    uSat: { value: 1.1 },
    uContrast: { value: 1.06 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVig, uSat, uContrast;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 d = vUv - 0.5;
      c *= 1.0 - uVig * smoothstep(0.42, 0.95, length(d));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

let composer = null;
function buildComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
  const ssao = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
  ssao.kernelRadius = 10;
  ssao.minDistance = 0.01;
  ssao.maxDistance = 0.6;
  composer.addPass(ssao);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.55, 0.85));
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new OutputPass());
}

// ---------- modules ----------
const loadStatus = document.getElementById('load-status');
const textures = await loadTextures((d, n) => {
  if (loadStatus) loadStatus.textContent = `Chargement des textures… ${d}/${n}`;
});
if (loadStatus) loadStatus.textContent = '';
const world = new World(scene);
world.setTextures(textures);
world.build();
const audio = new AudioEngine();
const hud = new HUD();
const player = new Player(camera, world);
const bots = new BotManager(scene, world);
const fx = new FX(scene, world.textures.flash);
const weapons = new WeaponSystem(camera, scene, world, player, bots, hud, audio, fx);
await weapons.loadModels();
const game = new Game({ hud, audio, weapons, player, bots, world });

weapons.onKill = (bot, head, name) => game.onKill(bot, head, name);
game.onReady = () => { canvas.requestPointerLock(); };

function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

player.hooks.onDamage = (dmg, fromPos) => {
  hud.damageFlash();
  if (fromPos) {
    const a = Math.atan2(-(fromPos.x - player.pos.x), -(fromPos.z - player.pos.z));
    hud.damageFrom(wrapAngle(a - player.yaw));
  }
  audio.hurt();
};
player.hooks.onDeath = () => {
  audio.death();
  game.onPlayerDeath();
};

// ---------- input ----------
const keys = {};
let mouseDX = 0, mouseDY = 0;
let mouseFire = false, mouseAim = false, firePressed = false;
let paused = false;

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  keys[e.code] = true;
  if (game.state === 'playing' && !paused) {
    if (e.code === 'Digit1') weapons.switchSlot(1);
    if (e.code === 'Digit2') weapons.switchSlot(2);
    if (e.code === 'Digit3') weapons.switchSlot(3);
    if (e.code === 'KeyQ') weapons.switchLast();
    if (e.code === 'KeyR') weapons.startReload();
  }
  if (e.code === 'KeyB' && game.state === 'buy') game.ready();
  if (game.state === 'buy' && e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= 5) game.buyByIndex(n - 1);
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    mouseDX += e.movementX;
    mouseDY += e.movementY;
  }
});
document.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) { mouseFire = true; firePressed = true; }
  if (e.button === 2) mouseAim = true;
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseFire = false;
  if (e.button === 2) mouseAim = false;
});
document.addEventListener('wheel', (e) => {
  if (game.state === 'playing' && !paused && document.pointerLockElement === canvas) {
    weapons.cycle(e.deltaY > 0 ? 1 : -1);
  }
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('click', () => {
  if (game.state === 'playing' && !paused && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    paused = false;
    hud.hide('pause');
  } else if (game.state === 'playing' && !paused && game.state !== 'roundEnd') {
    paused = true;
    hud.show('pause');
  }
});
document.addEventListener('pointerlockerror', () => {
  hud.hint('Cliquez dans le jeu pour verrouiller la souris');
});

// ---------- UI buttons ----------
document.getElementById('btn-play').addEventListener('click', () => {
  audio.init();
  audio.ui();
  hud.hide('menu');
  hud.show('hud');
  game.startMatch();
});
document.getElementById('btn-ready').addEventListener('click', () => {
  audio.init();
  game.ready();
});
document.getElementById('btn-resume').addEventListener('click', () => {
  audio.ui();
  canvas.requestPointerLock();
});
document.getElementById('btn-quit').addEventListener('click', () => location.reload());
document.getElementById('btn-restart').addEventListener('click', () => location.reload());

function bindSettings(sensId, volId) {
  const sens = document.getElementById(sensId);
  const vol = document.getElementById(volId);
  sens.addEventListener('input', () => {
    player.sens = parseFloat(sens.value);
    const other = sensId === 'sens' ? document.getElementById('sens2') : document.getElementById('sens');
    if (other) other.value = sens.value;
  });
  vol.addEventListener('input', () => {
    audio.setVolume(parseFloat(vol.value));
    const other = volId === 'vol' ? document.getElementById('vol2') : document.getElementById('vol');
    if (other) other.value = vol.value;
  });
}
bindSettings('sens', 'vol');
bindSettings('sens2', 'vol2');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- main loop ----------
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) dt = 0.0001;

  const input = {
    fwd: !!(keys.KeyW || keys.ArrowUp),
    back: !!(keys.KeyS || keys.ArrowDown),
    left: !!(keys.KeyA || keys.ArrowLeft),
    right: !!(keys.KeyD || keys.ArrowRight),
    sprint: !!(keys.ShiftLeft || keys.ShiftRight),
    jump: !!keys.Space,
    crouch: !!keys.KeyC,
    fire: mouseFire,
    aim: mouseAim,
    firePressed,
    mouseDX,
    mouseDY,
  };

  if (game.state === 'playing' && !paused) {
    player.update(dt, input, audio);
    weapons.update(dt, input);
    bots.update(dt, { player, world, audio, hud, fx, camera });
    game.update(dt);
  } else if (!paused) {
    game.update(dt);
  }
  fx.update(dt);

  mouseDX = 0;
  mouseDY = 0;
  firePressed = false;

  // per-frame HUD
  hud.setHp(player.hp);
  hud.setArmor(player.armor);
  const w = weapons.current;
  if (w && game.state !== 'buy') hud.setAmmo(w.mag, w.reserve, w.def.name);
  if (game.state === 'playing' || game.state === 'roundEnd') {
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const pxPerRad = (window.innerHeight / 2) / Math.tan(fovRad / 2);
    hud.setCrosshairGap(weapons.currentSpread * pxPerRad);
    hud.minimap(player, bots.bots, world.minimapRects);
    if (!paused && document.pointerLockElement !== canvas && game.state === 'playing') {
      hud.hint('Cliquez dans le jeu pour verrouiller la souris');
    } else if (game.state !== 'playing') {
      hud.hint(null);
    } else {
      hud.hint(null);
    }
  }

  if (composer) composer.render();
  else renderer.render(scene, camera);
}

player.update(0.016, { mouseDX: 0, mouseDY: 0 }, null);
buildComposer();
requestAnimationFrame(frame);
