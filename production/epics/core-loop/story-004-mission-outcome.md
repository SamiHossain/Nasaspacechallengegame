# Story 004: Mission Outcome & Historical Benchmark Evaluation

> **Epic**: Core Gameplay Loop (`core-loop`)
> **Status**: In Progress
> **Layer**: Core / Logic
> **Type**: Logic / UI
> **Estimate**: S
> **Build step**: core
> **Last Updated**: 2026-11-13

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Core Gameplay Loop Step 4 — Mission Outcome & Scoring
**Engine**: Web (Vite 8.3.4, TypeScript 7.0.2, three 0.186.1) | **Risk**: LOW

---

## Acceptance Criteria

- [ ] Evaluates mission success status: SUCCESS, PARTIAL SUCCESS, or MISSION FAILURE based on objectives achieved in `data/missions.json`.
- [ ] Computes an authentic NASA Mission Score (0 to 1000 points) weighted by:
  - Fuel Efficiency ($\Delta v$ reserve preserved)
  - Trajectory Target Accuracy
  - Time-to-target efficiency
- [ ] Renders an after-action debrief screen displaying:
  - Mission outcome verdict badge
  - Itemized checklist of primary and secondary objectives achieved
  - Historical NASA milestones and educational facts matching the mission
- [ ] Provides action buttons: "Re-fly Mission" (restarts simulation) and "Select New Mission" (returns to Mission Selection).

---

## Implementation Notes

- Pull scoring weights directly from `mission.scoring_criteria` in `data/missions.json`.
- Format historical milestone timestamps and commemorative messages.
- Ensure state reset cleanly resets simulation time and spacecraft fuel for re-flight.

---

## Out of Scope

- Persistent backend leaderboard (jam/offline focus per Brief).

---

## Files

- `src/game/evaluator.ts`
- `src/ui/mission-outcome.ts`
- `src/main.ts`
- `tests/unit/evaluator.test.ts`

