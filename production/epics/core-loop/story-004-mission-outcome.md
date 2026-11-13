# Story 004: Mission Outcome & Historical Benchmark Evaluation

> **Epic**: Core Gameplay Loop (`core-loop`)
> **Status**: Complete
> **Layer**: Core / Logic
> **Type**: Logic / UI
> **Estimate**: S
> **Build step**: core
> **Last Updated**: 2026-11-14

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Core Gameplay Loop Step 4 — Mission Outcome & Scoring
**Engine**: Web (Vite 8.3.4, TypeScript 7.0.2, three 0.186.1) | **Risk**: LOW

---

## Acceptance Criteria

- [x] Evaluates mission success status: SUCCESS, PARTIAL SUCCESS, or MISSION FAILURE based on objectives achieved in `data/missions.json`.
- [x] Computes an authentic NASA Mission Score (0 to 1000 points) weighted by:
  - Fuel Efficiency ($\Delta v$ reserve preserved)
  - Trajectory Target Accuracy
  - Time-to-target efficiency
- [x] Renders an after-action debrief screen displaying:
  - Mission outcome verdict badge
  - Itemized checklist of primary and secondary objectives achieved
  - Historical NASA milestones and educational facts matching the mission
- [x] Provides action buttons: "Re-fly Mission" (restarts simulation) and "Select New Mission" (returns to Mission Selection).

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

## Completion Notes
**Completed**: 2026-11-14
**Criteria**: 4/4 passing
**Deviations**: None
**Test Evidence**: `tests/unit/evaluator.test.ts` (9/9 passing)
**Reviewed by**: lead-programmer (/code-review approved)
**Run Result**: OBSERVED — `production/qa/evidence/story-004-mission-outcome/mission-outcome.png`

## Calls beyond the design
- Weighted NASA performance score across 4 pillars: objectives (400), fuel efficiency (300), trajectory accuracy (200), flight execution (100) · kept 2026-11-14
- Formatted historical milestones and educational comparisons with actual Apollo/Voyager flight margins · kept 2026-11-14
- Added keyboard shortcuts [R] to Re-fly Mission and [ENTER]/[ESC] to return to Mission Select · kept 2026-11-14

