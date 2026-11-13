# Story 003: 3D Trajectory & Orbital Flight Simulation

> **Epic**: Core Gameplay Loop (`core-loop`)
> **Status**: Complete
> **Layer**: Core / Simulation
> **Type**: Visual/Feel
> **Estimate**: M
> **Build step**: core
> **Last Updated**: 2026-11-13

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Core Gameplay Loop Step 3 — Launch & Orbital Trajectory Execution
**Formula**: `vis_viva_equation` ($v = \sqrt{\mu (2/r - 1/a)}$)
**Engine**: Web (Vite 8.3.4, TypeScript 7.0.2, three 0.186.1) | **Risk**: MEDIUM

---

## Acceptance Criteria

- [x] Renders a 3D three.js orbital view displaying the primary celestial body (Earth/Moon/Mars) with celestial textures/lighting and starry skybox.
- [x] Draws the active spacecraft's elliptical Keplerian trajectory line, indicating periapsis and apoapsis points.
- [x] Implements a real-time telemetry HUD showing:
  - Altitude above surface ($\text{km}$)
  - Orbital Velocity ($\text{km/s}$)
  - Propellant Remaining ($\%$) and available $\Delta v$ ($\text{km/s}$)
  - Current flight phase name
- [x] Provides manual and timed burn controls:
  - Prograde / Retrograde burn triggers that expend propellant and dynamically update orbital geometry.
- [x] Provides time acceleration controls ($1\times, 10\times, 100\times, 1000\times$) allowing orbital transfers to execute smoothly.
- [x] When target orbital insertion, landing, or escape velocity criteria are achieved (or propellant runs dry), triggers transition to Stage 4 (Mission Outcome).

---

## Implementation Notes

- Use Keplerian conic formulation for stable, predictable orbital propagation.
- Render trajectory using `THREE.Line` / `THREE.BufferGeometry` updated when maneuver burns are applied.
- Expose flight status hook to `window.game` for automated headless testing and verification.

---

## Out of Scope

- N-body gravitational perturbations (2-body patched conics per Brief).
- Mission debrief scoring screen (handled by Story 004).

---

## Files

- `src/sim/orbital-mechanics.ts`
- `src/sim/flight-view.ts`
- `src/ui/telemetry-hud.ts`
- `src/main.ts`
- `src/hook.ts`
- `tests/unit/orbital_mechanics.test.ts`

## Completion Notes
**Completed**: 2026-11-13
**Criteria**: 6/6 passing
**Deviations**: None
**Test Evidence**: `tests/unit/orbital_mechanics.test.ts` (20/20 passing)
**Reviewed by**: lead-programmer (/code-review approved)
**Run Result**: OBSERVED — `production/qa/evidence/story-003-trajectory-simulation/flight-simulation.png`

## Calls beyond the design
- Added data/celestial/mars.json with standard NASA parameters and registered in celestialBodies · kept 2026-11-13
- Implemented 1,500-star depth-tinted procedural skybox in Three.js · kept 2026-11-13
- Added color-coded Apsis markers: green periapsis and amber apoapsis · kept 2026-11-13
- Exposed orbit telemetry and burn helpers to window.game for automated headless verification · kept 2026-11-13

