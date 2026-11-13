# Game Brief: NASA Space Mission Design & Simulation Game

## In your words
A Web-based NASA Space Mission Design & Simulation Game for the NASA Space Apps Challenge, where players plan, configure, and execute real NASA missions using authentic NASA spacecraft. All NASA spacecraft specs (mass, delta-v, payload capacity, thrust, propulsion) and mission parameters (target body, orbital insertion requirements, objectives) are decoupled into clean JSON/TS configuration files under data/ so authentic NASA ships and missions can be fed one by one.

**Pitch:** Plan, configure, and pilot real NASA spacecraft across authentic solar system trajectories in a telemetry-accurate mission design and orbital execution simulator.

**Genre:** Space Mission Simulator / Orbital Trajectory & Engineering Strategy

**Controls:** Mouse and keyboard: UI panels for spacecraft staging and delta-v planning; timeline scrubber / time-warp (1x to 10,000x); throttle (Shift/Ctrl or slider); prograde/retrograde/normal/radial maneuver node handles; camera orbit/pan/zoom around spacecraft and solar system map view.

**Question:** Can planning real NASA missions with authentic rocketry physics and delta-v budgets deliver both high educational authenticity and deeply engaging gameplay in a browser?

**Hooks:**
- Authentic NASA Spacecraft Roster: Real specifications (Apollo CSM/LM, Space Shuttle Orbiter, Artemis Orion, Voyager, Perseverance/Curiosity cruise stages) with true-to-life mass fractions and specific impulses ($I_{sp}$).
- Decoupled Data-Driven Mission Engine: Modular mission and vehicle configs under `data/` allowing seamless community and challenge mission packs without touching engine code.
- Interactive Maneuver Planning & Orbital Visualization: Visual Keplerian conic trajectories, Hohmann transfers, and burn node executors giving players genuine astronautical insight.

**Intent:** authentic mission simulation · staged flight phases · educational accuracy · NASA Space Apps Challenge showcase

## Look and references
- Look: Clean aerospace telemetry aesthetics; dark high-contrast deep space skybox with realistic celestial lighting; crisp vector trajectory lines (apopasis, periapsis, encounter nodes); HUD telemetry panels reminiscent of NASA Mission Control and modern flight displays (glass cockpit).
- References: Kerbal Space Program (maneuver planning & orbital mechanics), NASA Eyes on the Solar System (real planetary positions and trajectory tracking), Juno: New Origins / SimpleRockets 2.
- View: 3D interactive flight and map view · Camera: Dual-mode — Spacecraft Tracking Camera (free orbit, focus on vehicle) and Solar System Map View (tactical orbital map with zoom from planetary orbit to interplanetary scale).

## First minute
The player starts at the Flight Operations Briefing screen with their first mission selected (e.g. Apollo 11 Lunar Landing or Artemis I translunar injection). They inspect the vehicle's dry mass, fuel mass, and calculated $\Delta v$ budget against mission requirements. With one click, they transition into Orbital Operations in low Earth orbit. A maneuver node prompt highlights the Trans-Lunar Injection (TLI) burn window; dragging the prograde handle stretches the trajectory into an elliptical lunar transfer orbit. The player engages time-warp, aligns to the burn vector, and fires the service engine.

## Challenge
Orbital mechanics forgive nothing: insufficient $\Delta v$ leaves spacecraft stranded in useless orbits, burns executed off-angle miss planetary encounters entirely, and payload mass directly degrades maneuver capability via the Tsiolkovsky rocket equation ($\Delta v = I_{sp} \cdot g_0 \cdot \ln(m_0 / m_f)$). The player must calculate margins, manage life support / power budgets, and time burns precisely.

