/**
 * NASA Space Mission Design & Simulation Game
 * 2-Body Keplerian Orbital Mechanics & Flight Propagation Engine
 *
 * Implements vis-viva equation, conic trajectory propagation,
 * prograde/retrograde impulse maneuvers, propellant expenditure,
 * and orbital state transitions.
 */

import { celestialBodies, type CelestialBodyConfig, type MissionDTO, type SpacecraftDTO } from '../../data/index';

export const STANDARD_GRAVITY_G0 = 9.80665; // m/s^2

export interface OrbitalState {
  primaryBody: CelestialBodyConfig;
  semiMajorAxisKm: number;
  eccentricity: number;
  periapsisAltitudeKm: number;
  apoapsisAltitudeKm: number;
  trueAnomalyRad: number;
  altitudeKm: number;
  velocityKms: number;
  orbitalPeriodSec: number;
  timeWarpFactor: number;
  propellantKg: number;
  initialPropellantKg: number;
  dryMassKg: number;
  ispVacuumSec: number;
  thrustKn: number;
  availableDeltaVKms: number;
  flightPhaseIndex: number;
  flightPhaseName: string;
  isPaused: boolean;
  targetOrbitReached: boolean;
  outOfFuel: boolean;
}

/**
 * Calculates orbital velocity using the Vis-Viva equation:
 * v = sqrt(mu * (2/r - 1/a))
 * @param mu Standard gravitational parameter (km^3/s^2)
 * @param r Radial distance from body center (km)
 * @param a Semi-major axis (km)
 */
export function calculateVisVivaVelocity(mu: number, r: number, a: number): number {
  if (r <= 0) return 0;
  if (a === Infinity) {
    // Parabolic escape orbit
    return Math.sqrt((2 * mu) / r);
  }
  const term = (2 / r) - (1 / a);
  if (term <= 0) return 0;
  return Math.sqrt(mu * term);
}

/**
 * Calculates orbital period for an elliptical orbit:
 * T = 2 * pi * sqrt(a^3 / mu)
 */
