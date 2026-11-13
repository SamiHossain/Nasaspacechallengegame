import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateVisVivaVelocity,
  calculateOrbitalPeriod,
  calculateRadialDistance,
  OrbitalSimulation,
} from '../../src/sim/orbital-mechanics';
import { getMission, getSpacecraft, celestialBodies } from '../../data/index';
import { gameState } from '../../src/game/state';
import { TelemetryHUD } from '../../src/ui/telemetry-hud';

// Lightweight DOM mock for Vitest Node environment
function setupMockDom() {
  const windowListeners: Record<string, ((e: any) => void)[]> = {};

  class MockElement {
    public tagName: string;
    public id: string = '';
    public className: string = '';
    public style: Record<string, string> = {};
    public attributes: Record<string, string> = {};
    public eventListeners: Record<string, ((e: any) => void)[]> = {};
    public parentElement: MockElement | null = null;
    public children: MockElement[] = [];
    private _innerHTML: string = '';

    constructor(tag: string) {
      this.tagName = tag.toUpperCase();
    }

    get innerHTML(): string {
      return this._innerHTML;
    }

    set innerHTML(val: string) {
      this._innerHTML = val;
      this.children = [];
      this.parseMockHtml(val);
    }

    public appendChild(child: MockElement): MockElement {
      this.children.push(child);
      child.parentElement = this;
      return child;
    }

    public removeChild(child: MockElement): MockElement {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentElement = null;
      }
      return child;
    }

    public setAttribute(name: string, val: string): void {
      this.attributes[name] = val;
      if (name === 'id') this.id = val;
      if (name === 'class') this.className = val;
    }

    public getAttribute(name: string): string | null {
      if (name === 'id') return this.id || null;
      if (name === 'class') return this.className || null;
      return this.attributes[name] ?? null;
    }

    public addEventListener(type: string, handler: (e: any) => void): void {
      if (!this.eventListeners[type]) this.eventListeners[type] = [];
      this.eventListeners[type].push(handler);
    }

    public removeEventListener(type: string, handler: (e: any) => void): void {
      if (this.eventListeners[type]) {
        this.eventListeners[type] = this.eventListeners[type].filter((h) => h !== handler);
      }
    }

    public click(): void {
      const handlers = this.eventListeners['click'] || [];
      for (const h of handlers) {
        h({ target: this, preventDefault: () => {} });
      }
    }

    public querySelector(selector: string): MockElement | null {
      const list = this.querySelectorAll(selector);
      return list.length > 0 ? list[0] : null;
    }

    public querySelectorAll(selector: string): MockElement[] {
      const results: MockElement[] = [];
      const match = (el: MockElement): boolean => {
        if (selector.startsWith('#')) {
          return el.id === selector.slice(1);
        }
        if (selector.startsWith('.')) {
          const cls = selector.slice(1);
          return el.className.split(/\s+/).includes(cls);
        }
        return el.tagName.toLowerCase() === selector.toLowerCase();
      };

      for (const child of this.children) {
        if (match(child)) results.push(child);
      }
      return results;
    }

    private parseMockHtml(html: string): void {
      const tagRegex = /<([a-zA-Z0-9_-]+)\b([^>]*)>/g;
      let m: RegExpExecArray | null;

      while ((m = tagRegex.exec(html)) !== null) {
        const tagName = m[1].toLowerCase();
        if (tagName.startsWith('/')) continue;
        const rawAttrs = m[2] || '';

        const child = new MockElement(tagName);

        const idMatch = /\bid=["']([^"']+)["']/i.exec(rawAttrs);
        if (idMatch) child.setAttribute('id', idMatch[1]);

        const classMatch = /\bclass=["']([^"']+)["']/i.exec(rawAttrs);
        if (classMatch) child.setAttribute('class', classMatch[1]);

        const dataRegex = /data-([a-zA-Z0-9_-]+)=["']([^"']+)["']/g;
        let dm: RegExpExecArray | null;
        while ((dm = dataRegex.exec(rawAttrs)) !== null) {
          child.setAttribute(`data-${dm[1]}`, dm[2]);
        }

        this.children.push(child);
        child.parentElement = this;
      }
    }
  }

  (globalThis as any).document = {
    createElement: (tag: string) => new MockElement(tag),
    body: new MockElement('body'),
  };

  (globalThis as any).window = {
    addEventListener: (type: string, handler: (e: any) => void) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(handler);
    },
    removeEventListener: (type: string, handler: (e: any) => void) => {
      if (windowListeners[type]) {
        windowListeners[type] = windowListeners[type].filter((h) => h !== handler);
      }
    },
    _emitKey: (key: string) => {
      const handlers = windowListeners['keydown'] || [];
      for (const h of handlers) {
        h({ key, preventDefault: () => {} });
      }
    },
  };
}

