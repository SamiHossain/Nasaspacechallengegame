import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameState } from '../../src/game/state';
import {
  calculateMassBreakdown,
  calculateStagingProfile,
  calculateStageDeltaV,
  evaluateFlightReadiness,
  calculateSpacecraftTotalDeltaV,
} from '../../src/game/staging-calculator';
import { getMission, getSpacecraft, missionRegistry, spacecraftRegistry } from '../../data/index';
import { SpacecraftConfigUI } from '../../src/ui/spacecraft-config';

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
    public checked: boolean = false;
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

    public triggerChange(): void {
      this.checked = !this.checked;
      const handlers = this.eventListeners['change'] || [];
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
        if (match(child)) {
          results.push(child);
        }
      }
      return results;
    }

    private parseMockHtml(html: string): void {
      // Find all tags in html
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

        if (/\bchecked\b/i.test(rawAttrs)) {
          child.checked = true;
        }

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

describe('Story 002: Spacecraft & Staging Configuration Logic', () => {
  beforeEach(() => {
    gameState.reset();
  });

  describe('Mass Breakdown Calculations (calculateMassBreakdown)', () => {
    it('calculates mass breakdown for Apollo CSM Columbia with all payloads active', () => {
      const craft = getSpacecraft('apollo_csm_columbia')!;
      expect(craft).toBeDefined();

      const breakdown = calculateMassBreakdown(craft);
      expect(breakdown.baseDryMassKg).toBe(craft.dry_mass_kg);
      expect(breakdown.payloadMassKg).toBe(45); // Lunar Surface Photography Suite & Sextant (45 kg)
      expect(breakdown.totalDryMassKg).toBe(craft.dry_mass_kg + 45);
      expect(breakdown.totalPropellantMassKg).toBe(18410); // SPS stage propellant
      expect(breakdown.totalWetMassKg).toBe(breakdown.totalDryMassKg + breakdown.totalPropellantMassKg);
      expect(breakdown.enabledPayloadNames).toEqual([
        'Lunar Surface Photography Suite & Sextant',
      ]);
    });

    it('reactively updates mass breakdown when payloads are toggled', () => {
      const craft = getSpacecraft('apollo_csm_columbia')!;
      
      // Enabled
      const breakdown = calculateMassBreakdown(craft, ['Lunar Surface Photography Suite & Sextant']);
      expect(breakdown.payloadMassKg).toBe(45);
      expect(breakdown.totalDryMassKg).toBe(craft.dry_mass_kg + 45);
      expect(breakdown.totalWetMassKg).toBe(craft.dry_mass_kg + 45 + breakdown.totalPropellantMassKg);
      expect(breakdown.enabledPayloadNames).toEqual(['Lunar Surface Photography Suite & Sextant']);

      // Disable all payloads
      const emptyBreakdown = calculateMassBreakdown(craft, []);
      expect(emptyBreakdown.payloadMassKg).toBe(0);
      expect(emptyBreakdown.totalDryMassKg).toBe(craft.dry_mass_kg);
      expect(emptyBreakdown.totalWetMassKg).toBe(craft.dry_mass_kg + emptyBreakdown.totalPropellantMassKg);
      expect(emptyBreakdown.enabledPayloadNames).toEqual([]);
    });

    it('handles spacecraft with no scientific payloads gracefully (Saturn V)', () => {
      const saturnV = getSpacecraft('saturn_v')!;
      expect(saturnV).toBeDefined();

      const breakdown = calculateMassBreakdown(saturnV);
      expect(breakdown.payloadMassKg).toBe(0);
      expect(breakdown.baseDryMassKg).toBe(saturnV.dry_mass_kg);
      expect(breakdown.totalDryMassKg).toBe(saturnV.dry_mass_kg);
      expect(breakdown.totalPropellantMassKg).toBeGreaterThan(2000000);
      expect(breakdown.totalWetMassKg).toBe(saturnV.dry_mass_kg + breakdown.totalPropellantMassKg);
    });
  });

  describe('Staging & Tsiolkovsky Delta-V Profiles (calculateStagingProfile & calculateStageDeltaV)', () => {
    it('computes positive delta-V and burn times for multi-stage launch vehicle (Saturn V)', () => {
      const saturnV = getSpacecraft('saturn_v')!;
      const profile = calculateStagingProfile(saturnV);

      expect(profile.length).toBe(3); // S-IC, S-II, S-IVB
      
      // Stage 1: S-IC
      expect(profile[0].stageNumber).toBe(1);
      expect(profile[0].engineName).toContain('F-1');
      expect(profile[0].thrustVacuumKn).toBe(35100);
      expect(profile[0].ispVacuumSec).toBe(304);
      expect(profile[0].burnTimeSec).toBeGreaterThan(100);
      expect(profile[0].deltaVKms).toBeGreaterThan(2.0);
      expect(profile[0].twrInitial).toBeGreaterThan(1.0); // TWR > 1 required for liftoff

      // Stage 2: S-II
      expect(profile[1].stageNumber).toBe(2);
      expect(profile[1].engineName).toContain('J-2');
      expect(profile[1].deltaVKms).toBeGreaterThan(3.0);

      // Stage 3: S-IVB
      expect(profile[2].stageNumber).toBe(3);
      expect(profile[2].deltaVKms).toBeGreaterThan(2.0);
    });

    it('computes individual stage delta-V using calculateStageDeltaV', () => {
      const craft = getSpacecraft('apollo_csm_columbia')!;
      const stage = craft.stages[0];
      const dvWithPayload = calculateStageDeltaV(stage, craft.dry_mass_kg, 45);
      const dvWithoutPayload = calculateStageDeltaV(stage, craft.dry_mass_kg, 0);

      expect(dvWithPayload).toBeGreaterThan(2.0);
      expect(dvWithoutPayload).toBeGreaterThan(dvWithPayload); // Lighter payload = higher delta-v
    });

    it('produces total delta-V matching calculateSpacecraftTotalDeltaV from data/index.ts', () => {
      const craft = getSpacecraft('apollo_csm_columbia')!;
      const payloadMass = 500;
      
      const referenceTotalDeltaVKms = calculateSpacecraftTotalDeltaV(craft, payloadMass);
      const stageProfilesWith500: number = calculateStageDeltaV(craft.stages[0], craft.dry_mass_kg, payloadMass);

      expect(stageProfilesWith500).toBeCloseTo(referenceTotalDeltaVKms, 3);
    });
  });

  describe('Flight Readiness & Delta-V Margin Evaluation (evaluateFlightReadiness)', () => {
    it('evaluates Apollo 11 with Saturn V as GO with positive margin', () => {
      const mission = getMission('apollo_11')!;
      const saturnV = getSpacecraft('saturn_v')!;

      const readiness = evaluateFlightReadiness(saturnV, mission);
      expect(readiness.status).toBe('GO');
      expect(readiness.requiredDeltaVKms).toBe(mission.delta_v_budget.minimum_required_kms);
      expect(readiness.totalDeltaVKms).toBeGreaterThanOrEqual(readiness.requiredDeltaVKms);
      expect(readiness.marginDeltaVKms).toBeGreaterThan(0);
      expect(readiness.marginPercent).toBeGreaterThan(0);
      expect(readiness.statusMessage).toContain('GO FOR FLIGHT');
    });

    it('evaluates spacecraft with insufficient delta-V as NO_GO with negative margin', () => {
      const voyagerMission = getMission('voyager_1_2')!; // Needs 15.2 km/s
      const csm = getSpacecraft('apollo_csm_columbia')!; // Only provides ~2.8 km/s

      const readiness = evaluateFlightReadiness(csm, voyagerMission);
      expect(readiness.status).toBe('NO_GO');
      expect(readiness.marginDeltaVKms).toBeLessThan(0);
      expect(readiness.marginPercent).toBeLessThan(0);
      expect(readiness.statusMessage).toContain('NO-GO');
      expect(readiness.statusMessage).toContain('Deficit');
    });

    it('dynamically increases margin when heavy payloads are disabled', () => {
      const mission = getMission('apollo_11')!;
      const csm = getSpacecraft('apollo_csm_columbia')!;

      const withPayload = evaluateFlightReadiness(csm, mission);
      const withoutPayload = evaluateFlightReadiness(csm, mission, []);

      expect(withoutPayload.totalDeltaVKms).toBeGreaterThan(withPayload.totalDeltaVKms);
      expect(withoutPayload.marginDeltaVKms).toBeGreaterThan(withPayload.marginDeltaVKms);
    });
  });
});

describe('Story 002: SpacecraftConfigUI Component Integration', () => {
  beforeEach(() => {
    setupMockDom();
    gameState.reset();
  });

  it('mounts to DOM, renders vehicle overview and staging tables for Apollo 11', () => {
    let launched = false;
    const ui = new SpacecraftConfigUI(() => {
      launched = true;
    });

    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    // Transition gameState to spacecraft_config
    gameState.setScene('spacecraft_config');

    const container = root.querySelector('#spacecraft-config-screen');
    expect(container).toBeDefined();

    // Check header and mission title
    expect(container?.innerHTML).toContain('STAGE 2: VEHICLE & STAGING CONFIGURATION');
    expect(container?.innerHTML).toContain('Apollo 11');

    // Check mass fractions section
    expect(container?.innerHTML).toContain('TSIOLKOVSKY MASS FRACTIONS');
    expect(container?.innerHTML).toContain('LIFTOFF MASS');

    // Check staging table
    expect(container?.innerHTML).toContain('PROPULSION STAGING PROFILES');
    expect(container?.innerHTML).toContain('TOTAL CALCULATED VACUUM');

    ui.unmount();
  });

  it('renders compatible vehicle tabs and switches vehicle upon click', () => {
    const ui = new SpacecraftConfigUI();
    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    gameState.setScene('spacecraft_config');

    const container = root.querySelector('#spacecraft-config-screen');
    const vehicleTabs = container?.querySelectorAll('.vehicle-tab-btn') || [];
    expect(vehicleTabs.length).toBeGreaterThan(0);

    // Switch to saturn_v
    const saturnTab = vehicleTabs.find((btn) => btn.getAttribute('data-craft-id') === 'saturn_v');
    expect(saturnTab).toBeDefined();

    saturnTab?.click();
    expect(gameState.getState().activeSpacecraftId).toBe('saturn_v');

    ui.unmount();
  });

  it('toggles scientific payloads via checkboxes and updates gameState', () => {
    const ui = new SpacecraftConfigUI();
    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    gameState.setScene('spacecraft_config');

    const container = root.querySelector('#spacecraft-config-screen');
    const checkboxes = container?.querySelectorAll('.payload-checkbox') || [];
    expect(checkboxes.length).toBe(1);

    const firstCheckbox = checkboxes[0];
    const payloadName = firstCheckbox.getAttribute('data-payload-name');
    expect(payloadName).toBe('Lunar Surface Photography Suite & Sextant');
    expect(gameState.getState().enabledPayloadNames).toContain(payloadName);

    // Uncheck payload
    firstCheckbox.triggerChange();
    expect(gameState.getState().enabledPayloadNames).not.toContain(payloadName);

    // Re-check payload
    firstCheckbox.triggerChange();
    expect(gameState.getState().enabledPayloadNames).toContain(payloadName);

    ui.unmount();
  });

  it('transitions to flight_simulation when Launch Mission button is clicked', () => {
    let launchPayload: { craftId: string; missionId: string } | null = null;
    const ui = new SpacecraftConfigUI((craft, mission) => {
      launchPayload = { craftId: craft.id, missionId: mission.id };
    });

    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    gameState.setScene('spacecraft_config');

    const container = root.querySelector('#spacecraft-config-screen');
    const launchBtn = container?.querySelector('#btn-launch-mission');
    expect(launchBtn).toBeDefined();

    launchBtn?.click();

    expect(gameState.getState().currentScene).toBe('flight_simulation');
    expect(launchPayload).toEqual({
      craftId: 'apollo_csm_columbia',
      missionId: 'apollo_11',
    });

    ui.unmount();
  });

  it('navigates via keyboard: Enter launches simulation, Escape returns to mission_select', () => {
    let launchCalled = false;
    const ui = new SpacecraftConfigUI(() => {
      launchCalled = true;
    });

    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    gameState.setScene('spacecraft_config');
    expect(gameState.getState().currentScene).toBe('spacecraft_config');

    // Press Escape -> returns to mission_select
    (globalThis as any).window._emitKey('Escape');
    expect(gameState.getState().currentScene).toBe('mission_select');

    // Return to spacecraft_config
    gameState.setScene('spacecraft_config');

    // Press Enter -> launches to flight_simulation
    (globalThis as any).window._emitKey('Enter');
    expect(gameState.getState().currentScene).toBe('flight_simulation');
    expect(launchCalled).toBe(true);

    ui.unmount();
  });

  it('returns to mission_select when Back button is clicked', () => {
    const ui = new SpacecraftConfigUI();
    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    gameState.setScene('spacecraft_config');

    const container = root.querySelector('#spacecraft-config-screen');
    const backBtn = container?.querySelector('#btn-back-missions');
    expect(backBtn).toBeDefined();

    backBtn?.click();
    expect(gameState.getState().currentScene).toBe('mission_select');

    ui.unmount();
  });
});
