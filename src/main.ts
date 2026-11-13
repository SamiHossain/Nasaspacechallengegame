// The page: screen, input, sound, scenes and the loop, drawn with three.js. The rules are in
// game/rules.ts; what the checks drive is in hook.ts. three.js draws the field in 3D; the
// words sit in a plain HTML layer over the canvas.

import * as THREE from 'three';
import config from '../data/config.json';
import { FIELD, STEP, makeRng, newState, update, type State, type Tuning } from './game/rules';
import { audioContext, clock, install, manual, params, seedFrom } from './hook';
import { gameState } from './game/state';
import { MissionSelectUI } from './ui/mission-select';
import { SpacecraftConfigUI } from './ui/spacecraft-config';
import { OrbitalSimulation } from './sim/orbital-mechanics';
import { FlightView } from './sim/flight-view';
import { TelemetryHUD } from './ui/telemetry-hud';
import { MissionOutcomeUI } from './ui/mission-outcome';

// ---- Values: data/config.json holds every tuning value ----------------------------------
const tuning: Tuning = { speed: config.speed.value };
const W = FIELD.w, H = FIELD.h;
const FONT = 'sans-serif';
const TITLE = document.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // shown as HTML below
const CONTROLS = ['Arrows: move', 'P: pause', 'M: mute'];

// ---- Screen: a 3D view of the field, and an HTML layer for the words ---------------------
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(devicePixelRatio || 1);
const view = new THREE.Scene();
view.background = new THREE.Color('#000');
const camera = new THREE.PerspectiveCamera(40, W / H, 1, 2000);
camera.position.set(W / 2, 230, H / 2 + 220);
camera.lookAt(W / 2, 0, H / 2);
view.add(new THREE.HemisphereLight('#ffffff', '#223344', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 2);
sun.position.set(W / 4, 300, H);
view.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: '#1b2233' }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(W / 2, 0, H / 2);
view.add(floor);
const S = FIELD.size;
const player = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), new THREE.MeshStandardMaterial({ color: '#44ccff' }));
view.add(player);

const words = document.createElement('div');
words.style.cssText = `position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:0.4em;color:#fff;font:20px ${FONT};pointer-events:none;text-align:center`;
document.body.appendChild(words);
let shown = '';
function say(html: string): void { if (html !== shown) { words.innerHTML = html; shown = html; } } // only on change

function fit(): void { // fills the window at any size and pixel ratio
  const k = Math.min(innerWidth / W, innerHeight / H);
  renderer.setSize(Math.round(W * k), Math.round(H * k));
  canvas.style.marginTop = `${Math.max(0, Math.floor((innerHeight - H * k) / 2))}px`;
  if (scene) scenes[scene].draw(); // a page that draws only on change must draw again here
}

// ---- Input: keys by position (event.code), OS key repeat ignored ------------------------
const down = new Set<string>(), hit = new Set<string>();
const pressed = (code: string): boolean => hit.has(code); // true for one step after the key goes down
addEventListener('keydown', e => {
  startAudio();
  if (!e.repeat) { down.add(e.code); hit.add(e.code); }
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => down.delete(e.code));
addEventListener('pointerup', () => startAudio()); // a touch's pointerdown does not count as a gesture
addEventListener('blur', () => down.clear());

// ---- Sound: started on the first gesture, scheduled on the audio clock, mute on M --------
let audio: { ac: AudioContext; out: GainNode } | null = null, muted = false;
function startAudio(): void {
  if (!audio) {
    const ac = audioContext();
    const out = ac.createGain(); out.gain.value = muted ? 0 : config.volume.value;
    out.connect(ac.destination); audio = { ac, out };
  }
  if (audio.ac.state === 'suspended') void audio.ac.resume();
}
function setMuted(m: boolean): void { muted = m; if (audio) audio.out.gain.value = m ? 0 : config.volume.value; }
function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3): void {
  if (!audio || muted) return;
  const t = audio.ac.currentTime, o = audio.ac.createOscillator(), g = audio.ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.out); o.start(t); o.stop(t + dur);
}