describe('Story 003: Orbital Mechanics Physics & Vis-Viva Calculations', () => {
  const earth = celestialBodies.earth;
  const mu = earth.gravitationalParameterMu; // ~398600.44 km^3/s^2
  const rLEO = earth.radiusKm + 200; // 6371 + 200 = 6571 km

  it('calculates accurate circular orbit velocity using the Vis-Viva equation', () => {
    // For a circular orbit, a = r, so v = sqrt(mu / r)
    const expectedCircVel = Math.sqrt(mu / rLEO); // ~7.784 km/s
    const calcVel = calculateVisVivaVelocity(mu, rLEO, rLEO);

    expect(calcVel).toBeCloseTo(expectedCircVel, 4);
    expect(calcVel).toBeGreaterThan(7.7);
    expect(calcVel).toBeLessThan(7.9);
  });

  it('calculates higher velocity at periapsis and lower velocity at apoapsis for elliptical orbit', () => {
    const rp = rLEO;
    const ra = earth.radiusKm + 35786; // Geostationary transfer orbit (GTO)
    const a = (rp + ra) / 2;

    const vPeriapsis = calculateVisVivaVelocity(mu, rp, a);
    const vApoapsis = calculateVisVivaVelocity(mu, ra, a);

    expect(vPeriapsis).toBeGreaterThan(vApoapsis);
    expect(vPeriapsis).toBeGreaterThan(10.0); // ~10.2 km/s at LEO periapsis
    expect(vApoapsis).toBeLessThan(2.0); // ~1.6 km/s at GEO apoapsis
  });

  it('calculates parabolic escape velocity accurately', () => {
    const vEscape = calculateVisVivaVelocity(mu, rLEO, Infinity);
    const expectedEscape = Math.sqrt((2 * mu) / rLEO); // ~11.01 km/s

    expect(vEscape).toBeCloseTo(expectedEscape, 4);
    expect(vEscape).toBeCloseTo(calculateVisVivaVelocity(mu, rLEO, rLEO) * Math.SQRT2, 4);
  });

  it('calculates orbital period for low Earth orbit (~90 minutes)', () => {
    const periodSec = calculateOrbitalPeriod(mu, rLEO);
    const periodMinutes = periodSec / 60;

    expect(periodMinutes).toBeGreaterThan(88);
    expect(periodMinutes).toBeLessThan(91);
  });

  it('computes radial distance correctly at periapsis and apoapsis', () => {
    const a = 10000;
    const e = 0.2;
    const rPeri = calculateRadialDistance(a, e, 0); // theta = 0
    const rApo = calculateRadialDistance(a, e, Math.PI); // theta = pi

    expect(rPeri).toBeCloseTo(a * (1 - e), 3);
    expect(rApo).toBeCloseTo(a * (1 + e), 3);
  });
});

