# Epic: Core Gameplay Loop (Mission Design & Orbital Flight)

> **Slug**: `core-loop`
> **Layer**: `Core`
> **Status**: `Complete`
> **GDD**: `design/game-brief.md`
> **Review Mode**: `Lean`

## Overview
Implements the end-to-end 4-stage core gameplay loop of the NASA Space Mission Design & Simulation Game:
1. **Mission Selection:** Browse and select historical NASA missions with authentic objectives and telemetry constraints.
2. **Spacecraft & Payload Configuration:** Review staging, mass fractions, and verify $\Delta v$ margins with rocket equation calculations.
3. **Launch & Orbital Trajectory Simulation:** 3D Keplerian trajectory visualization, orbital mechanics flight execution, time-warp, and burn controls in three.js.
4. **Mission Outcome & Evaluation:** Objective assessment, scoring based on fuel efficiency and trajectory accuracy, and historical debrief.

## Requirements Traceability
- **Brief MVP Feature 1**: Decoupled NASA Vehicle Architecture (`data/spacecraft.json`)
- **Brief MVP Feature 2**: Decoupled NASA Mission Architecture (`data/missions.json`)
- **Brief MVP Feature 3**: Keplerian 2-Body Orbital Propagation & Trajectory Predictor
- **Brief MVP Feature 4**: Real-time Mission Control Telemetry HUD & Maneuver Burn Controller
- **Brief MVP Feature 5**: Mission Evaluation & Historical NASA Benchmarking

## Stories

| # | Story | Type | Status | Estimate |
|---|-------|------|--------|----------|
| 001 | [Mission Selection Screen & Data Provider](file:///d:/Nasa%20Space/production/epics/core-loop/story-001-mission-selection.md) | UI | Complete | S |
| 002 | [Spacecraft & Staging Configuration](file:///d:/Nasa%20Space/production/epics/core-loop/story-002-spacecraft-configuration.md) | Logic / UI | Complete | M |
| 003 | [3D Trajectory & Orbital Flight Simulation](file:///d:/Nasa%20Space/production/epics/core-loop/story-003-trajectory-simulation.md) | Visual/Feel | Complete | M |
| 004 | [Mission Outcome & Historical Benchmark Evaluation](file:///d:/Nasa%20Space/production/epics/core-loop/story-004-mission-outcome.md) | Logic / UI | Complete | S |

