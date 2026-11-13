import { describe, it, expect } from 'vitest';
import { spacecraftRegistry, missionRegistry, getSpacecraft, getMission, calculateSpacecraftTotalDeltaV } from '../../data/index';

describe('NASA Data Registry Architecture', () => {
  const top5MissionIds = [
    'apollo_11',
    'voyager_1_2',
    'hubble_deployment_sts_31',
    'jwst_l2_deployment',
    'curiosity_msl',
  ];

  it('contains all Top 5 NASA missions', () => {
    for (const missionId of top5MissionIds) {
      const mission = getMission(missionId);
      expect(mission).toBeDefined();
      expect(mission?.id).toBe(missionId);
      expect(mission?.delta_v_budget.minimum_required_kms).toBeGreaterThan(0);
      expect(mission?.primary_objectives.length).toBeGreaterThan(0);
    }
  });

  it('contains all referenced spacecraft and launch vehicles', () => {
    for (const missionId of top5MissionIds) {
      const mission = getMission(missionId)!;

      // Verify launch vehicle
      const lv = getSpacecraft(mission.launch_vehicle_id);
      expect(lv, `Launch vehicle ${mission.launch_vehicle_id} for mission ${missionId} should exist`).toBeDefined();

      // Verify all primary spacecraft
      for (const craftId of mission.primary_spacecraft_ids) {
        const craft = getSpacecraft(craftId);
        expect(craft, `Spacecraft ${craftId} for mission ${missionId} should exist`).toBeDefined();
      }
    }
  });

  it('calculates theoretical delta-V for staged spacecraft accurately', () => {
    const columbia = getSpacecraft('apollo_csm_columbia')!;
    const deltaV = calculateSpacecraftTotalDeltaV(columbia);
    // Apollo CSM AJ10-137 SPS delta-v is approximately 2.8 km/s
    expect(deltaV).toBeGreaterThan(2.5);
    expect(deltaV).toBeLessThan(3.5);
  });
});