describe('Story 003: 2-Body Orbital Simulation & Maneuver Execution', () => {
  let mission: any;
  let spacecraft: any;
  let sim: OrbitalSimulation;

  beforeEach(() => {
    mission = getMission('apollo_11')!;
    spacecraft = getSpacecraft('apollo_csm_columbia')!;
    sim = new OrbitalSimulation(mission, spacecraft);
  });

  it('initializes orbital simulation with valid state from Apollo 11 mission', () => {
    const state = sim.getState();
    expect(state.primaryBody.id).toBe('earth');
    expect(state.altitudeKm).toBeGreaterThan(180);
    expect(state.velocityKms).toBeGreaterThan(7.7);
    expect(state.timeWarpFactor).toBe(1);
    expect(state.isPaused).toBe(false);
    expect(state.propellantKg).toBe(spacecraft.stages[0].propellant_mass_kg);
    expect(state.availableDeltaVKms).toBeGreaterThan(2.5);
  });

  it('propagates true anomaly and position along orbit when stepped in time', () => {
    const initialAnomaly = sim.getState().trueAnomalyRad;
    sim.step(60); // step 60 seconds
    const newAnomaly = sim.getState().trueAnomalyRad;

    expect(newAnomaly).toBeGreaterThan(initialAnomaly);
  });

  it('supports time-warp factors up to 1000x', () => {
    sim.setTimeWarp(10);
    expect(sim.getState().timeWarpFactor).toBe(10);

    sim.setTimeWarp(100);
    expect(sim.getState().timeWarpFactor).toBe(100);

    sim.setTimeWarp(1000);
    expect(sim.getState().timeWarpFactor).toBe(1000);
  });

  it('prograde burn raises apoapsis and increases semi-major axis', () => {
    const initialApoapsis = sim.getState().apoapsisAltitudeKm;
    const initialSemiMajor = sim.getState().semiMajorAxisKm;
    const initialPropellant = sim.getState().propellantKg;

    // Apply 0.5 km/s prograde burn
    const success = sim.applyManeuverBurn(0.5, 'prograde');
    expect(success).toBe(true);

    const newState = sim.getState();
    expect(newState.apoapsisAltitudeKm).toBeGreaterThan(initialApoapsis);
    expect(newState.semiMajorAxisKm).toBeGreaterThan(initialSemiMajor);
    expect(newState.propellantKg).toBeLessThan(initialPropellant);
  });

  it('retrograde burn lowers orbital speed and semi-major axis', () => {
    const initialSemiMajor = sim.getState().semiMajorAxisKm;
    const initialPropellant = sim.getState().propellantKg;

    // Apply 0.2 km/s retrograde burn
    const success = sim.applyManeuverBurn(0.2, 'retrograde');
    expect(success).toBe(true);

    const newState = sim.getState();
    expect(newState.semiMajorAxisKm).toBeLessThan(initialSemiMajor);
    expect(newState.propellantKg).toBeLessThan(initialPropellant);
  });

  it('prevents burns and flags outOfFuel when propellant is exhausted', () => {
    // Burn off all propellant
    sim.applyManeuverBurn(5.0, 'prograde');
    expect(sim.getState().outOfFuel).toBe(true);
    expect(sim.getState().availableDeltaVKms).toBe(0);

    // Subsequent burns should fail
    const burnResult = sim.applyManeuverBurn(0.5, 'prograde');
    expect(burnResult).toBe(false);
  });

  it('generates 3D trajectory points for Three.js line rendering', () => {
    const points = sim.generateTrajectoryPoints(128, 100);
    expect(points.length).toBe(129); // 0 to 128
    expect(points[0].x).toBeGreaterThan(0);
    expect(points[0].y).toBe(0); // In X-Z plane
  });

  it('returns valid 3D spacecraft position coordinates', () => {
    const pos = sim.getSpacecraftPosition(100);
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(typeof pos.z).toBe('number');
  });
});

