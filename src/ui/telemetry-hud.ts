/**
 * NASA Space Mission Design & Simulation Game
 * Mission Control Telemetry HUD & Maneuver Burn Controller
 */

import { gameState } from '../game/state';
import type { OrbitalSimulation, OrbitalState } from '../sim/orbital-mechanics';

export class TelemetryHUD {
  private container: HTMLElement | null = null;
  private simulation: OrbitalSimulation | null = null;
  private unsubscribeState: (() => void) | null = null;
  private burnIncrementKms = 0.25;
  private onCompleteCallback?: () => void;
  private onBurnCallback?: () => void;

  constructor(
    simulation?: OrbitalSimulation,
    onComplete?: () => void,
    onBurn?: () => void
  ) {
    if (simulation) this.simulation = simulation;
    this.onCompleteCallback = onComplete;
    this.onBurnCallback = onBurn;
  }

  public setSimulation(simulation: OrbitalSimulation): void {
    this.simulation = simulation;
    this.update();
  }

  public mount(parent: HTMLElement): void {
    if (this.container) this.unmount();

    this.container = document.createElement('div');
    this.container.id = 'flight-telemetry-hud';
    this.applyStyles(this.container);
    parent.appendChild(this.container);

    this.unsubscribeState = gameState.subscribe((st) => {
      if (st.currentScene === 'flight_simulation') {
        this.show();
        this.update();
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
    if (this.container) this.container.style.display = 'flex';
  }

  public hide(): void {
    if (this.container) this.container.style.display = 'none';
  }

  public update(): void {
    if (!this.container || !this.simulation) return;
    const state = this.simulation.getState();
    const mission = gameState.getActiveMission();
    const spacecraft = gameState.getActiveSpacecraft();

    const propPct =
      state.initialPropellantKg > 0
        ? Math.max(0, Math.min(100, (state.propellantKg / state.initialPropellantKg) * 100))
        : 0;

    const propBarColor = propPct > 30 ? '#10b981' : propPct > 10 ? '#f59e0b' : '#ef4444';
    const isTargetMet = state.targetOrbitReached;

    this.container.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; box-sizing: border-box; padding: 20px;">
        <!-- Top Bar: Telemetry Readouts -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
          <!-- Left Telemetry Card -->
          <div style="pointer-events: auto; background: rgba(8, 11, 17, 0.88); border: 1px solid #1e293b; border-radius: 8px; padding: 16px; min-width: 340px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 12px;">
              <div>
                <div style="font-size: 10px; color: #00e5ff; letter-spacing: 1.5px; font-family: monospace; font-weight: bold;">
                  STAGE 3: ORBITAL FLIGHT SIMULATION
                </div>
                <h2 style="margin: 2px 0 0 0; font-size: 18px; color: #ffffff;">${spacecraft?.name || 'Spacecraft'}</h2>
              </div>
              <span style="background: rgba(11,61,145,0.5); border: 1px solid #0b3d91; color: #93c5fd; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: monospace;">
                ${state.primaryBody.name}
              </span>
            </div>

            <!-- Telemetry Metrics Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: monospace;">
              <div style="background: #111827; padding: 8px; border-radius: 4px;">
                <div style="font-size: 10px; color: #64748b;">ALTITUDE</div>
                <div id="hud-altitude" style="font-size: 16px; font-weight: bold; color: #00e5ff;">
                  ${state.altitudeKm.toLocaleString()} km
                </div>
              </div>
              <div style="background: #111827; padding: 8px; border-radius: 4px;">
                <div style="font-size: 10px; color: #64748b;">ORBITAL VELOCITY</div>
                <div id="hud-velocity" style="font-size: 16px; font-weight: bold; color: #38bdf8;">
                  ${state.velocityKms.toFixed(2)} km/s
                </div>
              </div>
              <div style="background: #111827; padding: 8px; border-radius: 4px;">
                <div style="font-size: 10px; color: #64748b;">PERIAPSIS (Pe)</div>
                <div id="hud-periapsis" style="font-size: 14px; font-weight: bold; color: #10b981;">
                  ${state.periapsisAltitudeKm.toLocaleString()} km
                </div>
              </div>
              <div style="background: #111827; padding: 8px; border-radius: 4px;">
                <div style="font-size: 10px; color: #64748b;">APOAPSIS (Ap)</div>
                <div id="hud-apoapsis" style="font-size: 14px; font-weight: bold; color: #f59e0b;">
                  ${state.eccentricity < 1 ? `${state.apoapsisAltitudeKm.toLocaleString()} km` : 'ESCAPE'}
                </div>
              </div>
              <div style="background: #111827; padding: 8px; border-radius: 4px;">
                <div style="font-size: 10px; color: #64748b;">ECCENTRICITY (e)</div>
                <div style="font-size: 14px; font-weight: bold; color: #e2e8f0;">
                  ${state.eccentricity.toFixed(3)}
                </div>
              </div>
              <div style="background: #111827; padding: 8px; border-radius: 4px;">
                <div style="font-size: 10px; color: #64748b;">ORBITAL PERIOD</div>
                <div style="font-size: 14px; font-weight: bold; color: #e2e8f0;">
                  ${Math.round(state.orbitalPeriodSec / 60)} min
                </div>
              </div>
            </div>

            <!-- Propellant & Delta-V Gauge -->
            <div style="margin-top: 12px; background: #111827; padding: 8px; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; margin-bottom: 4px;">
                <span style="color: #64748b;">PROPELLANT:</span>
                <span id="hud-propellant-pct" style="color: ${propBarColor}; font-weight: bold;">
                  ${propPct.toFixed(1)}% (${Math.round(state.propellantKg)} kg)
                </span>
              </div>
              <div style="width: 100%; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden;">
                <div style="width: ${propPct}%; height: 100%; background: ${propBarColor}; transition: width 0.2s ease;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; margin-top: 6px;">
                <span style="color: #64748b;">AVAILABLE &Delta;v:</span>
                <span id="hud-available-dv" style="color: #00e5ff; font-weight: bold;">
                  ${state.availableDeltaVKms.toFixed(2)} km/s
                </span>
              </div>
            </div>
          </div>

          <!-- Top-Right Status Banner -->
          <div style="pointer-events: auto; display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
            <div style="background: rgba(8, 11, 17, 0.88); border: 1px solid #1e293b; border-radius: 6px; padding: 8px 14px; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">FLIGHT PHASE:</span>
              <span style="background: #1e3a5f; color: #38bdf8; font-size: 12px; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-family: monospace;">
                ${state.flightPhaseName}
              </span>
            </div>

            ${
              isTargetMet
                ? `
              <div style="background: rgba(6, 78, 59, 0.9); border: 1px solid #10b981; color: #34d399; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; font-family: monospace; display: flex; align-items: center; gap: 8px;">
                <span>&check;</span> TARGET TRAJECTORY ACHIEVED
              </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Bottom Controls Deck -->
        <div style="pointer-events: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px;">
          <!-- Flight Maneuver Burn Deck -->
          <div style="background: rgba(8, 11, 17, 0.88); border: 1px solid #1e293b; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="font-size: 11px; color: #00e5ff; letter-spacing: 1px; font-family: monospace; font-weight: bold;">
              MANEUVER CONTROLS
            </div>

            <!-- Burn Amount Selector -->
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 11px; color: #64748b; font-family: monospace;">&Delta;v Step:</span>
              ${[0.1, 0.25, 0.5, 1.0]
                .map(
                  (val) => `
                <button 
                  class="burn-step-btn" 
                  data-val="${val}" 
                  style="background: ${this.burnIncrementKms === val ? '#0b3d91' : '#111827'}; border: 1px solid ${this.burnIncrementKms === val ? '#00e5ff' : '#1e293b'}; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; cursor: pointer;"
                >
                  ${val} km/s
                </button>
              `
                )
                .join('')}
            </div>

            <!-- Burn Execution Triggers -->
            <div style="display: flex; gap: 10px;">
              <button 
                id="btn-burn-prograde"
                style="background: #10b981; color: #080b11; border: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: transform 0.1s ease;"
              >
                &Delta;v+ Prograde Burn
              </button>
              <button 
                id="btn-burn-retrograde"
                style="background: #ef4444; color: #ffffff; border: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: transform 0.1s ease;"
              >
                &Delta;v- Retrograde Burn
              </button>
            </div>
          </div>

          <!-- Time-Warp & Stage Progression Deck -->
          <div style="background: rgba(8, 11, 17, 0.88); border: 1px solid #1e293b; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; align-items: flex-end; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <!-- Time Acceleration Buttons -->
            <div style="display: flex; gap: 6px; align-items: center;">
              <span style="font-size: 11px; color: #64748b; font-family: monospace;">Time Warp:</span>
              <button 
                id="btn-pause-sim" 
                style="background: ${state.isPaused ? '#f59e0b' : '#111827'}; border: 1px solid #1e293b; color: ${state.isPaused ? '#080b11' : '#e2e8f0'}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;"
              >
                ${state.isPaused ? 'PAUSED' : 'PAUSE'}
              </button>
              ${[1, 10, 100, 1000]
                .map(
                  (factor) => `
                <button 
                  class="timewarp-btn" 
                  data-factor="${factor}" 
                  style="background: ${state.timeWarpFactor === factor && !state.isPaused ? '#0b3d91' : '#111827'}; border: 1px solid ${state.timeWarpFactor === factor && !state.isPaused ? '#00e5ff' : '#1e293b'}; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-family: monospace; font-weight: bold; cursor: pointer;"
                >
                  ${factor}x
                </button>
              `
                )
                .join('')}
            </div>

            <!-- Mission Outcome Transition Button -->
            <button 
              id="btn-complete-flight"
              style="background: ${isTargetMet ? '#10b981' : '#0b3d91'}; border: 1px solid ${isTargetMet ? '#34d399' : '#00e5ff'}; color: #ffffff; padding: 10px 24px; border-radius: 6px; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 0 12px ${isTargetMet ? 'rgba(16,185,129,0.4)' : 'rgba(0,229,255,0.2)'};"
            >
              Complete Flight &amp; View Outcome &rarr;
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private applyStyles(el: HTMLElement): void {
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '100';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }

  private attachEventListeners(): void {
    if (!this.container || !this.simulation) return;

    // Burn step buttons
    const stepBtns = this.container.querySelectorAll<HTMLButtonElement>('.burn-step-btn');
    stepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-val') || '0.25');
        this.burnIncrementKms = val;
        this.update();
      });
    });

    // Prograde burn button
    const progradeBtn = this.container.querySelector<HTMLButtonElement>('#btn-burn-prograde');
    progradeBtn?.addEventListener('click', () => {
      this.simulation?.applyManeuverBurn(this.burnIncrementKms, 'prograde');
      if (this.onBurnCallback) this.onBurnCallback();
      this.update();
    });

    // Retrograde burn button
    const retrogradeBtn = this.container.querySelector<HTMLButtonElement>('#btn-burn-retrograde');
    retrogradeBtn?.addEventListener('click', () => {
      this.simulation?.applyManeuverBurn(this.burnIncrementKms, 'retrograde');
      if (this.onBurnCallback) this.onBurnCallback();
      this.update();
    });

    // Time-warp buttons
    const warpBtns = this.container.querySelectorAll<HTMLButtonElement>('.timewarp-btn');
    warpBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const factor = parseInt(btn.getAttribute('data-factor') || '1', 10);
        this.simulation?.setTimeWarp(factor);
        this.update();
      });
    });

    // Pause button
    const pauseBtn = this.container.querySelector<HTMLButtonElement>('#btn-pause-sim');
    pauseBtn?.addEventListener('click', () => {
      this.simulation?.togglePause();
      this.update();
    });

    // Complete flight button
    const completeBtn = this.container.querySelector<HTMLButtonElement>('#btn-complete-flight');
    completeBtn?.addEventListener('click', () => {
      if (this.onCompleteCallback) this.onCompleteCallback();
      gameState.setScene('mission_outcome');
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (gameState.getState().currentScene !== 'flight_simulation' || !this.simulation) return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.simulation.togglePause();
      this.update();
    } else if (e.key === '1') {
      this.simulation.setTimeWarp(1);
      this.update();
    } else if (e.key === '2') {
      this.simulation.setTimeWarp(10);
      this.update();
    } else if (e.key === '3') {
      this.simulation.setTimeWarp(100);
      this.update();
    } else if (e.key === '4') {
      this.simulation.setTimeWarp(1000);
      this.update();
    } else if (e.key === 'w' || e.key === 'W' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      this.simulation.applyManeuverBurn(this.burnIncrementKms, 'prograde');
      if (this.onBurnCallback) this.onBurnCallback();
      this.update();
    } else if (e.key === 's' || e.key === 'S' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      this.simulation.applyManeuverBurn(this.burnIncrementKms, 'retrograde');
      if (this.onBurnCallback) this.onBurnCallback();
      this.update();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.onCompleteCallback) this.onCompleteCallback();
      gameState.setScene('mission_outcome');
    }
  };
}
