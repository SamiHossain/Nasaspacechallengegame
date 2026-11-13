# Story 002: Spacecraft & Staging Configuration

> **Epic**: Core Gameplay Loop (`core-loop`)
> **Status**: In Progress
> **Layer**: Core / Logic
> **Type**: Logic / UI
> **Estimate**: M
> **Build step**: core
> **Last Updated**: 2026-11-13

## Context

**GDD**: `design/game-brief.md`
**Requirement**: Core Gameplay Loop Step 2 — Vehicle & Staging Configuration
**Formula**: `tsiolkovsky_rocket_equation` ($\Delta v = I_{sp} \cdot g_0 \cdot \ln(m_0 / m_f)$)
**Engine**: Web (Vite 8.3.4, TypeScript 7.0.2, three 0.186.1) | **Risk**: LOW

---

## Acceptance Criteria

- [ ] Resolves and displays the compatible spacecraft and launch vehicle from `data/spacecraft.json` for the selected mission.
- [ ] Displays a detailed mass breakdown table: dry mass ($m_{\text{dry}}$), propellant mass ($m_{\text{prop}}$), scientific payload mass, and total wet mass ($m_{\text{wet}}$).
- [ ] Computes theoretical vacuum $\Delta v$ for each propulsion stage using `calculateSpacecraftTotalDeltaV` from `data/index.ts`.
- [ ] Compares vehicle total $\Delta v$ against the mission's minimum required $\Delta v$ budget and displays an authoritative "GO / NO-GO FOR LAUNCH" flight status indicator.
- [ ] Provides a "Launch Mission ->" button that transitions the player into Stage 3 (Launch & Orbital Simulation).

---

## Implementation Notes

- Provide visual breakdown of each stage: engine name, specific impulse ($I_{sp}$), thrust ($\text{kN}$), and stage $\Delta v$.
- Calculate margin percentage: $\text{Margin} = ((\Delta v_{\text{total}} - \Delta v_{\text{req}}) / \Delta v_{\text{req}}) \times 100\%$.
- Ensure reactive updates if player toggles optional scientific payloads.

---

## Out of Scope

- 3D flight physics propagation (handled by Story 003).
- Debrief and final score calculation (handled by Story 004).

---

## Files

- `src/ui/spacecraft-config.ts`
- `src/game/staging-calculator.ts`
- `tests/unit/staging_calculator.test.ts`

