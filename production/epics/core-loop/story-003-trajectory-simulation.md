# Story 003: 3D Trajectory & Orbital Flight Simulation

> **Epic**: Core Gameplay Loop (`core-loop`)
> **Status**: Ready
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

- [ ] Renders a 3D three.js orbital view displaying the primary celestial body (Earth/Moon/Mars) with celestial textures/lighting and starry skybox.
- [ ] Draws the active spacecraft's elliptical Keplerian trajectory line, indicating periapsis and apoapsis points.
- [ ] Implements a real-time telemetry HUD showing:
  - Altitude above surface ($\text{km}$)
  - Orbital Velocity ($\text{km/s}$)
  - Propellant Remaining ($\%$) and available $\Delta v$ ($\text{km/s}$)
  - Current flight phase name
- [ ] Provides manual and timed burn controls:
  - Prograde / Retrograde burn triggers that expend propellant and dynamically update orbital geometry.
- [ ] Provides time acceleration controls ($1\times, 10\times, 100\times, 1000\times$) allowing orbital transfers to execute smoothly.
- [ ] When target orbital insertion, landing, or escape velocity criteria are achieved (or propellant runs dry), triggers transition to Stage 4 (Mission Outcome).

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
- `tests/unit/orbital_mechanics.test.ts`

