/**
 * NASA Space Mission Design & Simulation Game
 * Three.js 3D Orbital Trajectory & Celestial Flight View
 *
 * Renders celestial body (Earth/Moon/Mars), starry skybox,
 * active spacecraft model, and Keplerian orbital trajectory line with apsis markers.
 */

import * as THREE from 'three';
import type { OrbitalSimulation } from './orbital-mechanics';

export class FlightView {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private simulation: OrbitalSimulation;

  private bodyMesh: THREE.Mesh | null = null;
  private atmosphereMesh: THREE.Mesh | null = null;
  private spacecraftGroup: THREE.Group | null = null;
  private trajectoryLine: THREE.Line | null = null;
  private periapsisMarker: THREE.Mesh | null = null;
  private apoapsisMarker: THREE.Mesh | null = null;
  private starsPoints: THREE.Points | null = null;

  private readonly SCENE_BODY_RADIUS = 100;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, simulation: OrbitalSimulation) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.simulation = simulation;

    this.init3DScene();
  }

  public setSimulation(sim: OrbitalSimulation): void {
    this.simulation = sim;
    this.rebuildCelestialBody();
    this.updateTrajectoryGeometry();
  }

  private init3DScene(): void {
    // 1. Starfield skybox
    this.createStarfield();

    // 2. Primary celestial body
    this.rebuildCelestialBody();

    // 3. Spacecraft representation
    this.createSpacecraft();

    // 4. Trajectory line & Apsis markers
    this.createTrajectory();

    // 5. Lighting
    this.setupLighting();

    // Camera initial framing
    this.camera.position.set(0, 220, 360);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x223344, 1.5);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(400, 200, 300);
    this.scene.add(sunLight);
  }

  private createStarfield(): void {
    const starCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 800 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Star color tinting
      const tint = 0.8 + Math.random() * 0.2;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint * (0.9 + Math.random() * 0.1);
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.starsPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starsPoints);
  }

  private rebuildCelestialBody(): void {
    if (this.bodyMesh) {
      this.scene.remove(this.bodyMesh);
      this.bodyMesh.geometry.dispose();
      this.bodyMesh = null;
    }
    if (this.atmosphereMesh) {
      this.scene.remove(this.atmosphereMesh);
      this.atmosphereMesh.geometry.dispose();
      this.atmosphereMesh = null;
    }

    const state = this.simulation.getState();
    const bodyColor = new THREE.Color(state.primaryBody.colorHex || '#3498db');

    // Sphere representation
    const geometry = new THREE.SphereGeometry(this.SCENE_BODY_RADIUS, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.bodyMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.bodyMesh);

    // Atmospheric glow layer if body has atmosphere
    if (state.primaryBody.atmosphere) {
      const atmosGeo = new THREE.SphereGeometry(this.SCENE_BODY_RADIUS * 1.04, 32, 32);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
      });
      this.atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
      this.scene.add(this.atmosphereMesh);
    }
  }

  private createSpacecraft(): void {
    this.spacecraftGroup = new THREE.Group();

    // Central bus / capsule
    const busGeo = new THREE.CylinderGeometry(2.5, 3.5, 9, 12);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.3,
    });
    const bus = new THREE.Mesh(busGeo, busMat);
    bus.rotation.x = Math.PI / 2;
    this.spacecraftGroup.add(bus);

    // Solar panels / wings
    const panelGeo = new THREE.BoxGeometry(16, 0.4, 4);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.9,
      roughness: 0.1,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    this.spacecraftGroup.add(panel);

    // Engine glow beacon
    const beaconGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0, -5);
    this.spacecraftGroup.add(beacon);

    this.scene.add(this.spacecraftGroup);
  }

  private createTrajectory(): void {
    // Trajectory line
    const points = this.simulation.generateTrajectoryPoints(128, this.SCENE_BODY_RADIUS);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    this.trajectoryLine = new THREE.Line(lineGeo, lineMat);
    this.scene.add(this.trajectoryLine);

    // Periapsis marker (Green)
    const peGeo = new THREE.SphereGeometry(3.0, 12, 12);
    const peMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.periapsisMarker = new THREE.Mesh(peGeo, peMat);
    this.scene.add(this.periapsisMarker);

    // Apoapsis marker (Magenta/Amber)
    const apGeo = new THREE.SphereGeometry(3.0, 12, 12);
    const apMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.apoapsisMarker = new THREE.Mesh(apGeo, apMat);
    this.scene.add(this.apoapsisMarker);

    this.updateApsisMarkers();
  }

  public updateTrajectoryGeometry(): void {
    if (!this.trajectoryLine) return;

    const points = this.simulation.generateTrajectoryPoints(128, this.SCENE_BODY_RADIUS);
    this.trajectoryLine.geometry.setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    );

    this.updateApsisMarkers();
  }

  private updateApsisMarkers(): void {
    const state = this.simulation.getState();
    const bodyRadius = state.primaryBody.radiusKm;
    const kmToScene = this.SCENE_BODY_RADIUS / bodyRadius;

    // Periapsis is at theta = 0
    const rpScene = (bodyRadius + state.periapsisAltitudeKm) * kmToScene;
    if (this.periapsisMarker) {
      this.periapsisMarker.position.set(rpScene, 0, 0);
    }

    // Apoapsis is at theta = Math.PI (if bounded)
    if (this.apoapsisMarker) {
      if (state.eccentricity < 1.0) {
        const raScene = (bodyRadius + state.apoapsisAltitudeKm) * kmToScene;
        this.apoapsisMarker.position.set(-raScene, 0, 0);
        this.apoapsisMarker.visible = true;
      } else {
        this.apoapsisMarker.visible = false;
      }
    }
  }

  public render(dt: number): void {
    // Slowly rotate celestial body
    if (this.bodyMesh) {
      this.bodyMesh.rotation.y += 0.002 * (this.simulation.getState().timeWarpFactor === 1 ? 1 : 2);
    }

    // Position spacecraft along orbit
    const pos = this.simulation.getSpacecraftPosition(this.SCENE_BODY_RADIUS);
    if (this.spacecraftGroup) {
      this.spacecraftGroup.position.set(pos.x, pos.y, pos.z);
      // Orient tangent to orbital motion
      const theta = this.simulation.getState().trueAnomalyRad;
      this.spacecraftGroup.rotation.y = -theta + Math.PI / 2;
    }

    // Camera perspective viewing the orbital plane from above
    const angle = Date.now() * 0.0001;
    const distance = 400;
    this.camera.position.x = Math.sin(angle) * distance * 0.5;
    this.camera.position.y = 220;
    this.camera.position.z = Math.cos(angle) * distance;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.bodyMesh) this.scene.remove(this.bodyMesh);
    if (this.atmosphereMesh) this.scene.remove(this.atmosphereMesh);
    if (this.spacecraftGroup) this.scene.remove(this.spacecraftGroup);
    if (this.trajectoryLine) this.scene.remove(this.trajectoryLine);
    if (this.periapsisMarker) this.scene.remove(this.periapsisMarker);
    if (this.apoapsisMarker) this.scene.remove(this.apoapsisMarker);
    if (this.starsPoints) this.scene.remove(this.starsPoints);
  }
}
