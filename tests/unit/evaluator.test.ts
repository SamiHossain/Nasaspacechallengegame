import { describe, it, expect, beforeEach } from 'vitest';
import { getMission, getSpacecraft } from '../../data/index';
import { gameState } from '../../src/game/state';
import { evaluateMissionOutcome, type MissionEvaluationResult } from '../../src/game/evaluator';
import { MissionOutcomeUI } from '../../src/ui/mission-outcome';

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

describe('Story 004: Mission Outcome & NASA Performance Evaluator', () => {
  let mission: any;
  let spacecraft: any;

  beforeEach(() => {
    mission = getMission('apollo_11')!;
    spacecraft = getSpacecraft('apollo_csm_columbia')!;
  });

  it('evaluates successful mission outcome when target orbit is reached with fuel reserve', () => {
    const orbitalState = {
      targetOrbitReached: true,
      outOfFuel: false,
      propellantKg: 9205, // 50% fuel remaining
      initialPropellantKg: 18410,
      altitudeKm: 185,
      velocityKms: 7.8,
    };

    const res = evaluateMissionOutcome(mission, spacecraft, orbitalState as any);

    expect(res.verdict).toBe('SUCCESS');
    expect(res.verdictTitle).toBe('MISSION ACCOMPLISHED');
    expect(res.scoreBreakdown.totalScore).toBeGreaterThanOrEqual(700);
    expect(res.scoreBreakdown.objectivesScore).toBe(400); // 300 primary + 100 secondary
    expect(res.scoreBreakdown.fuelEfficiencyScore).toBe(150); // 50% of 300
    expect(res.scoreBreakdown.trajectoryAccuracyScore).toBe(200);
    expect(res.scoreBreakdown.grade).toMatch(/^[AB]/);
  });

  it('evaluates partial success when target reached but fuel depleted', () => {
    const orbitalState = {
      targetOrbitReached: true,
      outOfFuel: true,
      propellantKg: 0,
      initialPropellantKg: 18410,
    };

    const res = evaluateMissionOutcome(mission, spacecraft, orbitalState as any);

    expect(res.verdict).toBe('PARTIAL_SUCCESS');
    expect(res.verdictTitle).toBe('PARTIAL MISSION SUCCESS');
    expect(res.scoreBreakdown.fuelEfficiencyScore).toBe(0);
    expect(res.scoreBreakdown.totalScore).toBeLessThan(800);
  });

  it('evaluates mission failure when target trajectory was not achieved', () => {
    const orbitalState = {
      targetOrbitReached: false,
      outOfFuel: true,
      propellantKg: 0,
      initialPropellantKg: 18410,
    };

    const res = evaluateMissionOutcome(mission, spacecraft, orbitalState as any);

    expect(res.verdict).toBe('MISSION_FAILURE');
    expect(res.verdictTitle).toBe('MISSION FAILED');
    expect(res.scoreBreakdown.totalScore).toBeLessThan(500);
  });

  it('itemizes primary and secondary objectives from mission specification', () => {
    const res = evaluateMissionOutcome(mission, spacecraft, { targetOrbitReached: true, propellantKg: 5000, initialPropellantKg: 10000 } as any);

    expect(res.evaluatedObjectives.length).toBe(mission.primary_objectives.length + mission.secondary_objectives.length);
    const primary = res.evaluatedObjectives.filter((o) => o.isPrimary);
    const secondary = res.evaluatedObjectives.filter((o) => !o.isPrimary);

    expect(primary.length).toBe(mission.primary_objectives.length);
    expect(secondary.length).toBe(mission.secondary_objectives.length);
    expect(primary[0].title).toBe(mission.primary_objectives[0].title);
  });

  it('includes authentic historical benchmark fact and milestones', () => {
    const res = evaluateMissionOutcome(mission, spacecraft);

    expect(res.historicalBenchmarkFact).toContain('Neil Armstrong');
    expect(res.historicalMilestones.length).toBe(mission.historical_milestones.length);
    expect(res.historicalMilestones[0].event).toContain('Launch Complex 39A');
  });
});

describe('Story 004: MissionOutcomeUI Component Integration', () => {
  beforeEach(() => {
    setupMockDom();
    gameState.reset();
  });

  it('mounts to DOM and renders debrief header, score, and objectives checklist', () => {
    const ui = new MissionOutcomeUI();
    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);

    gameState.setScene('mission_outcome');

    const container = root.querySelector('#mission-outcome-screen');
    expect(container).toBeDefined();

    expect(container?.innerHTML).toContain('STAGE 4: AFTER-ACTION FLIGHT DEBRIEF');
    expect(container?.innerHTML).toContain('OVERALL NASA MISSION SCORE');
    expect(container?.innerHTML).toContain('MISSION OBJECTIVES CHECKLIST');
    expect(container?.innerHTML).toContain('HISTORICAL NASA BENCHMARK');

    ui.unmount();
  });

  it('triggers Re-fly Mission button click to restart flight simulation', () => {
    let reflyCalled = false;
    const ui = new MissionOutcomeUI(undefined, () => {
      reflyCalled = true;
    });

    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);
    gameState.setScene('mission_outcome');

    const container = root.querySelector('#mission-outcome-screen');
    const reflyBtn = container?.querySelector('#btn-refly-mission');
    expect(reflyBtn).toBeDefined();

    reflyBtn?.click();
    expect(gameState.getState().currentScene).toBe('flight_simulation');
    expect(reflyCalled).toBe(true);

    ui.unmount();
  });

  it('triggers Select New Mission button click to return to mission selection', () => {
    let newMissionCalled = false;
    const ui = new MissionOutcomeUI(undefined, undefined, () => {
      newMissionCalled = true;
    });

    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);
    gameState.setScene('mission_outcome');

    const container = root.querySelector('#mission-outcome-screen');
    const newMissionBtn = container?.querySelector('#btn-select-new-mission');
    expect(newMissionBtn).toBeDefined();

    newMissionBtn?.click();
    expect(gameState.getState().currentScene).toBe('mission_select');
    expect(newMissionCalled).toBe(true);

    ui.unmount();
  });

  it('handles keyboard shortcuts: R for refly, Enter/Escape for new mission', () => {
    let reflyCalled = false;
    let newMissionCalled = false;
    const ui = new MissionOutcomeUI(
      undefined,
      () => {
        reflyCalled = true;
      },
      () => {
        newMissionCalled = true;
      }
    );

    const root = (globalThis as any).document.createElement('div');
    ui.mount(root);
    gameState.setScene('mission_outcome');

    // Press 'R' -> re-fly
    (globalThis as any).window._emitKey('R');
    expect(gameState.getState().currentScene).toBe('flight_simulation');
    expect(reflyCalled).toBe(true);

    // Return to outcome
    gameState.setScene('mission_outcome');

    // Press 'Enter' -> new mission
    (globalThis as any).window._emitKey('Enter');
    expect(gameState.getState().currentScene).toBe('mission_select');
    expect(newMissionCalled).toBe(true);

    ui.unmount();
  });
});
