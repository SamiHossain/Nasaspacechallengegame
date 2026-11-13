/**
 * NASA Space Mission Design & Simulation Game
 * Spacecraft & Staging Configuration UI Component
 */

import { spacecraftRegistry, type SpacecraftDTO, type MissionDTO } from '../../data/index';
import { gameState } from '../game/state';
import { evaluateFlightReadiness, type FlightReadinessResult } from '../game/staging-calculator';

export class SpacecraftConfigUI {
  private container: HTMLElement | null = null;
  private unsubscribeState: (() => void) | null = null;
  private onLaunchCallback?: (spacecraft: SpacecraftDTO, mission: MissionDTO) => void;

  constructor(onLaunch?: (spacecraft: SpacecraftDTO, mission: MissionDTO) => void) {
    this.onLaunchCallback = onLaunch;
  }

  public mount(parent: HTMLElement): void {
    if (this.container) {
      this.unmount();
    }

    this.container = document.createElement('div');
    this.container.id = 'spacecraft-config-screen';
    this.applyContainerStyles(this.container);

    parent.appendChild(this.container);

    this.unsubscribeState = gameState.subscribe((state) => {
      if (state.currentScene === 'spacecraft_config') {
        this.show();
        this.render();
      } else {
        this.hide();
      }
    });

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

    const mission = gameState.getActiveMission();
    const spacecraft = gameState.getActiveSpacecraft();

    if (!mission || !spacecraft) {
      this.container.innerHTML = `
        <div style="text-align: center; color: #94a3b8;">
          <h2>No Mission or Spacecraft Selected</h2>
          <button id="btn-back-fallback" style="padding: 8px 16px; background: #00e5ff; border: none; border-radius: 4px; cursor: pointer;">
            Return to Mission Select
          </button>
        </div>
      `;
      const btn = this.container.querySelector('#btn-back-fallback');
      btn?.addEventListener('click', () => gameState.setScene('mission_select'));
      return;
    }

    const enabledPayloads = gameState.getState().enabledPayloadNames;
    const readiness: FlightReadinessResult = evaluateFlightReadiness(spacecraft, mission, enabledPayloads);
    const compatibleCraftIds = gameState.getCompatibleSpacecraftIds();

    const isGo = readiness.status === 'GO';
    const statusBg = isGo ? 'rgba(6, 78, 59, 0.4)' : 'rgba(127, 29, 29, 0.4)';
    const statusBorder = isGo ? '#10b981' : '#ef4444';
    const statusColor = isGo ? '#34d399' : '#f87171';
    const statusLabel = isGo ? 'GO FOR LAUNCH' : 'NO-GO: INSUFFICIENT DELTA-V';

    this.container.innerHTML = `
      <div style="width: 100%; max-width: 1300px; height: 90vh; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;">
        <!-- Header -->
        <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <button id="btn-back-missions" style="background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
              &larr; Missions
            </button>
            <div>
              <div style="font-size: 11px; letter-spacing: 2px; color: #00e5ff; font-weight: bold; text-transform: uppercase;">
                STAGE 2: VEHICLE & STAGING CONFIGURATION
              </div>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; letter-spacing: 0.5px;">
                ${mission.title}
              </h1>
            </div>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span style="background: rgba(11,61,145,0.4); border: 1px solid #0b3d91; color: #93c5fd; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace;">
              REQ &Delta;v: ${readiness.requiredDeltaVKms.toFixed(2)} km/s
            </span>
            <span style="background: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusColor}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace; font-weight: bold;">
              ${statusLabel}
            </span>
          </div>
        </header>

        <!-- Spacecraft Selector Tabs (if multi-vehicle mission) -->
        <div style="display: flex; gap: 8px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
          <span style="font-size: 12px; color: #64748b; font-family: monospace; display: flex; align-items: center; margin-right: 6px;">
            COMPATIBLE VEHICLES:
          </span>
          ${compatibleCraftIds
            .map((craftId) => {
              const craft = spacecraftRegistry[craftId];
              if (!craft) return '';
              const isSelected = craft.id === spacecraft.id;
              const tabBorder = isSelected ? '1px solid #00e5ff' : '1px solid #1e293b';
              const tabBg = isSelected ? '#0b3d91' : '#0d131f';
              const tabColor = isSelected ? '#ffffff' : '#94a3b8';
              return `
                <button 
                  class="vehicle-tab-btn" 
                  data-craft-id="${craft.id}"
                  style="background: ${tabBg}; border: ${tabBorder}; color: ${tabColor}; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s ease;"
                >
                  ${craft.name}
                </button>
              `;
            })
            .join('')}
        </div>

        <!-- Main Content (2-Column Grid) -->
        <div style="display: grid; grid-template-columns: 420px 1fr; gap: 18px; flex: 1; min-height: 0;">
          <!-- Left Column: Spacecraft Specifications & Payload Bay -->
          <div style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto;" class="custom-scroll">
            <!-- Vehicle Specs Card -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 14px;">
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase;">VEHICLE OVERVIEW</div>
              <h3 style="margin: 4px 0 8px 0; font-size: 18px; color: #ffffff;">${spacecraft.name}</h3>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.4; margin: 0 0 12px 0;">${spacecraft.description}</p>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                <div style="background: #111827; padding: 6px 8px; border-radius: 4px;">
                  <span style="color: #64748b;">PROGRAM:</span> <strong style="color: #e2e8f0;">${spacecraft.program}</strong>
                </div>
                <div style="background: #111827; padding: 6px 8px; border-radius: 4px;">
                  <span style="color: #64748b;">AGENCY:</span> <strong style="color: #e2e8f0;">${spacecraft.agency}</strong>
                </div>
                <div style="background: #111827; padding: 6px 8px; border-radius: 4px;">
                  <span style="color: #64748b;">CREW:</span> <strong style="color: #e2e8f0;">${spacecraft.crew_capacity > 0 ? `${spacecraft.crew_capacity} Astronauts` : 'Uncrewed / Robotic'}</strong>
                </div>
                <div style="background: #111827; padding: 6px 8px; border-radius: 4px;">
                  <span style="color: #64748b;">POWER:</span> <strong style="color: #e2e8f0;">${spacecraft.power_system.type.toUpperCase()} (${spacecraft.power_system.output_watts} W)</strong>
                </div>
                <div style="background: #111827; padding: 6px 8px; border-radius: 4px;">
                  <span style="color: #64748b;">HEIGHT:</span> <strong style="color: #e2e8f0;">${spacecraft.dimensions.height_m} m</strong>
                </div>
                <div style="background: #111827; padding: 6px 8px; border-radius: 4px;">
                  <span style="color: #64748b;">DIAMETER:</span> <strong style="color: #e2e8f0;">${spacecraft.dimensions.diameter_m} m</strong>
                </div>
              </div>
            </div>

            <!-- Scientific Payloads & Equipment -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 14px; flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase;">
                  SCIENTIFIC PAYLOAD CONFIGURATION
                </div>
                <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">
                  Active: ${readiness.massBreakdown.payloadMassKg.toFixed(1)} kg
                </span>
              </div>
              
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${
                  spacecraft.scientific_payloads && spacecraft.scientific_payloads.length > 0
                    ? spacecraft.scientific_payloads
                        .map((payload) => {
                          const isChecked = enabledPayloads.includes(payload.name);
                          return `
                        <label style="display: flex; align-items: flex-start; gap: 10px; background: #111827; padding: 8px; border-radius: 4px; cursor: pointer; border: 1px solid ${isChecked ? '#1e3a5f' : '#1e293b'};">
                          <input 
                            type="checkbox" 
                            class="payload-checkbox" 
                            data-payload-name="${payload.name}" 
                            ${isChecked ? 'checked' : ''} 
                            style="margin-top: 3px; cursor: pointer;"
                          />
                          <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #ffffff;">
                              <span>${payload.name}</span>
                              <span style="color: #38bdf8; font-family: monospace;">${payload.mass_kg} kg</span>
                            </div>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${payload.description}</div>
                          </div>
                        </label>
                      `;
                        })
                        .join('')
                    : `<div style="font-size: 12px; color: #64748b; font-style: italic;">No auxiliary scientific payloads for this vehicle component.</div>`
                }
              </div>
            </div>
          </div>

          <!-- Right Column: Staging Breakdown & Launch Authorization -->
          <div style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto;" class="custom-scroll">
            <!-- Authoritative Readiness Banner -->
            <div style="background: ${statusBg}; border: 2px solid ${statusBorder}; border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: ${statusColor}; font-weight: bold; letter-spacing: 1.5px; font-family: monospace;">
                  FLIGHT MARGIN READINESS EVALUATION
                </span>
                <span style="background: ${statusBorder}; color: #080b11; font-weight: 800; font-size: 12px; padding: 2px 8px; border-radius: 3px; font-family: monospace;">
                  ${readiness.status}
                </span>
              </div>
              <div style="font-size: 14px; color: #ffffff; font-weight: 500;">
                ${readiness.statusMessage}
              </div>
              <!-- Delta-V Margin Progress Bar -->
              <div style="width: 100%; height: 8px; background: #111827; border-radius: 4px; overflow: hidden; margin-top: 6px;">
                <div style="width: ${Math.min(100, (readiness.totalDeltaVKms / readiness.requiredDeltaVKms) * 100)}%; height: 100%; background: ${statusBorder}; transition: width 0.3s ease;"></div>
              </div>
            </div>

            <!-- Vehicle Mass Fractions Table -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 14px;">
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase; margin-bottom: 8px;">
                TSIOLKOVSKY MASS FRACTIONS ($m_0 / m_f$)
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-family: monospace;">
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="font-size: 10px; color: #64748b;">DRY MASS ($m_f$)</div>
                  <div style="font-size: 15px; font-weight: bold; color: #e2e8f0;">${readiness.massBreakdown.totalDryMassKg.toLocaleString()} kg</div>
                </div>
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="font-size: 10px; color: #64748b;">PROPELLANT</div>
                  <div style="font-size: 15px; font-weight: bold; color: #38bdf8;">${readiness.massBreakdown.totalPropellantMassKg.toLocaleString()} kg</div>
                </div>
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="font-size: 10px; color: #64748b;">PAYLOAD MASS</div>
                  <div style="font-size: 15px; font-weight: bold; color: #a855f7;">${readiness.massBreakdown.payloadMassKg.toLocaleString()} kg</div>
                </div>
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="font-size: 10px; color: #64748b;">LIFTOFF MASS ($m_0$)</div>
                  <div style="font-size: 15px; font-weight: bold; color: #00e5ff;">${readiness.massBreakdown.totalWetMassKg.toLocaleString()} kg</div>
                </div>
              </div>
            </div>

            <!-- Staging Breakdown Table -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 14px; flex: 1;">
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase; margin-bottom: 10px;">
                PROPULSION STAGING PROFILES
              </div>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid #1e293b; color: #64748b; font-family: monospace; font-size: 11px;">
                    <th style="padding: 6px 8px;">STAGE</th>
                    <th style="padding: 6px 8px;">ENGINE</th>
                    <th style="padding: 6px 8px;">THRUST</th>
                    <th style="padding: 6px 8px;">$I_{sp}$ (VAC)</th>
                    <th style="padding: 6px 8px;">BURN TIME</th>
                    <th style="padding: 6px 8px; text-align: right;">STAGE &Delta;v</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    readiness.stageProfiles.length > 0
                      ? readiness.stageProfiles
                          .map(
                            (s) => `
                        <tr style="border-bottom: 1px solid #111827; color: #e2e8f0;">
                          <td style="padding: 8px; font-weight: bold;">#${s.stageNumber} ${s.stageName}</td>
                          <td style="padding: 8px; color: #38bdf8;">${s.engineName}</td>
                          <td style="padding: 8px; font-family: monospace;">${s.thrustVacuumKn.toFixed(1)} kN</td>
                          <td style="padding: 8px; font-family: monospace;">${s.ispVacuumSec} s</td>
                          <td style="padding: 8px; font-family: monospace;">${s.burnTimeSec} s</td>
                          <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: bold; color: #00e5ff;">
                            ${s.deltaVKms.toFixed(2)} km/s
                          </td>
                        </tr>
                      `
                          )
                          .join('')
                      : `<tr><td colspan="6" style="padding: 12px; color: #64748b; text-align: center;">No active propulsion stages configured.</td></tr>`
                  }
                </tbody>
                <tfoot>
                  <tr style="border-top: 2px solid #1e293b; color: #ffffff; font-weight: bold;">
                    <td colspan="5" style="padding: 10px 8px; text-align: right; font-family: monospace; color: #94a3b8;">
                      TOTAL CALCULATED VACUUM &Delta;v:
                    </td>
                    <td style="padding: 10px 8px; text-align: right; font-family: monospace; font-size: 15px; color: #00e5ff;">
                      ${readiness.totalDeltaVKms.toFixed(2)} km/s
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Launch Authorization Action Bar -->
            <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #64748b; font-family: monospace;">
                [ENTER] Launch Flight Simulation &nbsp;|&nbsp; [ESC] Return
              </span>
              <button 
                id="btn-launch-mission"
                style="background: ${isGo ? '#10b981' : '#f59e0b'}; color: #080b11; border: none; padding: 12px 32px; font-size: 14px; font-weight: 800; border-radius: 6px; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; transition: all 0.15s ease; box-shadow: 0 0 15px ${isGo ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'};"
              >
                Launch Mission &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
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

    // Back to missions button
    const backBtn = this.container.querySelector<HTMLButtonElement>('#btn-back-missions');
    backBtn?.addEventListener('click', () => {
      gameState.setScene('mission_select');
    });

    // Vehicle switcher tabs
    const tabBtns = this.container.querySelectorAll<HTMLButtonElement>('.vehicle-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const craftId = btn.getAttribute('data-craft-id');
        if (craftId) {
          gameState.selectSpacecraft(craftId);
        }
      });
    });

    // Payload checkboxes
    const checkboxes = this.container.querySelectorAll<HTMLInputElement>('.payload-checkbox');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        const name = cb.getAttribute('data-payload-name');
        if (name) {
          gameState.togglePayload(name);
        }
      });
    });

    // Launch button
    const launchBtn = this.container.querySelector<HTMLButtonElement>('#btn-launch-mission');
    launchBtn?.addEventListener('click', () => {
      const craft = gameState.getActiveSpacecraft();
      const mission = gameState.getActiveMission();
      if (craft && mission) {
        if (this.onLaunchCallback) {
          this.onLaunchCallback(craft, mission);
        }
        gameState.setScene('flight_simulation');
      }
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (gameState.getState().currentScene !== 'spacecraft_config') return;

    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      gameState.setScene('mission_select');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const craft = gameState.getActiveSpacecraft();
      const mission = gameState.getActiveMission();
      if (craft && mission) {
        if (this.onLaunchCallback) {
          this.onLaunchCallback(craft, mission);
        }
        gameState.setScene('flight_simulation');
      }
    }
  };
}

