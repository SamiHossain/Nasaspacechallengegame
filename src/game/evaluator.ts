/**
 * NASA Space Mission Design & Simulation Game
 * Mission Outcome Evaluator & Historical Benchmark Scoring Engine
 *
 * Evaluates primary and secondary mission objectives, computes an
 * authentic 0-1000 NASA performance score weighted by fuel margin,
 * trajectory accuracy, and objective fulfillment.
 */

import type { MissionDTO, SpacecraftDTO, MissionObjectiveDTO } from '../../data/index';
import type { OrbitalState } from '../sim/orbital-mechanics';

export type MissionOutcomeVerdict = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'MISSION_FAILURE';

export interface EvaluatedObjective {
  id: string;
  title: string;
  description: string;
  isPrimary: boolean;
  completed: boolean;
  metricDetails?: string;
}

export interface ScoreBreakdown {
  objectivesScore: number; // Max 400
  fuelEfficiencyScore: number; // Max 300
  trajectoryAccuracyScore: number; // Max 200
  flightEfficiencyScore: number; // Max 100
  totalScore: number; // Max 1000
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface MissionEvaluationResult {
  verdict: MissionOutcomeVerdict;
  verdictTitle: string;
  verdictDescription: string;
  scoreBreakdown: ScoreBreakdown;
  evaluatedObjectives: EvaluatedObjective[];
  historicalBenchmarkFact: string;
  historicalMilestones: { timestamp: string; event: string }[];
}

/**
 * Evaluates the outcome and performance score of a completed mission flight.
 */
export function evaluateMissionOutcome(
  mission: MissionDTO,
  spacecraft: SpacecraftDTO,
  orbitalState?: Partial<OrbitalState>
): MissionEvaluationResult {
  const isTargetReached = orbitalState?.targetOrbitReached ?? true;
  const isOutOfFuel = orbitalState?.outOfFuel ?? false;
  const propellantRemainingKg = orbitalState?.propellantKg ?? 2000;
  const initialPropellantKg = orbitalState?.initialPropellantKg ?? (spacecraft.stages?.[0]?.propellant_mass_kg || 10000);

  const fuelFraction = initialPropellantKg > 0 ? Math.max(0, Math.min(1, propellantRemainingKg / initialPropellantKg)) : 0;

  // 1. Evaluate Objectives
  const evaluatedObjectives: EvaluatedObjective[] = [];
  let primaryCount = 0;
  let primaryCompleted = 0;
  let secondaryCount = 0;
  let secondaryCompleted = 0;

  for (const obj of mission.primary_objectives || []) {
    primaryCount++;
    const completed = isTargetReached && (!isOutOfFuel || fuelFraction > 0.01);
    if (completed) primaryCompleted++;
    evaluatedObjectives.push({
      id: obj.id,
      title: obj.title,
      description: obj.description,
      isPrimary: true,
      completed,
      metricDetails: obj.target_value ? `Target: ${obj.target_value} ${obj.unit || ''}` : undefined,
    });
  }

  for (const obj of mission.secondary_objectives || []) {
    secondaryCount++;
    // Secondary objective completed if target reached with comfortable fuel margin (>10%)
    const completed = isTargetReached && fuelFraction > 0.1;
    if (completed) secondaryCompleted++;
    evaluatedObjectives.push({
      id: obj.id,
      title: obj.title,
      description: obj.description,
      isPrimary: false,
      completed,
      metricDetails: obj.type,
    });
  }

  // 2. Determine Outcome Verdict
  let verdict: MissionOutcomeVerdict = 'MISSION_FAILURE';
  let verdictTitle = 'MISSION FAILED';
  let verdictDescription = 'Critical flight anomaly: target trajectory was not achieved or fuel was exhausted.';

  if (isTargetReached && primaryCompleted === primaryCount) {
    if (fuelFraction >= 0.05) {
      verdict = 'SUCCESS';
      verdictTitle = 'MISSION ACCOMPLISHED';
      verdictDescription = `All primary mission milestones successfully achieved with nominal vehicle parameters.`;
    } else {
      verdict = 'PARTIAL_SUCCESS';
      verdictTitle = 'PARTIAL MISSION SUCCESS';
      verdictDescription = `Primary objectives were achieved, but vehicle depleted operational fuel reserves.`;
    }
  } else if (isTargetReached || primaryCompleted > 0) {
    verdict = 'PARTIAL_SUCCESS';
    verdictTitle = 'PARTIAL MISSION SUCCESS';
    verdictDescription = `Some mission objectives were satisfied, but flight ended with incomplete trajectory parameters.`;
  }

  // 3. Compute NASA Performance Score (0 - 1000)
  // Objectives Score: 400 points
  const primaryWeight = primaryCount > 0 ? (primaryCompleted / primaryCount) * 300 : 300;
  const secondaryWeight = secondaryCount > 0 ? (secondaryCompleted / secondaryCount) * 100 : 100;
  const objectivesScore = Math.round(primaryWeight + secondaryWeight);

  // Fuel Efficiency Score: 300 points
  const fuelEfficiencyScore = Math.round(fuelFraction * 300);

  // Trajectory Accuracy Score: 200 points
  let trajectoryAccuracyScore = 0;
  if (isTargetReached) {
    trajectoryAccuracyScore = 200;
  } else if (orbitalState?.eccentricity !== undefined && orbitalState.eccentricity < 0.9) {
    trajectoryAccuracyScore = 120;
  } else {
    trajectoryAccuracyScore = 40;
  }

  // Flight Efficiency Score: 100 points
  const flightEfficiencyScore = verdict === 'SUCCESS' ? 100 : verdict === 'PARTIAL_SUCCESS' ? 60 : 20;

  const totalScore = Math.max(0, Math.min(1000, objectivesScore + fuelEfficiencyScore + trajectoryAccuracyScore + flightEfficiencyScore));

  let grade: ScoreBreakdown['grade'] = 'F';
  if (totalScore >= 900) grade = 'A+';
  else if (totalScore >= 800) grade = 'A';
  else if (totalScore >= 700) grade = 'B';
  else if (totalScore >= 600) grade = 'C';
  else if (totalScore >= 500) grade = 'D';

  const scoreBreakdown: ScoreBreakdown = {
    objectivesScore,
    fuelEfficiencyScore,
    trajectoryAccuracyScore,
    flightEfficiencyScore,
    totalScore,
    grade,
  };

  // 4. Historical Benchmark Fact
  const benchmarkFacts: Record<string, string> = {
    apollo_11: `Historical Fact: During the actual Apollo 11 lunar landing on July 20, 1969, Neil Armstrong piloted the LM Eagle manually past a boulder-strewn crater, touching down with only ~25 seconds of descent fuel remaining.`,
    voyager_1_2: `Historical Fact: Voyager 1 utilized gravitational assists from Jupiter and Saturn, becoming the first human-made object to cross the heliopause into interstellar space on August 25, 2012, at a distance of 121 AU.`,
    hubble_deployment_sts_31: `Historical Fact: Deployed from Space Shuttle Discovery at an altitude of 612 km in 1990, Hubble has executed over 1.5 million observations and revolutionized observational cosmology with the discovery of cosmic acceleration.`,
    curiosity_msl: `Historical Fact: MSL Curiosity pioneered the audacious 'Sky Crane' terminal descent touchdown system on August 6, 2012, landing a 900-kg rover precisely in Gale Crater with zero bounced airbags.`,
    jwst_l2_deployment: `Historical Fact: The Ariane 5 launch of JWST on Christmas Day 2021 executed mid-course correction maneuvers so accurately that it preserved over 10 additional years of stationkeeping propellant for science operations.`,
  };

  const historicalBenchmarkFact =
    benchmarkFacts[mission.id] ||
    `NASA missions are engineered with strict delta-V and mass margin reserves to ensure high probability of mission success under unexpected orbital contingencies.`;

  return {
    verdict,
    verdictTitle,
    verdictDescription,
    scoreBreakdown,
    evaluatedObjectives,
    historicalBenchmarkFact,
    historicalMilestones: mission.historical_milestones || [],
  };
}
