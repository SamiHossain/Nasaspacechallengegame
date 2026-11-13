/**
 * NASA Space Mission Design & Simulation Game
 * Mission Selection Screen UI Component
 */

import { missionRegistry, type MissionDTO } from '../../data/index';
import { gameState, type GameState } from '../game/state';

export class MissionSelectUI {
  private container: HTMLElement | null = null;
  private unsubscribeState: (() => void) | null = null;
  private missionIds: string[] = [];
  private selectedIndex = 0;
  private onProceedCallback?: (mission: MissionDTO) => void;

  constructor(onProceed?: (mission: MissionDTO) => void) {
    this.onProceedCallback = onProceed;
    this.missionIds = Object.keys(missionRegistry);
  }

  public mount(parent: HTMLElement): void {
    if (this.container) {
      this.unmount();
    }

    this.container = document.createElement('div');
    this.container.id = 'mission-select-screen';
    this.applyContainerStyles(this.container);

    parent.appendChild(this.container);

    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.currentScene === 'mission_select') {
        this.show();
        this.render();
      } else {
        this.hide();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public unmount(): void {
    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.container = null;
    }
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  public render(): void {
    if (!this.container) return;

    const activeMission = gameState.getActiveMission() || missionRegistry[this.missionIds[0]];
    const activeId = activeMission ? activeMission.id : this.missionIds[0];
    this.selectedIndex = Math.max(0, this.missionIds.indexOf(activeId));

    this.container.innerHTML = `
      <div style="width: 100%; max-width: 1300px; height: 90vh; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box;">
        <!-- Header -->
        <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px;">
          <div>
            <div style="font-size: 11px; letter-spacing: 2px; color: #00e5ff; font-weight: bold; text-transform: uppercase;">NASA Space Apps Challenge</div>
            <h1 style="margin: 0; font-size: 26px; color: #ffffff; letter-spacing: 1px; font-weight: 700;">FLIGHT OPERATIONS: MISSION SELECTION</h1>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span style="background: rgba(11,61,145,0.4); border: 1px solid #0b3d91; color: #93c5fd; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace;">
              DATA REGISTRY: 5 MISSIONS
            </span>
            <span style="background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #34d399; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace;">
              SYSTEM: READY
            </span>
          </div>
        </header>

        <!-- Main Workspace (Split Grid) -->
        <div style="display: grid; grid-template-columns: 460px 1fr; gap: 20px; flex: 1; min-height: 0;">
          <!-- Left Column: Mission Directory -->
          <div style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 6px;" class="custom-scroll" id="mission-cards-list">
            ${this.missionIds
              .map((id, index) => {
                const mission = missionRegistry[id];
                const isSelected = mission.id === activeId;
                return this.renderMissionCard(mission, isSelected, index);
              })
              .join('')}
          </div>

          <!-- Right Column: Mission Briefing & Telemetry -->
          <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;" class="custom-scroll">
            ${this.renderMissionDetail(activeMission)}
          </div>
        </div>

        <!-- Footer Bar -->
        <footer style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 10px; font-size: 12px; color: #64748b; font-family: monospace;">
          <div>[↑/↓] Navigate Missions &nbsp;|&nbsp; [ENTER] Select Mission &nbsp;|&nbsp; Decoupled NASA Flight Engine</div>
          <div>All specifications calibrated from historical NASA flight data</div>
        </footer>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderMissionCard(mission: MissionDTO, isSelected: boolean, index: number): string {
    const border = isSelected ? '2px solid #00e5ff' : '1px solid #1e293b';
    const bg = isSelected ? 'linear-gradient(135deg, rgba(11,61,145,0.3) 0%, rgba(13,19,31,0.95) 100%)' : '#0d131f';
    const glow = isSelected ? 'box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);' : '';

    const programColors: Record<string, string> = {
      Apollo: '#f59e0b',
      Voyager: '#38bdf8',
      'Space Shuttle': '#ec4899',
      'Next Generation Space Telescope': '#a855f7',
      'Mars Exploration Program': '#ef4444',
    };

    const badgeColor = programColors[mission.program] || '#60a5fa';

    return `
      <div 
        data-mission-id="${mission.id}" 
        data-index="${index}"
        class="mission-card"
        style="background: ${bg}; border: ${border}; border-radius: 6px; padding: 14px; cursor: pointer; transition: all 0.15s ease; ${glow} user-select: none;"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 10px; font-weight: bold; color: ${badgeColor}; text-transform: uppercase; letter-spacing: 1px;">
            ${mission.program}
          </span>
          <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">
            ${mission.launch_date.substring(0, 4)}
          </span>
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">
          ${mission.title}
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="background: #1e293b; color: #cbd5e1; font-size: 11px; padding: 2px 8px; border-radius: 3px; font-family: monospace;">
            Target: ${mission.target_body.toUpperCase()}
          </span>
          <span style="background: rgba(0, 229, 255, 0.15); color: #00e5ff; font-size: 11px; padding: 2px 8px; border-radius: 3px; font-family: monospace;">
            Δv: ${mission.delta_v_budget.minimum_required_kms.toFixed(2)} km/s
          </span>
        </div>
      </div>
    `;
  }

  private renderMissionDetail(mission: MissionDTO): string {
    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-size: 12px; color: #00e5ff; font-family: monospace; letter-spacing: 1.5px;">MISSION BRIEFING CODE: ${mission.code}</div>
            <h2 style="margin: 4px 0 0 0; font-size: 24px; color: #ffffff;">${mission.title}</h2>
          </div>
          <span style="background: #0b3d91; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
            ${mission.agency}
          </span>
        </div>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin: 10px 0 0 0;">
          ${mission.description}
        </p>
      </div>

      <!-- Quick Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: rgba(15,23,42,0.6); padding: 12px; border-radius: 6px; border: 1px solid #1e293b;">
        <div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">ORIGIN</div>
          <div style="font-size: 15px; font-weight: bold; color: #e2e8f0; text-transform: uppercase;">${mission.origin_body}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">DESTINATION</div>
          <div style="font-size: 15px; font-weight: bold; color: #38bdf8; text-transform: uppercase;">${mission.target_body}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">LAUNCH VEHICLE</div>
          <div style="font-size: 14px; font-weight: bold; color: #e2e8f0; text-transform: uppercase;">${mission.launch_vehicle_id.replace(/_/g, ' ')}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">MINIMUM Δv</div>
          <div style="font-size: 16px; font-weight: bold; color: #00e5ff; font-family: monospace;">${mission.delta_v_budget.minimum_required_kms.toFixed(2)} km/s</div>
        </div>
      </div>

      <!-- Primary Objectives -->
      <div>
        <h3 style="font-size: 14px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 8px 0;">Primary Flight Objectives</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${mission.primary_objectives
            .map(
              (obj, i) => `
            <div style="background: #111827; border-left: 3px solid #00e5ff; padding: 10px; border-radius: 0 4px 4px 0;">
              <div style="font-size: 13px; font-weight: bold; color: #ffffff;">${i + 1}. ${obj.title}</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${obj.description}</div>
              ${
                obj.target_value !== undefined && obj.unit
                  ? `<span style="display: inline-block; margin-top: 4px; font-size: 11px; color: #38bdf8; font-family: monospace;">Requirement: ${obj.target_value} ${obj.unit}</span>`
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Flight Phases Overview -->
      <div>
        <h3 style="font-size: 14px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 8px 0;">Flight Trajectory Phases</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
          ${mission.flight_phases
            .map(
              (phase) => `
            <div style="background: #111827; border: 1px solid #1e293b; padding: 8px 10px; border-radius: 4px;">
              <div style="font-size: 11px; color: #64748b; font-family: monospace;">STAGE ${phase.phase_number} (${phase.duration_days}d)</div>
              <div style="font-size: 12px; font-weight: bold; color: #e2e8f0; margin: 2px 0;">${phase.phase_name}</div>
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace;">Req: ${phase.required_delta_v_kms.toFixed(2)} km/s</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Action Button Area -->
      <div style="margin-top: auto; padding-top: 14px; border-top: 1px solid #1e293b; display: flex; justify-content: flex-end;">
        <button 
          id="btn-proceed-spacecraft"
          style="background: #00e5ff; color: #080b11; border: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 6px; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; transition: all 0.15s ease; box-shadow: 0 0 15px rgba(0, 229, 255, 0.4);"
        >
          Configure Spacecraft &rarr;
        </button>
      </div>
    `;
  }

  private applyContainerStyles(el: HTMLElement): void {
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.backgroundColor = '#080b11';
    el.style.color = '#ffffff';
    el.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    el.style.display = 'flex';
    el.style.justifyContent = 'center';
    el.style.alignItems = 'center';
    el.style.padding = '20px';
    el.style.zIndex = '100';
    el.style.boxSizing = 'border-box';
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Card click selection
    const cards = this.container.querySelectorAll<HTMLElement>('.mission-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const missionId = card.getAttribute('data-mission-id');
        if (missionId) {
          gameState.selectMission(missionId);
        }
      });
    });

    // Action button
    const proceedBtn = this.container.querySelector<HTMLButtonElement>('#btn-proceed-spacecraft');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        const activeMission = gameState.getActiveMission();
        if (activeMission) {
          if (this.onProceedCallback) {
            this.onProceedCallback(activeMission);
          }
          gameState.setScene('spacecraft_config');
        }
      });

      proceedBtn.addEventListener('mouseenter', () => {
        proceedBtn.style.background = '#38bdf8';
        proceedBtn.style.transform = 'translateY(-1px)';
      });
      proceedBtn.addEventListener('mouseleave', () => {
        proceedBtn.style.background = '#00e5ff';
        proceedBtn.style.transform = 'none';
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (gameState.getState().currentScene !== 'mission_select') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.missionIds.length;
      gameState.selectMission(this.missionIds[this.selectedIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.missionIds.length) % this.missionIds.length;
      gameState.selectMission(this.missionIds[this.selectedIndex]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeMission = gameState.getActiveMission();
      if (activeMission) {
        if (this.onProceedCallback) {
          this.onProceedCallback(activeMission);
        }
        gameState.setScene('spacecraft_config');
      }
    }
  };
}