export function calculateOrbitalPeriod(mu: number, a: number): number {
  if (a <= 0 || mu <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
}

/**
 * Calculates radius at a given true anomaly:
 * r(theta) = a * (1 - e^2) / (1 + e * cos(theta))
 */
export function calculateRadialDistance(a: number, e: number, trueAnomalyRad: number): number {
  const p = a * (1 - e * e); // semi-latus rectum
  const denominator = 1 + e * Math.cos(trueAnomalyRad);
  if (denominator <= 0) return a * (1 + e); // clamp
  return p / denominator;
}

export class OrbitalSimulation {
  private state: OrbitalState;
  private mission: MissionDTO;
  private spacecraft: SpacecraftDTO;

  constructor(mission: MissionDTO, spacecraft: SpacecraftDTO) {
    this.mission = mission;
    this.spacecraft = spacecraft;
    this.state = this.initializeState(mission, spacecraft);
  }

  private initializeState(mission: MissionDTO, spacecraft: SpacecraftDTO): OrbitalState {
    const bodyKey = (mission.origin_body || 'earth').toLowerCase();
    const primaryBody = celestialBodies[bodyKey] || celestialBodies.earth;

    const bodyRadiusKm = primaryBody.radiusKm;
    const mu = primaryBody.gravitationalParameterMu;

    // Initial orbit from mission definition
    const periapsisAlt = mission.initial_orbit?.periapsis_altitude_km || 185;
    const apoapsisAlt = mission.initial_orbit?.apoapsis_altitude_km || 185;

    const rp = bodyRadiusKm + periapsisAlt;
    const ra = bodyRadiusKm + apoapsisAlt;

    const a = (rp + ra) / 2;
    const e = Math.abs(ra - rp) / (ra + rp);

    const initialTrueAnomaly = 0; // Start at periapsis
    const r = calculateRadialDistance(a, e, initialTrueAnomaly);
    const altitudeKm = r - bodyRadiusKm;
    const velocityKms = calculateVisVivaVelocity(mu, r, a);
    const period = calculateOrbitalPeriod(mu, a);

    // Staging and propulsion stats
    let totalPropellantKg = 0;
    let avgIsp = 310;
    let totalThrustKn = 100;

    if (spacecraft.stages && spacecraft.stages.length > 0) {
      for (const st of spacecraft.stages) {
        totalPropellantKg += st.propellant_mass_kg;
      }
      const primaryStage = spacecraft.stages[0];
      avgIsp = primaryStage.propulsion.isp_vacuum_s;
      totalThrustKn = primaryStage.propulsion.thrust_vacuum_kn;
    }

    const dryMassKg = spacecraft.dry_mass_kg;
    const availableDeltaVKms = this.calculateDeltaV(dryMassKg, totalPropellantKg, avgIsp);

    const firstPhaseName =
      mission.flight_phases && mission.flight_phases.length > 0
        ? mission.flight_phases[0].phase_name
        : 'Initial Orbital Insertion';

    return {
      primaryBody,
      semiMajorAxisKm: a,
      eccentricity: e,
      periapsisAltitudeKm: periapsisAlt,
      apoapsisAltitudeKm: apoapsisAlt,
      trueAnomalyRad: initialTrueAnomaly,
      altitudeKm,
      velocityKms,
      orbitalPeriodSec: period,
      timeWarpFactor: 1,
      propellantKg: totalPropellantKg,
      initialPropellantKg: totalPropellantKg,
      dryMassKg,
      ispVacuumSec: avgIsp,
      thrustKn: totalThrustKn,
      availableDeltaVKms,
      flightPhaseIndex: 0,
      flightPhaseName: firstPhaseName,
      isPaused: false,
      targetOrbitReached: false,
      outOfFuel: false,
    };
  }

  public getState(): Readonly<OrbitalState> {
    return { ...this.state };
  }

  public setTimeWarp(factor: number): void {
    const validFactors = [1, 10, 100, 1000];
    if (validFactors.includes(factor)) {
      this.state.timeWarpFactor = factor;
    }
  }

  public togglePause(): boolean {
    this.state.isPaused = !this.state.isPaused;
    return this.state.isPaused;
  }

  /**
   * Advances orbital propagation by deltaTime seconds.
   */
  public step(dt: number): void {
    if (this.state.isPaused || dt <= 0) return;

    const effectiveDt = dt * this.state.timeWarpFactor;
    const mu = this.state.primaryBody.gravitationalParameterMu;
    const a = this.state.semiMajorAxisKm;
    const e = this.state.eccentricity;

    // Mean motion n = 2 * pi / T = sqrt(mu / a^3)
    const n = Math.sqrt(mu / Math.pow(a, 3)); // rad/s
    this.state.trueAnomalyRad = (this.state.trueAnomalyRad + n * effectiveDt) % (2 * Math.PI);

    // Compute updated radius, altitude, and orbital velocity
    const r = calculateRadialDistance(a, e, this.state.trueAnomalyRad);
    this.state.altitudeKm = Number((r - this.state.primaryBody.radiusKm).toFixed(2));
    this.state.velocityKms = Number(calculateVisVivaVelocity(mu, r, a).toFixed(3));

    // Check target orbit achievement
    this.checkTargetOrbitObjective();
  }

  /**
   * Applies an instantaneous or short-duration impulse burn along prograde or retrograde vector.
   * @param deltaVKms Burn magnitude in km/s (positive number)
   * @param direction 'prograde' raises opposite apsis, 'retrograde' lowers it
   */
  public applyManeuverBurn(deltaVKms: number, direction: 'prograde' | 'retrograde'): boolean {
    if (this.state.outOfFuel || deltaVKms <= 0) return false;

    const mu = this.state.primaryBody.gravitationalParameterMu;
    const bodyRadius = this.state.primaryBody.radiusKm;
    const r = calculateRadialDistance(this.state.semiMajorAxisKm, this.state.eccentricity, this.state.trueAnomalyRad);

    // Current orbital speed
    const currentSpeed = calculateVisVivaVelocity(mu, r, this.state.semiMajorAxisKm);

    // Limit burn to available propellant delta-v
    const executableDeltaV = Math.min(deltaVKms, this.state.availableDeltaVKms);
    if (executableDeltaV <= 0.001) {
      this.state.outOfFuel = true;
      return false;
    }

    const newSpeed = direction === 'prograde' ? currentSpeed + executableDeltaV : Math.max(0.1, currentSpeed - executableDeltaV);

    // Vis-Viva: 1/a_new = 2/r - v_new^2 / mu
    const invA = (2 / r) - (Math.pow(newSpeed, 2) / mu);
    const newA = invA > 0 ? 1 / invA : Infinity;

    // Angular momentum h = r * v
    const h = r * newSpeed;
    const p = Math.pow(h, 2) / mu; // semi-latus rectum

    let newE = 0;
    if (newA !== Infinity) {
      const eSq = Math.max(0, 1 - (p / newA));
      newE = Math.sqrt(eSq);
    } else {
      newE = 1.0; // parabolic escape
    }

    // New periapsis and apoapsis
    const rp = newA !== Infinity ? newA * (1 - newE) : r;
    const ra = newA !== Infinity ? newA * (1 + newE) : Infinity;

    this.state.semiMajorAxisKm = newA;
    this.state.eccentricity = Number(newE.toFixed(4));
    this.state.periapsisAltitudeKm = Number(Math.max(0, rp - bodyRadius).toFixed(1));
    this.state.apoapsisAltitudeKm = ra !== Infinity ? Number(Math.max(0, ra - bodyRadius).toFixed(1)) : 999999;
    this.state.orbitalPeriodSec = calculateOrbitalPeriod(mu, newA);

    // Propellant expenditure: Tsiolkovsky equation
    // deltaM = m_wet * (1 - exp(-dv / (Isp * g0)))
    const mWet = this.state.dryMassKg + this.state.propellantKg;
    const exhaustVelKms = (this.state.ispVacuumSec * STANDARD_GRAVITY_G0) / 1000.0;
    const propUsedKg = mWet * (1 - Math.exp(-executableDeltaV / exhaustVelKms));

    this.state.propellantKg = Math.max(0, this.state.propellantKg - propUsedKg);
    this.state.availableDeltaVKms = this.calculateDeltaV(this.state.dryMassKg, this.state.propellantKg, this.state.ispVacuumSec);

    if (this.state.propellantKg <= 1.0) {
      this.state.outOfFuel = true;
    }

    this.checkTargetOrbitObjective();
    return true;
  }

  /**
   * Generates a smooth array of Cartesian points for 3D trajectory rendering.
   * Coordinate system: X-Z plane is orbital plane, Y is normal.
   * Scaled relative to celestial body radius = 100 units in three.js scene.
   */
  public generateTrajectoryPoints(segments = 128, sceneScaleRadius = 100): { x: number; y: number; z: number }[] {
    const points: { x: number; y: number; z: number }[] = [];
    const a = this.state.semiMajorAxisKm;
    const e = this.state.eccentricity;
    const bodyRadius = this.state.primaryBody.radiusKm;
    const kmToScene = sceneScaleRadius / bodyRadius;

    const maxTheta = e >= 1 ? Math.PI * 0.8 : 2 * Math.PI;
    const step = maxTheta / segments;

    for (let i = 0; i <= segments; i++) {
      const theta = i * step;
      const rKm = calculateRadialDistance(a, e, theta);
      const rScene = rKm * kmToScene;

      // Orbit lies in X-Z plane
      const x = rScene * Math.cos(theta);
      const z = rScene * Math.sin(theta);
      points.push({ x, y: 0, z });
    }

    return points;
  }

  /**
   * Returns current spacecraft 3D position in scene units.
   */
  public getSpacecraftPosition(sceneScaleRadius = 100): { x: number; y: number; z: number } {
    const bodyRadius = this.state.primaryBody.radiusKm;
    const kmToScene = sceneScaleRadius / bodyRadius;
    const rKm = calculateRadialDistance(this.state.semiMajorAxisKm, this.state.eccentricity, this.state.trueAnomalyRad);
    const rScene = rKm * kmToScene;

    return {
      x: rScene * Math.cos(this.state.trueAnomalyRad),
      y: 0,
      z: rScene * Math.sin(this.state.trueAnomalyRad),
    };
  }

  private calculateDeltaV(dryMassKg: number, propMassKg: number, ispSec: number): number {
    if (dryMassKg <= 0 || propMassKg <= 0 || ispSec <= 0) return 0;
    const wetMass = dryMassKg + propMassKg;
    const dvMs = ispSec * STANDARD_GRAVITY_G0 * Math.log(wetMass / dryMassKg);
    return Number((dvMs / 1000.0).toFixed(3));
  }

  private checkTargetOrbitObjective(): void {
    if (!this.mission.target_orbit) return;

    const targetApoapsis = this.mission.target_orbit.apoapsis_altitude_km;
    const targetPeriapsis = this.mission.target_orbit.periapsis_altitude_km;

    // Tolerance window for achieving target orbit (e.g. within 20% or escape)
    if (this.mission.trajectory_type === 'translunar' || this.mission.trajectory_type === 'heliocentric_interstellar') {
      if (this.state.apoapsisAltitudeKm > 50000 || this.state.eccentricity >= 0.7) {
        this.state.targetOrbitReached = true;
      }
    } else {
      const apoDelta = Math.abs(this.state.apoapsisAltitudeKm - targetApoapsis);
      const periDelta = Math.abs(this.state.periapsisAltitudeKm - targetPeriapsis);
      if (apoDelta < 100 && periDelta < 100) {
        this.state.targetOrbitReached = true;
      }
    }
  }
}
