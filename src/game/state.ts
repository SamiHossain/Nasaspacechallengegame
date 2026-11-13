/**
 * NASA Space Mission Design & Simulation Game
 * Central Application & Simulation State
 */

import { missionRegistry, spacecraftRegistry, type MissionDTO, type SpacecraftDTO } from '../../data/index';

export type AppScene =
  | 'title'
  | 'mission_select'
  | 'spacecraft_config'
  | 'flight_simulation'
  | 'mission_outcome';

export interface GameState {
  currentScene: AppScene;
  activeMissionId: string | null;
  activeSpacecraftId: string | null;
  enabledPayloadNames: string[];
  simulationRunning: boolean;
  timeWarpFactor: number;
}

export type StateListener = (state: Readonly<GameState>) => void;

class StateStore {
  private state: GameState = {
    currentScene: 'mission_select',
    activeMissionId: 'apollo_11',
    activeSpacecraftId: 'apollo_csm_columbia',
    enabledPayloadNames: [],
    simulationRunning: false,
    timeWarpFactor: 1,
  };

  private listeners = new Set<StateListener>();

  constructor() {
    this.resetPayloadsForActiveSpacecraft();
  }

  public getState(): Readonly<GameState> {
    return {
      ...this.state,
      enabledPayloadNames: [...this.state.enabledPayloadNames],
    };
  }

  public setScene(scene: AppScene): void {
    if (this.state.currentScene !== scene) {
      this.state.currentScene = scene;
      this.notify();
    }
  }

  public selectMission(missionId: string): boolean {
    const mission = missionRegistry[missionId];
    if (!mission) {
      return false;
    }

    this.state.activeMissionId = missionId;
    if (mission.primary_spacecraft_ids && mission.primary_spacecraft_ids.length > 0) {
      this.state.activeSpacecraftId = mission.primary_spacecraft_ids[0];
    } else {
      this.state.activeSpacecraftId = null;
    }

    this.resetPayloadsForActiveSpacecraft();
    this.notify();
    return true;
  }

  public selectSpacecraft(spacecraftId: string): boolean {
    if (!spacecraftRegistry[spacecraftId]) {
      return false;
    }
    this.state.activeSpacecraftId = spacecraftId;
    this.resetPayloadsForActiveSpacecraft();
    this.notify();
    return true;
  }

  public togglePayload(payloadName: string): boolean {
    const idx = this.state.enabledPayloadNames.indexOf(payloadName);
    if (idx >= 0) {
      this.state.enabledPayloadNames.splice(idx, 1);
    } else {
      this.state.enabledPayloadNames.push(payloadName);
    }
    this.notify();
    return true;
  }

  public resetPayloadsForActiveSpacecraft(): void {
    const craft = this.getActiveSpacecraft();
    if (craft && craft.scientific_payloads) {
      this.state.enabledPayloadNames = craft.scientific_payloads.map((p) => p.name);
    } else {
      this.state.enabledPayloadNames = [];
    }
  }

  public getActiveMission(): MissionDTO | null {
    if (!this.state.activeMissionId) return null;
    return missionRegistry[this.state.activeMissionId] || null;
  }

  public getActiveSpacecraft(): SpacecraftDTO | null {
    if (!this.state.activeSpacecraftId) return null;
    return spacecraftRegistry[this.state.activeSpacecraftId] || null;
  }

  public getCompatibleSpacecraftIds(): string[] {
    const mission = this.getActiveMission();
    if (!mission) return [];
    const list = [...mission.primary_spacecraft_ids];
    if (mission.launch_vehicle_id && !list.includes(mission.launch_vehicle_id)) {
      list.push(mission.launch_vehicle_id);
    }
    return list;
  }

  public setTimeWarp(factor: number): void {
    this.state.timeWarpFactor = Math.max(1, factor);
    this.notify();
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public reset(): void {
    this.state = {
      currentScene: 'mission_select',
      activeMissionId: 'apollo_11',
      activeSpacecraftId: 'apollo_csm_columbia',
      enabledPayloadNames: [],
      simulationRunning: false,
      timeWarpFactor: 1,
    };
    this.resetPayloadsForActiveSpacecraft();
    this.notify();
  }

  private notify(): void {
    const readonlyState = this.getState();
    for (const listener of this.listeners) {
      listener(readonlyState);
    }
  }
}

export const gameState = new StateStore();