describe('Story 003: TelemetryHUD UI Component', () => {
  let sim: OrbitalSimulation;
  let hud: TelemetryHUD;

  beforeEach(() => {
    setupMockDom();
    gameState.reset();
    const mission = getMission('apollo_11')!;
    const craft = getSpacecraft('apollo_csm_columbia')!;
    sim = new OrbitalSimulation(mission, craft);
    hud = new TelemetryHUD(sim);
  });

  it('mounts to DOM and displays telemetry readouts', () => {
    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);

    gameState.setScene('flight_simulation');

    const container = root.querySelector('#flight-telemetry-hud');
    expect(container).toBeDefined();

    expect(container?.innerHTML).toContain('STAGE 3: ORBITAL FLIGHT SIMULATION');
    expect(container?.innerHTML).toContain('ALTITUDE');
    expect(container?.innerHTML).toContain('ORBITAL VELOCITY');
    expect(container?.innerHTML).toContain('PERIAPSIS');
    expect(container?.innerHTML).toContain('APOAPSIS');
    expect(container?.innerHTML).toContain('PROPELLANT');

    hud.unmount();
  });

  it('triggers prograde burn and updates simulation state upon button click', () => {
    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);
    gameState.setScene('flight_simulation');

    const container = root.querySelector('#flight-telemetry-hud');
    const progradeBtn = container?.querySelector('#btn-burn-prograde');
    expect(progradeBtn).toBeDefined();

    const initialApoapsis = sim.getState().apoapsisAltitudeKm;
    progradeBtn?.click();

    expect(sim.getState().apoapsisAltitudeKm).toBeGreaterThan(initialApoapsis);
    hud.unmount();
  });

  it('triggers retrograde burn upon button click', () => {
    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);
    gameState.setScene('flight_simulation');

    const container = root.querySelector('#flight-telemetry-hud');
    const retrogradeBtn = container?.querySelector('#btn-burn-retrograde');
    expect(retrogradeBtn).toBeDefined();

    const initialSemiMajor = sim.getState().semiMajorAxisKm;
    retrogradeBtn?.click();

    expect(sim.getState().semiMajorAxisKm).toBeLessThan(initialSemiMajor);
    hud.unmount();
  });

  it('adjusts time-warp factor via buttons', () => {
    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);
    gameState.setScene('flight_simulation');

    const container = root.querySelector('#flight-telemetry-hud');
    const warpBtns = container?.querySelectorAll('.timewarp-btn') || [];
    expect(warpBtns.length).toBe(4); // 1x, 10x, 100x, 1000x

    const btn100x = warpBtns.find((b) => b.getAttribute('data-factor') === '100');
    expect(btn100x).toBeDefined();

    btn100x?.click();
    expect(sim.getState().timeWarpFactor).toBe(100);

    hud.unmount();
  });

  it('toggles pause on pause button click', () => {
    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);
    gameState.setScene('flight_simulation');

    const container = root.querySelector('#flight-telemetry-hud');
    const pauseBtn = container?.querySelector('#btn-pause-sim');
    expect(pauseBtn).toBeDefined();

    pauseBtn?.click();
    expect(sim.getState().isPaused).toBe(true);

    pauseBtn?.click();
    expect(sim.getState().isPaused).toBe(false);

    hud.unmount();
  });

  it('transitions to mission_outcome when Complete Flight button is clicked', () => {
    let completed = false;
    hud = new TelemetryHUD(sim, () => {
      completed = true;
    });

    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);
    gameState.setScene('flight_simulation');

    const container = root.querySelector('#flight-telemetry-hud');
    const completeBtn = container?.querySelector('#btn-complete-flight');
    expect(completeBtn).toBeDefined();

    completeBtn?.click();
    expect(gameState.getState().currentScene).toBe('mission_outcome');
    expect(completed).toBe(true);

    hud.unmount();
  });

  it('handles keyboard shortcuts: Space pauses, numbers set warp, Enter completes', () => {
    let completed = false;
    hud = new TelemetryHUD(sim, () => {
      completed = true;
    });

    const root = (globalThis as any).document.createElement('div');
    hud.mount(root);
    gameState.setScene('flight_simulation');

    // Space -> pause
    (globalThis as any).window._emitKey(' ');
    expect(sim.getState().isPaused).toBe(true);

    // 3 -> 100x warp
    (globalThis as any).window._emitKey('3');
    expect(sim.getState().timeWarpFactor).toBe(100);

    // Enter -> complete
    (globalThis as any).window._emitKey('Enter');
    expect(gameState.getState().currentScene).toBe('mission_outcome');
    expect(completed).toBe(true);

    hud.unmount();
  });
});