## Core loop
1. **Mission Briefing & Vehicle Configuration:** Review mission targets, orbital parameters, and scientific payloads; select and configure authentic NASA spacecraft stages to meet the $\Delta v$ margin.
2. **Trajectory Planning:** Place maneuver nodes on orbital trajectories to plan orbital transfers, inclination changes, and planetary insertions.
3. **Flight Execution & Telemetry Tracking:** Execute attitude alignment, ignite propulsion systems during burn windows, and monitor real-time telemetry ($\Delta v$ spent, orbital velocity, apoapsis/periapsis).
4. **Mission Success & Evaluation:** Achieve orbital insertion, deploy payloads, and review mission efficiency scores against historical NASA mission metrics.

## Goal & fail state
- **Goal:** Successfully achieve target orbital regimes or planetary destinations within mission time limits, $\Delta v$ constraints, and payload safety criteria.
- **Fail State:** Running out of propellant before achieving stable orbit, burn trajectory escaping into deep space / crashing into celestial bodies, or depleting spacecraft electrical power.

## Features
- [ ] Decoupled NASA Vehicle Architecture (`data/spacecraft/`) with mass, $I_{sp}$, thrust, and staging specs.
- [ ] Decoupled NASA Mission Architecture (`data/missions/`) with historical parameters, launch windows, and orbit requirements.
- [ ] Decoupled Solar System Celestial Body System (`data/celestial/`) with gravitational parameters ($\mu$), radii, and orbital elements.
- [ ] Keplerian 2-Body Orbital Propagation & Trajectory Predictor.
- [ ] Interactive Maneuver Node Planner (Prograde, Retrograde, Normal, Radial, $\Delta v$ budget indicator).
- [ ] Real-time Mission Control Telemetry HUD (Altitude, Velocity, Orbit Period, Apoapsis/Periapsis, Propellant Remaining).
- [ ] Time Acceleration & Flight Execution Controller (Physics stepping from 1x to 10,000x).

## Your systems
- Spacecraft Telemetry & Staging System · in the slice
- Mission Definition & Objective Evaluator · in the slice
- Orbital Propagation & Maneuver Node System · in the slice
- NASA Mission Control Telemetry HUD · in the slice
- Solar System Orbital Map & Flight View · in the slice
- Atmospheric Reentry & Aerobraking Simulation · later
- Science Payload Experiment Activation & Data Transmission · later

## Keep
- Data-driven configuration architecture decoupling all NASA spacecraft and mission data from game simulation logic.

## Avoid
- No fantasy or unphysical warp drives; physics must respect real celestial mechanics and the rocket equation.
- No hardcoded spacecraft stats in UI or game logic components.
- No heavy bloated frameworks that prevent fast loading in standard modern web browsers.

## Out of scope
- Full N-body gravity simulation (using patched conics / Keplerian 2-body orbits for stability, predictability, and performance).
- Multiplayer or network synchronization (focus exclusively on high-quality single-player simulation).
- Procedural planetary terrain generation at 1:1 scale (focus on orbital, orbital insertion, and trajectory mechanics).

## Build order
1. Data schemas and configuration structure under `data/` for spacecraft, missions, and celestial bodies.
2. Core Orbital Mechanics Engine (Keplerian orbital state vectors, vis-viva equation, Tsiolkovsky rocket equation).
3. Telemetry HUD and Mission Execution interface with maneuver planning and time-warp.
4. Mission Evaluation & Historical NASA Mission Scenarios (e.g., Apollo, Artemis, Voyager).

---
**Kill condition:** If orbital calculations in browser WebGL/Canvas introduce numerical instability or make orbital transfers feel unintuitive rather than accessible and scientifically sound.

**Who it's for / what they feel:** Space exploration enthusiasts, NASA Space Apps Challenge judges, and simulation fans who want to feel like real NASA mission planners and flight controllers.

**Games you love / don't:** Love Kerbal Space Program (real rocket physics and joy of orbital rendezvous) and NASA Eyes (clean visual presentation of real mission timelines); don't love over-complicated spreadsheets without visual trajectory feedback.

