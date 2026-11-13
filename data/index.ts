/**
 * NASA Space Mission Design & Simulation Game
 * Central Data Registry & Loaders
 */

export * from './types';

import type { SpacecraftDTO, SpacecraftRegistryDTO, MissionDTO, MissionRegistryDTO, CelestialBodyConfig } from './types';

import spacecraftData from './spacecraft.json';
import missionsData from './missions.json';
import earthData from './celestial/earth.json';
import moonData from './celestial/moon.json';

export const spacecraftRegistry: SpacecraftRegistryDTO = spacecraftData as unknown as SpacecraftRegistryDTO;
export const missionRegistry: MissionRegistryDTO = missionsData as unknown as MissionRegistryDTO;

export const celestialBodies: Record<string, CelestialBodyConfig> = {
  earth: earthData as unknown as CelestialBodyConfig,
  moon: moonData as unknown as CelestialBodyConfig,
};

/**
 * Retrieves a spacecraft configuration by ID.
 */
export function getSpacecraft(id: string): SpacecraftDTO | undefined {
  return spacecraftRegistry[id];
}

/**
 * Retrieves a mission configuration by ID.
 */
export function getMission(id: string): MissionDTO | undefined {
  return missionRegistry[id];
}

/**
 * Calculates total theoretical vacuum Delta-V for a spacecraft.
 * If total dry_mass_kg exceeds the stage dry mass (e.g. Command Module payload atop Service Module),
 * it accounts for the full dry mass in the Tsiolkovsky equation.
 */
export function calculateSpacecraftTotalDeltaV(spacecraft: SpacecraftDTO, payloadMassKg: number = 0): number {
  const g0 = 9.80665; // Standard Earth gravitational acceleration (m/s^2)
  let totalDeltaVKms = 0;

  for (const stage of spacecraft.stages) {
    // If the spacecraft has additional vehicle dry mass (e.g. crew module, payload), include it
    const vehicleExcessDryMass = Math.max(0, spacecraft.dry_mass_kg - stage.dry_mass_kg);
    const totalDryMass = stage.dry_mass_kg + vehicleExcessDryMass + payloadMassKg;
    const totalWetMass = totalDryMass + stage.propellant_mass_kg;

    if (totalDryMass > 0 && totalWetMass > totalDryMass && stage.propulsion.isp_vacuum_s > 0) {
      const stageDeltaVMs = stage.propulsion.isp_vacuum_s * g0 * Math.log(totalWetMass / totalDryMass);
      totalDeltaVKms += stageDeltaVMs / 1000.0;
    }
  }

  return totalDeltaVKms;
}