// ---- Scenes ---------------------------------------------------------------------------
type Scene = { update(dt: number): void; draw(): void };
let scene = '', state: State = newState(), rng = makeRng(seedFrom(config.seed));
function reset(): void {
  rng = makeRng(seedFrom(config.seed)); // every gameplay random call reads rng(), never Math.random
  state = newState();
}
function render(): void { // the field's x and y are three.js's x and z
  player.position.set(state.x + S / 2, S / 2, state.y + S / 2);
  player.visible = scene === 'play' || scene === 'pause';
  floor.visible = scene === 'play' || scene === 'pause';
  renderer.render(view, camera);
}
const scenes: Record<string, Scene> = {
  title: {
    update() {
      if (pressed('Enter') || pressed('Space')) {
        reset();
        tone(440, 0.1);
        if (params.get('seed') || asked === 'play') {
          scene = 'play';
        } else {
          scene = 'mission_select';
          gameState.setScene('mission_select');
        }
      }
    },
    draw() {
      say(`<div style="font-size:34px;font-weight:700;color:#00e5ff;letter-spacing:1px">${TITLE}</div><div style="color:#94a3b8;margin-top:6px;font-size:16px">NASA Space Apps Challenge</div><div style="margin-top:20px;font-size:18px;color:#e2e8f0;background:rgba(11,61,145,0.4);border:1px solid #0b3d91;padding:8px 18px;border-radius:4px">Press ENTER to Begin Mission Selection</div>`);
      render();
    },
  },
  mission_select: {
    update() {
      if (gameState.getState().currentScene !== 'mission_select') {
        scene = gameState.getState().currentScene;
      }
    },
    draw() {
      say('');
      renderer.render(view, camera);
    },
  },
  spacecraft_config: {
    update() {
      if (gameState.getState().currentScene !== 'spacecraft_config') {
        scene = gameState.getState().currentScene;
      }
    },
    draw() {
      say('');
      renderer.render(view, camera);
    },
  },
  flight_simulation: {
    update(dt) {
      if (gameState.getState().currentScene !== 'flight_simulation') {
        scene = gameState.getState().currentScene;
        return;
      }
      if (!orbitalSim) {
        initFlightSimulation();
      }
      orbitalSim?.step(dt);
      telemetryHUD.update();
    },
    draw() {
      say('');
      if (flightView) {
        flightView.render(STEP);
      } else {
        renderer.render(view, camera);
      }
    },
  },
  mission_outcome: {
    update() {
      if (gameState.getState().currentScene !== 'mission_outcome') {
        scene = gameState.getState().currentScene;
      }
    },
    draw() {
      say('');
      renderer.render(view, camera);
    },
  },
  play: {
    update(dt) {
      if (pressed('KeyP') || pressed('Escape')) { scene = 'pause'; return; }
      const dx = (down.has('ArrowRight') ? 1 : 0) - (down.has('ArrowLeft') ? 1 : 0);
      const dy = (down.has('ArrowDown') ? 1 : 0) - (down.has('ArrowUp') ? 1 : 0);
      update(state, { dx, dy }, tuning, dt);
    },
    draw() {
      say(`<div style="position:fixed;left:12px;top:8px">${state.score}</div>`);
      render();
    },
  },
  pause: {
    update() { if (pressed('KeyP') || pressed('Escape')) scene = 'play'; },
    draw() { say('<div style="font-size:30px">Paused</div>'); render(); },
  },
};

// ---- Loop: three.js's animation loop and Timer, fixed step, frame time clamped ------------
function step(): void {
  if (pressed('KeyM')) setMuted(!muted);
  scenes[scene].update(STEP);
  hit.clear();
}
const timer = new THREE.Timer(); // time comes from hook.ts's clock, so a check can inject one
timer.connect(document); // a hidden tab's time is skipped, not run all at once
let last = clock.now(), acc = 0;
function tick(): void {
  last = clock.now();
  timer.update(last * 1000);
  acc += Math.min(timer.getDelta(), 0.25); // a stall never fast-forwards the game
  while (acc >= STEP) { step(); acc -= STEP; }
  scenes[scene].draw();
}
// A headless browser on a time budget runs timers but almost no animation frames, so a
// screenshot after its wait would show the first frame. A timer ticks when no frame has come
// for 100 ms on a visible page; a hidden tab stays paused.
function fallback(): void { if (document.visibilityState === 'visible' && clock.now() - last > 0.1) tick(); }

// Flight Simulation & Orbital State
let orbitalSim: OrbitalSimulation | null = null;
let flightView: FlightView | null = null;

function initFlightSimulation(): void {
  const mission = gameState.getActiveMission();
  const craft = gameState.getActiveSpacecraft();
  if (mission && craft) {
    orbitalSim = new OrbitalSimulation(mission, craft);
    telemetryHUD.setSimulation(orbitalSim);
    if (!flightView) {
      flightView = new FlightView(view, camera, renderer, orbitalSim);
    } else {
      flightView.setSimulation(orbitalSim);
    }
  }
}

const telemetryHUD = new TelemetryHUD(
  undefined,
  () => {
    tone(700, 0.15);
  },
  () => {
    tone(880, 0.08, 'sawtooth');
    flightView?.updateTrajectoryGeometry();
  }
);
telemetryHUD.mount(document.body);

install({
  get scene() { return scene; },
  get state() { return state; },
  get orbit() { return orbitalSim?.getState(); },
  burn(dv: number, dir: 'prograde' | 'retrograde' = 'prograde') {
    orbitalSim?.applyManeuverBurn(dv, dir);
    flightView?.updateTrajectoryGeometry();
    telemetryHUD.update();
  },
  press(code) { hit.add(code); },
  hold(code, on) { if (on) down.add(code); else down.delete(code); },
  step(n = 1, draw = true) { for (let i = 0; i < n; i++) step(); if (draw) scenes[scene].draw(); },
});

// Initialize UI
const missionSelectUI = new MissionSelectUI((mission) => {
  tone(550, 0.1);
});
missionSelectUI.mount(document.body);

const spacecraftConfigUI = new SpacecraftConfigUI((craft, mission) => {
  tone(650, 0.1);
  initFlightSimulation();
});
spacecraftConfigUI.mount(document.body);

const missionOutcomeUI = new MissionOutcomeUI(
  () => orbitalSim,
  () => {
    tone(520, 0.1);
    initFlightSimulation();
  },
  () => {
    tone(440, 0.1);
  }
);
missionOutcomeUI.mount(document.body);

reset();
const asked = params.get('scene');
scene = asked && asked in scenes ? asked : 'title';
if (scene === 'flight_simulation' || scene === 'mission_outcome') {
  initFlightSimulation();
}
gameState.setScene(scene === 'title' ? 'title' : (scene as any));
addEventListener('resize', fit); fit();
if (manual) scenes[scene].draw(); // ?manual=1: no loop; only window.game.step() moves the game
else { timer.update(clock.now() * 1000); renderer.setAnimationLoop(tick); setInterval(fallback, 50); }
