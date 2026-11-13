import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameState } from '../../src/game/state';
import { missionRegistry } from '../../data/index';
import { MissionSelectUI } from '../../src/ui/mission-select';

// Lightweight DOM mock for Vitest Node environment
function setupMockDom() {
  const listeners: Record<string, ((e: any) => void)[]> = {};

  const mockElement = (tag: string): any => {
    const el: any = {
      tagName: tag.toUpperCase(),
      style: {},
      children: [] as any[],
      parentElement: null as any,
      innerHTML: '',
      attributes: {} as Record<string, string>,
      eventListeners: {} as Record<string, ((e: any) => void)[]>,
      appendChild(child: any) {
        el.children.push(child);
        child.parentElement = el;
        return child;
      },
      removeChild(child: any) {
        const idx = el.children.indexOf(child);
        if (idx !== -1) el.children.splice(idx, 1);
        child.parentElement = null;
        return child;
      },
      setAttribute(name: string, val: string) {
        el.attributes[name] = val;
      },
      getAttribute(name: string) {
        return el.attributes[name] || null;
      },
      addEventListener(type: string, handler: (e: any) => void) {
        if (!el.eventListeners[type]) el.eventListeners[type] = [];
        el.eventListeners[type].push(handler);
      },
      querySelectorAll(selector: string) {
        // Simple query selector for test purposes
        if (selector === '.mission-card') {
          return el._findCards ? el._findCards() : [];
        }
        return [];
      },
      querySelector(selector: string) {
        if (selector === '#btn-proceed-spacecraft') {
          return el._btnProceed || null;
        }
        return null;
      },
    };
    return el;
  };

  (globalThis as any).document = {
    createElement: (tag: string) => mockElement(tag),
    body: mockElement('body'),
  };

  (globalThis as any).window = {
    addEventListener: (type: string, handler: (e: any) => void) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    removeEventListener: (type: string, handler: (e: any) => void) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((h) => h !== handler);
      }
    },
    _emitKey: (key: string) => {
      const handlers = listeners['keydown'] || [];
      for (const h of handlers) {
        h({ key, preventDefault: () => {} });
      }
    },
  };
}

describe('Story 001: Mission Selection & State Management', () => {
  beforeEach(() => {
    setupMockDom();
    gameState.reset();
  });

  it('initializes with a valid default mission and scene', () => {
    const state = gameState.getState();
    expect(state.currentScene).toBe('mission_select');
    expect(state.activeMissionId).toBe('apollo_11');
    expect(state.activeSpacecraftId).toBe('apollo_csm_columbia');
  });

  it('selects missions and automatically sets compatible spacecraft', () => {
    expect(gameState.selectMission('curiosity_msl')).toBe(true);
    expect(gameState.getState().activeMissionId).toBe('curiosity_msl');
    expect(gameState.getState().activeSpacecraftId).toBe('curiosity_msl_stack');

    expect(gameState.selectMission('jwst_l2_deployment')).toBe(true);
    expect(gameState.getState().activeMissionId).toBe('jwst_l2_deployment');
    expect(gameState.getState().activeSpacecraftId).toBe('jwst_observatory');

    expect(gameState.selectMission('non_existent_mission')).toBe(false);
  });

  it('returns full active mission details from registry', () => {
    gameState.selectMission('voyager_1_2');
    const mission = gameState.getActiveMission();
    expect(mission).toBeDefined();
    expect(mission?.title).toContain('Voyager');
    expect(mission?.target_body).toBe('interstellar_space');
    expect(mission?.delta_v_budget.minimum_required_kms).toBe(15.2);
  });

  it('notifies subscribers upon scene and mission changes', () => {
    let callCount = 0;
    let lastScene = '';

    const unsubscribe = gameState.subscribe((st) => {
      callCount++;
      lastScene = st.currentScene;
    });

    gameState.setScene('spacecraft_config');
    expect(lastScene).toBe('spacecraft_config');

    gameState.selectMission('hubble_deployment_sts_31');
    expect(callCount).toBe(3); // Initial + setScene + selectMission

    unsubscribe();
    gameState.setScene('flight_simulation');
    expect(callCount).toBe(3); // No further calls after unsubscribe
  });

  it('mounts MissionSelectUI and navigates missions via keyboard', () => {
    let proceedMissionId = '';
    const ui = new MissionSelectUI((mission) => {
      proceedMissionId = mission.id;
    });

    const parent = (globalThis as any).document.createElement('div');
    ui.mount(parent);

    // Initial selected is apollo_11
    expect(gameState.getState().activeMissionId).toBe('apollo_11');

    // Press ArrowDown to select next mission
    (globalThis as any).window._emitKey('ArrowDown');
    expect(gameState.getState().activeMissionId).toBe('voyager_1_2');

    // Press ArrowDown again to select Hubble
    (globalThis as any).window._emitKey('ArrowDown');
    expect(gameState.getState().activeMissionId).toBe('hubble_deployment_sts_31');

    // Press ArrowUp to navigate back
    (globalThis as any).window._emitKey('ArrowUp');
    expect(gameState.getState().activeMissionId).toBe('voyager_1_2');

    // Press Enter to confirm and transition to spacecraft_config
    (globalThis as any).window._emitKey('Enter');
    expect(gameState.getState().currentScene).toBe('spacecraft_config');
    expect(proceedMissionId).toBe('voyager_1_2');

    ui.unmount();
  });
});

