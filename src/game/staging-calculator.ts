/**
 * NASA Space Mission Design & Simulation Game
 * Staging & Tsiolkovsky Rocket Equation Engine
 *
 * Provides authentic mass fractions, delta-v staging profiles,
 * thrust-to-weight metrics, and flight readiness evaluation.
 */

import type { SpacecraftDTO, MissionDTO } from '../../data/index';

export const STANDARD_GRAVITY_G0 = 9.80665; // m/s^2

export interface StageCalculationResult {
  stageNumber: number;
  stageName: string;
  engineName: string;
  thrustVacuumKn: number;
  ispVacuumSec: number;
  propellantType: string;
  propellantMassKg: number;
  stageDryMassKg: number;
  burnTimeSec: number;
  deltaVKms: number;
  twrInitial: number;
}

export interface VehicleMassBreakdown {
  baseDryMassKg: number;
  payloadMassKg: number;
  totalDryMassKg: number;
  totalPropellantMassKg: number;
  totalWetMassKg: number;
  enabledPayloadNames: string[];
}

export interface FlightReadinessResult {
  status: 'GO' | 'NO_GO';
  totalDeltaVKms: number;
  requiredDeltaVKms: number;
  marginDeltaVKms: number;
  marginPercent: number;
  statusMessage: string;
  stageProfiles: StageCalculationResult[];
  massBreakdown: VehicleMassBreakdown;
}

/**
 * Computes vehicle mass breakdown given an optional whitelist of enabled scientific payloads.
 */
export function calculateMassBreakdown(
  spacecraft: SpacecraftDTO,
  enabledPayloadNames?: string[]
): VehicleMassBreakdown {
  // Determine payload mass
  let payloadMassKg = 0;
  const activePayloadNames: string[] = [];

  for (const payload of spacecraft.scientific_payloads || []) {
    if (!enabledPayloadNames || enabledPayloadNames.includes(payload.name)) {
      payloadMassKg += payload.mass_kg;
      activePayloadNames.push(payload.name);
    }
  }

  // Determine propellant mass across all stages
  let totalPropellantMassKg = 0;
  for (const stage of spacecraft.stages) {
    totalPropellantMassKg += stage.propellant_mass_kg;
  }

  const baseDryMassKg = spacecraft.dry_mass_kg;
  const totalDryMassKg = baseDryMassKg + payloadMassKg;
  const totalWetMassKg = totalDryMassKg + totalPropellantMassKg;

  return {
    baseDryMassKg,
    payloadMassKg,
    totalDryMassKg,
    totalPropellantMassKg,
    totalWetMassKg,
    enabledPayloadNames: activePayloadNames,
  };
}

/**
 * Calculates stage-by-stage delta-v and propulsion metrics using the Tsiolkovsky equation.
 */
export function calculateStagingProfile(
  spacecraft: SpacecraftDTO,
  enabledPayloadNames?: string[]
): StageCalculationResult[] {
  const massBreakdown = calculateMassBreakdown(spacecraft, enabledPayloadNames);
  const results: StageCalculationResult[] = [];

  if (!spacecraft.stages || spacecraft.stages.length === 0) {
    return results;
  }

  // In multi-stage rocketry, stages fire in sequence (e.g. Stage 1 -> Stage 2 -> Stage 3)
  // For each stage, the initial mass m0 includes current stage dry + prop + payload + remaining stages
  for (let i = 0; i < spacecraft.stages.length; i++) {
    const stage = spacecraft.stages[i];

    // Excess dry mass of vehicle (command module, capsule, bus structure)
    const excessDryMass = Math.max(0, spacecraft.dry_mass_kg - stage.dry_mass_kg);
    const effectiveDryMass = stage.dry_mass_kg + excessDryMass + massBreakdown.payloadMassKg;
    const effectiveWetMass = effectiveDryMass + stage.propellant_mass_kg;

    let deltaVKms = 0;
    if (effectiveDryMass > 0 && effectiveWetMass > effectiveDryMass && stage.propulsion.isp_vacuum_s > 0) {
      const deltaVMs = stage.propulsion.isp_vacuum_s * STANDARD_GRAVITY_G0 * Math.log(effectiveWetMass / effectiveDryMass);
      deltaVKms = deltaVMs / 1000.0;
    }

    // Nominal burn time: t_burn = (m_prop * g0 * Isp) / (Thrust * 1000)
    let burnTimeSec = 0;
    const thrustN = stage.propulsion.thrust_vacuum_kn * 1000;
    if (thrustN > 0 && stage.propulsion.isp_vacuum_s > 0 && stage.propellant_mass_kg > 0) {
      burnTimeSec = (stage.propellant_mass_kg * STANDARD_GRAVITY_G0 * stage.propulsion.isp_vacuum_s) / thrustN;
    }

    // Initial TWR = Thrust / (m0 * g0)
    let twrInitial = 0;
    if (effectiveWetMass > 0 && thrustN > 0) {
      twrInitial = thrustN / (effectiveWetMass * STANDARD_GRAVITY_G0);
    }

    results.push({
      stageNumber: stage.stage_number,
      stageName: stage.stage_name,
      engineName: stage.propulsion.engine_name,
      thrustVacuumKn: stage.propulsion.thrust_vacuum_kn,
      ispVacuumSec: stage.propulsion.isp_vacuum_s,
      propellantType: stage.propellant_type,
      propellantMassKg: stage.propellant_mass_kg,
      stageDryMassKg: stage.dry_mass_kg,
      burnTimeSec: Math.round(burnTimeSec),
      deltaVKms: Number(deltaVKms.toFixed(3)),
      twrInitial: Number(twrInitial.toFixed(2)),
    });
  }

  return results;
}

/**
 * Evaluates whether the configured spacecraft has adequate delta-V margin for the target mission.
 */
export function evaluateFlightReadiness(
  spacecraft: SpacecraftDTO,
  mission: MissionDTO,
  enabledPayloadNames?: string[]
): FlightReadinessResult {
  const stageProfiles = calculateStagingProfile(spacecraft, enabledPayloadNames);
  const massBreakdown = calculateMassBreakdown(spacecraft, enabledPayloadNames);

  let totalDeltaVKms = 0;
  for (const stage of stageProfiles) {
    totalDeltaVKms += stage.deltaVKms;
  }
  totalDeltaVKms = Number(totalDeltaVKms.toFixed(3));

  const requiredDeltaVKms = mission.delta_v_budget.minimum_required_kms;
  const marginDeltaVKms = Number((totalDeltaVKms - requiredDeltaVKms).toFixed(3));
  const marginPercent = requiredDeltaVKms > 0 ? Number(((marginDeltaVKms / requiredDeltaVKms) * 100).toFixed(1)) : 0;

  const isGo = totalDeltaVKms >= requiredDeltaVKms;

  let statusMessage = '';
  if (isGo) {
    statusMessage = `GO FOR FLIGHT: Spacecraft delivers ${totalDeltaVKms.toFixed(2)} km/s against required ${requiredDeltaVKms.toFixed(2)} km/s (+${marginPercent}% margin).`;
  } else {
    statusMessage = `NO-GO: Deficit of ${Math.abs(marginDeltaVKms).toFixed(2)} km/s (${marginPercent}%). Total delta-v ${totalDeltaVKms.toFixed(2)} km/s is below mission requirement ${requiredDeltaVKms.toFixed(2)} km/s.`;
  }

  return {
    status: isGo ? 'GO' : 'NO_GO',
    totalDeltaVKms,
    requiredDeltaVKms,
    marginDeltaVKms,
    marginPercent,
    statusMessage,
    stageProfiles,
    massBreakdown,
  };
}

