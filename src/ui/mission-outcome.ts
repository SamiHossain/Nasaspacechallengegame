/**
 * NASA Space Mission Design & Simulation Game
 * Mission Outcome & Historical Benchmark Debrief Screen
 */

import { gameState } from '../game/state';
import { evaluateMissionOutcome, type MissionEvaluationResult } from '../game/evaluator';
import type { OrbitalSimulation } from '../sim/orbital-mechanics';

export class MissionOutcomeUI {
  private container: HTMLElement | null = null;
  private unsubscribeState: (() => void) | null = null;
  private simulationProvider?: () => OrbitalSimulation | null;
  private onReflyCallback?: () => void;
  private onNewMissionCallback?: () => void;

  constructor(
    simulationProvider?: () => OrbitalSimulation | null,
    onRefly?: () => void,
    onNewMission?: () => void
  ) {
    this.simulationProvider = simulationProvider;
    this.onReflyCallback = onRefly;
    this.onNewMissionCallback = onNewMission;
  }

  public mount(parent: HTMLElement): void {
    if (this.container) this.unmount();

    this.container = document.createElement('div');
    this.container.id = 'mission-outcome-screen';
    this.applyContainerStyles(this.container);
    parent.appendChild(this.container);

    this.unsubscribeState = gameState.subscribe((st) => {
      if (st.currentScene === 'mission_outcome') {
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
    if (this.container) this.container.style.display = 'flex';
  }

  public hide(): void {
    if (this.container) this.container.style.display = 'none';
  }

  public render(): void {
    if (!this.container) return;

    const mission = gameState.getActiveMission();
    const spacecraft = gameState.getActiveSpacecraft();

    if (!mission || !spacecraft) {
      this.container.innerHTML = `
        <div style="text-align: center; color: #94a3b8;">
          <h2>No Active Mission Flight Recorded</h2>
          <button id="btn-outcome-home" style="padding: 8px 16px; background: #00e5ff; border: none; border-radius: 4px; cursor: pointer;">
            Return to Mission Select
          </button>
        </div>
      `;
      this.container.querySelector('#btn-outcome-home')?.addEventListener('click', () => {
        gameState.setScene('mission_select');
      });
      return;
    }

    const sim = this.simulationProvider ? this.simulationProvider() : null;
    const orbitalState = sim?.getState();
    const evalResult: MissionEvaluationResult = evaluateMissionOutcome(mission, spacecraft, orbitalState);

    const isSuccess = evalResult.verdict === 'SUCCESS';
    const isPartial = evalResult.verdict === 'PARTIAL_SUCCESS';

    const verdictColor = isSuccess ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444';
    const verdictBg = isSuccess ? 'rgba(6, 78, 59, 0.4)' : isPartial ? 'rgba(120, 53, 15, 0.4)' : 'rgba(127, 29, 29, 0.4)';

    this.container.innerHTML = `
      <div style="width: 100%; max-width: 1250px; height: 92vh; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;">
        <!-- Header -->
        <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px;">
          <div>
            <div style="font-size: 11px; letter-spacing: 2px; color: #00e5ff; font-weight: bold; text-transform: uppercase;">
              STAGE 4: AFTER-ACTION FLIGHT DEBRIEF & EVALUATION
            </div>
            <h1 style="margin: 2px 0 0 0; font-size: 24px; color: #ffffff;">
              ${mission.title}
            </h1>
          </div>
          <div style="background: ${verdictBg}; border: 2px solid ${verdictColor}; padding: 6px 16px; border-radius: 6px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px; font-weight: 800; color: ${verdictColor}; letter-spacing: 1px; font-family: monospace;">
              ${evalResult.verdictTitle}
            </span>
          </div>
        </header>

        <!-- Main Debrief 2-Column Grid -->
        <div style="display: grid; grid-template-columns: 500px 1fr; gap: 16px; flex: 1; min-height: 0;">
          <!-- Left Column: Performance Score & Objectives -->
          <div style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto;" class="custom-scroll">
            <!-- Overall NASA Score Card -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase;">
                    OVERALL NASA MISSION SCORE
                  </div>
                  <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
                    <span id="txt-total-score" style="font-size: 42px; font-weight: 900; color: #ffffff; font-family: monospace;">
                      ${evalResult.scoreBreakdown.totalScore}
                    </span>
                    <span style="color: #64748b; font-size: 16px; font-family: monospace;">/ 1000 PTS</span>
                  </div>
                </div>
                <div style="background: #111827; border: 1px solid #1e3a5f; padding: 6px 14px; border-radius: 6px; text-align: center;">
                  <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">RATING</div>
                  <div id="txt-grade" style="font-size: 22px; font-weight: bold; color: #00e5ff;">
                    ${evalResult.scoreBreakdown.grade}
                  </div>
                </div>
              </div>

              <!-- Score Breakdown Bars -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; font-size: 12px; font-family: monospace;">
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="color: #64748b; font-size: 10px;">OBJECTIVES</div>
                  <div style="color: #38bdf8; font-weight: bold; font-size: 14px;">
                    ${evalResult.scoreBreakdown.objectivesScore} / 400
                  </div>
                </div>
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="color: #64748b; font-size: 10px;">FUEL EFFICIENCY</div>
                  <div style="color: #10b981; font-weight: bold; font-size: 14px;">
                    ${evalResult.scoreBreakdown.fuelEfficiencyScore} / 300
                  </div>
                </div>
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="color: #64748b; font-size: 10px;">TRAJECTORY ACCURACY</div>
                  <div style="color: #a855f7; font-weight: bold; font-size: 14px;">
                    ${evalResult.scoreBreakdown.trajectoryAccuracyScore} / 200
                  </div>
                </div>
                <div style="background: #111827; padding: 8px; border-radius: 4px;">
                  <div style="color: #64748b; font-size: 10px;">FLIGHT EXECUTION</div>
                  <div style="color: #f59e0b; font-weight: bold; font-size: 14px;">
                    ${evalResult.scoreBreakdown.flightEfficiencyScore} / 100
                  </div>
                </div>
              </div>
            </div>

            <!-- Objectives Checklist Card -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 16px; flex: 1;">
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase; margin-bottom: 10px;">
                MISSION OBJECTIVES CHECKLIST
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${evalResult.evaluatedObjectives
                  .map(
                    (obj) => `
                  <div style="background: #111827; border: 1px solid ${obj.completed ? '#1e3a5f' : '#2d1515'}; padding: 10px; border-radius: 4px; display: flex; align-items: flex-start; gap: 10px;">
                    <span style="color: ${obj.completed ? '#10b981' : '#ef4444'}; font-size: 14px; font-weight: bold;">
                      ${obj.completed ? '&#10003;' : '&#10007;'}
                    </span>
                    <div style="flex: 1;">
                      <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 13px; font-weight: bold; color: ${obj.completed ? '#ffffff' : '#94a3b8'};">
                          ${obj.title}
                        </span>
                        <span style="font-size: 10px; color: ${obj.isPrimary ? '#00e5ff' : '#64748b'}; font-family: monospace;">
                          ${obj.isPrimary ? 'PRIMARY' : 'SECONDARY'}
                        </span>
                      </div>
                      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        ${obj.description}
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- Right Column: Historical Benchmark & Educational Milestones -->
          <div style="display: flex; flex-direction: column; gap: 14px; overflow-y: auto;" class="custom-scroll">
            <!-- Historical Benchmark Comparison Card -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 16px; border-left: 4px solid #00e5ff;">
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase; margin-bottom: 6px;">
                HISTORICAL NASA BENCHMARK
              </div>
              <p style="margin: 0; color: #e2e8f0; font-size: 13px; line-height: 1.5;">
                ${evalResult.historicalBenchmarkFact}
              </p>
            </div>

            <!-- Historical Milestones Timeline -->
            <div style="background: #0d131f; border: 1px solid #1e293b; border-radius: 6px; padding: 16px; flex: 1;">
              <div style="font-size: 11px; color: #00e5ff; font-family: monospace; text-transform: uppercase; margin-bottom: 12px;">
                HISTORICAL MISSION TIMELINE &amp; FLIGHT RECORDS
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${evalResult.historicalMilestones
                  .map(
                    (item) => `
                  <div style="border-left: 2px solid #1e3a5f; padding-left: 12px; margin-left: 4px;">
                    <div style="font-size: 11px; color: #38bdf8; font-family: monospace;">
                      ${item.timestamp.replace('T', ' ').replace('Z', ' UTC')}
                    </div>
                    <div style="font-size: 13px; color: #cbd5e1; margin-top: 3px; line-height: 1.4;">
                      ${item.event}
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <footer style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 12px;">
          <span style="font-size: 12px; color: #64748b; font-family: monospace;">
            [R] Re-fly Mission &nbsp;|&nbsp; [ENTER / ESC] Mission Selection
          </span>
          <div style="display: flex; gap: 12px;">
            <button 
              id="btn-refly-mission"
              style="background: transparent; border: 1px solid #334155; color: #e2e8f0; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;"
            >
              &#x21bb; Re-fly Mission
            </button>
            <button 
              id="btn-select-new-mission"
              style="background: #00e5ff; color: #080b11; border: none; padding: 10px 24px; font-size: 13px; font-weight: 800; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 0 12px rgba(0,229,255,0.3);"
            >
              Select New Mission &rarr;
            </button>
          </div>
        </footer>
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

    // Re-fly button
    const reflyBtn = this.container.querySelector<HTMLButtonElement>('#btn-refly-mission');
    reflyBtn?.addEventListener('click', () => {
      if (this.onReflyCallback) this.onReflyCallback();
      gameState.setScene('flight_simulation');
    });

    // Select new mission button
    const newMissionBtn = this.container.querySelector<HTMLButtonElement>('#btn-select-new-mission');
    newMissionBtn?.addEventListener('click', () => {
      if (this.onNewMissionCallback) this.onNewMissionCallback();
      gameState.setScene('mission_select');
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (gameState.getState().currentScene !== 'mission_outcome') return;

    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (this.onReflyCallback) this.onReflyCallback();
      gameState.setScene('flight_simulation');
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (this.onNewMissionCallback) this.onNewMissionCallback();
      gameState.setScene('mission_select');
    }
  };
}
