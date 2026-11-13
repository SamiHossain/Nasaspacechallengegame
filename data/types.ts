/**
 * NASA Space Mission Design & Simulation Game
 * Data Architecture & Registry Type Definitions
 *
 * Implements wire-format DTOs for `data/spacecraft.json` and `data/missions.json`,
 * meeting .claude/rules/data-files.md (snake_case JSON schemas) and providing
 * strongly-typed domain interfaces.
 */

/* =========================================================================
   1. Wire Format DTOs (snake_case matching JSON files)
   ========================================================================= */

export type SpacecraftCategory =
  | 'crewed_spacecraft'
  | 'lunar_module'
  | 'space_probe'
  | 'space_telescope'
  | 'planetary_rover'
  | 'launch_vehicle'
  | 'descent_sky_crane';

export type PropulsionType =
  | 'chemical_liquid'
  | 'solid_rocket'
  | 'ion_electric'
  | 'hypergolic'
  | 'cold_gas'
  | 'nuclear_thermal';

export interface DimensionsDTO {
  height_m: number;
  diameter_m: number;
  span_m: number;
}

export interface PowerSystemDTO {
  type: 'solar' | 'rtg' | 'fuel_cells' | 'batteries';
  output_watts: number;
}

export interface PropulsionSpecDTO {
  engine_name: string;
  engine_count: number;
  thrust_vacuum_kn: number;
  isp_vacuum_s: number;
  throttleable: boolean;
  reignitions_max: number;
}

export interface SpacecraftStageDTO {
  stage_number: number;
  stage_name: string;
  dry_mass_kg: number;
  propellant_mass_kg: number;
  propellant_type: string;
  propulsion: PropulsionSpecDTO;
  delta_v_vacuum_kms: number;
}

export interface ScientificPayloadDTO {
  name: string;
  mass_kg: number;
  power_watts: number;
  description: string;
}

export interface SpacecraftDTO {
  id: string;
  name: string;
  program: string;
  agency: string;
  category: SpacecraftCategory;
  description: string;
  historical_period: string;
  crew_capacity: number;
  dry_mass_kg: number;
  wet_mass_kg: number;
  max_payload_capacity_kg: number;
  dimensions: DimensionsDTO;
  power_system: PowerSystemDTO;
  stages: SpacecraftStageDTO[];
  scientific_payloads: ScientificPayloadDTO[];
  notes?: string;
}

export type SpacecraftRegistryDTO = Record<string, SpacecraftDTO>;

/* ---------------- Mission DTOs ---------------- */

export type TrajectoryType =
  | 'translunar'
  | 'heliocentric_interstellar'
  | 'low_earth_orbit'
  | 'lagrange_l2_halo'
  | 'trans_mars_injection';

export interface OrbitParametersDTO {
  apoapsis_altitude_km: number;
  periapsis_altitude_km: number;
  inclination_deg: number;
  notes?: string;
  destination_name?: string;
}

export interface DeltaVBudgetDTO {
  minimum_required_kms: number;
  recommended_kms: number;
  contingency_margin_percent: number;
}

export interface FlightPhaseDTO {
  phase_number: number;
  phase_name: string;
  duration_days: number;
  required_delta_v_kms: number;
  description: string;
}

export interface MissionObjectiveDTO {
  id: string;
  title: string;
  description: string;
  type: string;
  target_metric?: string;
  target_value?: number;
  unit?: string;
}

export interface HistoricalMilestoneDTO {
  timestamp: string;
  event: string;
}

export interface MissionDTO {
  id: string;
  title: string;
  code: string;
  program: string;
  agency: string;
  launch_date: string;
  origin_body: string;
  target_body: string;
  description: string;
  primary_spacecraft_ids: string[];
  launch_vehicle_id: string;
  launch_site: string;
  trajectory_type: TrajectoryType;
  initial_orbit: OrbitParametersDTO;
  target_orbit: OrbitParametersDTO;
  delta_v_budget: DeltaVBudgetDTO;
  flight_phases: FlightPhaseDTO[];
  primary_objectives: MissionObjectiveDTO[];
  secondary_objectives: MissionObjectiveDTO[];
  historical_milestones: HistoricalMilestoneDTO[];
}

export type MissionRegistryDTO = Record<string, MissionDTO>;

/* =========================================================================
   2. Celestial Body Configuration
   ========================================================================= */

export interface CelestialAtmosphere {
  surfacePressureAtm: number;
  scaleHeightKm: number;
  entryInterfaceAltitudeKm: number;
  hasReentryHeating: boolean;
}

export interface CelestialBodyConfig {
  id: string;
  name: string;
  category: 'star' | 'planet' | 'moon' | 'asteroid' | 'point';
  parentBodyId?: string;
  massKg: number;
  radiusKm: number;
  gravitationalParameterMu: number; // G * M in km^3 / s^2
  surfaceGravityMs2: number;
  semiMajorAxisKm: number;
  orbitalPeriodDays: number;
  orbitalInclinationDeg: number;
  sphereOfInfluenceKm: number;
  rotationPeriodHours: number;
  atmosphere?: CelestialAtmosphere;
  colorHex: string;
}
