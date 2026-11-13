# Story 001: Mission Selection Screen & Data Provider

> **Epic**: Core Gameplay Loop (`core-loop`)
> **Status**: Complete
> **Layer**: Core / UI
> **Type**: UI
> **Estimate**: S
> **Build step**: core
> **Last Updated**: 2026-11-13

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Core Gameplay Loop Step 1 — Mission Briefing & Selection
**Engine**: Web (Vite 8.3.4, TypeScript 7.0.2, three 0.186.1) | **Risk**: LOW

---

## Acceptance Criteria

- [x] Loads all 5 historical NASA missions dynamically from `data/missions.json` via `data/index.ts`.
- [x] Renders an accessible Mission Selection interface displaying each mission's title, program (Apollo, Voyager, Great Observatories, JWST, Mars Exploration), launch year, target celestial body, and minimum required $\Delta v$ budget.
- [x] Selecting a mission card updates the active mission in the global application state and displays detailed mission parameters (primary objectives, historical context, and flight phases).
- [x] Provides a clear "Configure Spacecraft ->" call-to-action button that transitions the player into Stage 2 (Spacecraft Configuration).
- [x] Includes keyboard navigation and clean aerospace Mission Control visual theme.

---

## Implementation Notes

- Loaded mission registry through `missionRegistry` and `getMission` in `data/index.ts`.
- Application state managed by reactive `gameState` in `src/game/state.ts`.
- Mission selection UI mounted via `MissionSelectUI` in `src/ui/mission-select.ts`.
- Keyboard navigation implemented with Arrow Up / Arrow Down and Enter confirmation.

---

## Files

- `src/game/state.ts` (created)
- `src/ui/mission-select.ts` (created)
- `src/main.ts` (updated to mount UI and integrate scene transitions)
- `tests/unit/mission_select.test.ts` (created, 5/5 tests passing)

---

## Test Evidence

- **Automated Unit Tests**: `tests/unit/mission_select.test.ts` passed (5/5 tests).
- **Test-Run Script**: `.claude/scripts/test-run.sh web --filter tests/unit/` passed (11/11 tests across suite).
- **Screenshot Evidence**: Retained UI capture at `production/qa/evidence/story-001/mission-select.png` (0 uncaught errors).
