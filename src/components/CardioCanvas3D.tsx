import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MultiVesselAssessment, VesselMetrics } from '../types/cardiac';

export type CameraPresetType = 'fullbody' | 'thorax' | 'cardiac' | 'lad' | 'rca' | 'lcx' | 'posterior';

interface CardioCanvas3DProps {
  assessment: MultiVesselAssessment;
  heartRate: number; // bpm (40 - 160)
  activeVessel: string | null;
  onSelectVessel: (vesselId: 'LMCA' | 'LAD' | 'LCx' | 'RCA' | null) => void;
  showFullBody: boolean;
  showSystemicVessels: boolean;
  showHeartMuscle: boolean;
  showCoronaries: boolean;
  showPlaque: boolean;
  showFlowParticles: boolean;
  showIschemiaHeatmap: boolean;
  cameraPreset: CameraPresetType;
  onCameraChange?: (preset: CameraPresetType) => void;
}

export const CardioCanvas3D: React.FC<CardioCanvas3DProps> = ({
  assessment,
  heartRate,
  activeVessel,
  onSelectVessel,
  showFullBody,
  showSystemicVessels,
  showHeartMuscle,
  showCoronaries,
  showPlaque,
  showFlowParticles,
  showIschemiaHeatmap,
  cameraPreset,
  onCameraChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Groups and objects
  const fullBodyGroupRef = useRef<THREE.Group | null>(null);
  const systemicVesselsGroupRef = useRef<THREE.Group | null>(null);
  const heartGroupRef = useRef<THREE.Group | null>(null);
  const coronaryGroupRef = useRef<THREE.Group | null>(null);
  const plaqueMarkersGroupRef = useRef<THREE.Group | null>(null);
  const flowParticleSystemRef = useRef<THREE.Points | null>(null);
  const scanRingRef = useRef<THREE.Mesh | null>(null);

  // Camera targets
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.8, 6.5));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.8, 0));

  // Myocardial territory mesh references
  const anteriorMeshRef = useRef<THREE.Mesh | null>(null);
  const lateralMeshRef = useRef<THREE.Mesh | null>(null);
  const inferiorMeshRef = useRef<THREE.Mesh | null>(null);

  // Vessel meshes map for raycasting
  const vesselMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Tooltip state
  const [hoveredInfo, setHoveredInfo] = useState<{
    name: string;
    stenosis?: number;
    ffr?: number;
    territory?: string;
    x: number;
    y: number;
  } | null>(null);

  // 1. Initialize Three.js Scene, Camera, Renderer, Controls
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814); // Deep space slate
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 6.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment (RoomEnvironment per Three.js skill)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 26;
    controls.minDistance = 1.2;
    controls.target.set(0, 1.8, 0);
    controlsRef.current = controls;

    // Professional Medical Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-6, 3, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.1);
    rimLight.position.set(0, -4, -5);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
    scene.add(ambientLight);

    // Medical Holo-Platform Pedestal (Circular glowing base)
    const platformGeo = new THREE.CylinderGeometry(4.5, 4.8, 0.2, 48);
    const platformMat = new THREE.MeshPhysicalMaterial({
      color: 0x090d16,
      roughness: 0.2,
      metalness: 0.8,
      clearcoat: 0.8,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -6.5;
    scene.add(platform);

    const gridHelper = new THREE.GridHelper(12, 24, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -6.39;
    scene.add(gridHelper);

    // Build the anatomical components
    buildSceneContent(scene);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // 2. Build Procedural Anatomical 3D Models
  const buildSceneContent = (scene: THREE.Scene) => {
    // A. FULL HUMAN BODY (Medical Cyber-Glass Anatomical Hologram)
    const fullBodyGroup = new THREE.Group();
    fullBodyGroupRef.current = fullBodyGroup;
    scene.add(fullBodyGroup);

    // Sleek, luminous anatomical glass material
    const holoGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      side: THREE.DoubleSide,
    });

    // 1. Head & Cranium
    const headGeo = new THREE.SphereGeometry(0.72, 24, 24);
    headGeo.scale(0.85, 1.08, 0.95);
    const headMesh = new THREE.Mesh(headGeo, holoGlassMat);
    headMesh.position.set(0, 4.35, 0);
    fullBodyGroup.add(headMesh);

    // 2. Neck
    const neckGeo = new THREE.CylinderGeometry(0.34, 0.4, 0.7, 20);
    const neckMesh = new THREE.Mesh(neckGeo, holoGlassMat);
    neckMesh.position.set(0, 3.5, 0);
    fullBodyGroup.add(neckMesh);

    // 3. Thorax & Chest Contour
    const chestGeo = new THREE.CylinderGeometry(1.35, 1.15, 2.3, 24);
    chestGeo.scale(1.12, 1.0, 0.72);
    const chestMesh = new THREE.Mesh(chestGeo, holoGlassMat);
    chestMesh.position.set(0, 2.1, 0);
    fullBodyGroup.add(chestMesh);

    // Rib cage arches (Clean surgical titanium/bone)
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.28,
      roughness: 0.5,
      metalness: 0.2,
    });
    for (let i = 0; i < 7; i++) {
      const y = 2.8 - i * 0.3;
      const radius = 1.3 - Math.abs(i - 3) * 0.08;
      const ribCurve = new THREE.EllipseCurve(0, 0, radius, radius * 0.72, 0, Math.PI * 1.82, false, 0);
      const points = ribCurve.getPoints(24).map((p) => new THREE.Vector3(p.x, y, p.y * 0.8 - 0.08));
      const ribPath = new THREE.CatmullRomCurve3(points);
      const ribGeo = new THREE.TubeGeometry(ribPath, 20, 0.028, 6, false);
      fullBodyGroup.add(new THREE.Mesh(ribGeo, ribMat));
    }

    // Sternum
    const sternumGeo = new THREE.BoxGeometry(0.16, 1.7, 0.05);
    const sternum = new THREE.Mesh(sternumGeo, ribMat);
    sternum.position.set(0, 2.2, 0.9);
    fullBodyGroup.add(sternum);

    // 4. Abdomen & Lumbar
    const abdomenGeo = new THREE.CylinderGeometry(1.15, 1.1, 1.7, 24);
    abdomenGeo.scale(1.05, 1.0, 0.75);
    const abdomenMesh = new THREE.Mesh(abdomenGeo, holoGlassMat);
    abdomenMesh.position.set(0, 0.15, 0);
    fullBodyGroup.add(abdomenMesh);

    // 5. Pelvis & Hips
    const pelvisGeo = new THREE.CylinderGeometry(1.1, 0.95, 1.1, 24);
    pelvisGeo.scale(1.15, 1.0, 0.8);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, holoGlassMat);
    pelvisMesh.position.set(0, -1.2, 0);
    fullBodyGroup.add(pelvisMesh);

    // 6. Arms & Shoulders
    const leftArmGeo = new THREE.CylinderGeometry(0.28, 0.2, 3.4, 16);
    const leftArm = new THREE.Mesh(leftArmGeo, holoGlassMat);
    leftArm.position.set(-1.95, 1.2, 0);
    leftArm.rotation.z = 0.08;

    const rightArmGeo = new THREE.CylinderGeometry(0.28, 0.2, 3.4, 16);
    const rightArm = new THREE.Mesh(rightArmGeo, holoGlassMat);
    rightArm.position.set(1.95, 1.2, 0);
    rightArm.rotation.z = -0.08;
    fullBodyGroup.add(leftArm, rightArm);

    // 7. Thighs & Lower Extremities
    const legGeo = new THREE.CylinderGeometry(0.46, 0.28, 4.9, 18);
    const leftLeg = new THREE.Mesh(legGeo, holoGlassMat);
    leftLeg.position.set(-0.65, -3.9, 0);
    const rightLeg = new THREE.Mesh(legGeo, holoGlassMat);
    rightLeg.position.set(0.65, -3.9, 0);
    fullBodyGroup.add(leftLeg, rightLeg);

    // Holographic Medical Laser Scanning Ring
    const ringGeo = new THREE.TorusGeometry(2.2, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const scanRing = new THREE.Mesh(ringGeo, ringMat);
    scanRing.rotation.x = Math.PI / 2;
    scanRing.position.y = 1.8;
    fullBodyGroup.add(scanRing);
    scanRingRef.current = scanRing;

    // B. SYSTEMIC ARTERIAL TREE (Gleaming Ruby conduits)
    const systemicGroup = new THREE.Group();
    systemicVesselsGroupRef.current = systemicGroup;
    scene.add(systemicGroup);

    const arterialMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      roughness: 0.25,
      metalness: 0.3,
      clearcoat: 0.8,
      emissive: 0xbe123c,
      emissiveIntensity: 0.35,
    });

    // Carotids to brain
    const carotidLPts = [new THREE.Vector3(-0.18, 2.9, 0.05), new THREE.Vector3(-0.2, 3.7, 0.05), new THREE.Vector3(-0.18, 4.3, 0.1)];
    const carotidRPts = [new THREE.Vector3(0.12, 2.85, 0.08), new THREE.Vector3(0.18, 3.7, 0.05), new THREE.Vector3(0.18, 4.3, 0.1)];
    systemicGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(carotidLPts), 16, 0.045, 8, false), arterialMat),
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(carotidRPts), 16, 0.045, 8, false), arterialMat)
    );

    // Brachial arteries to arms
    const brachialLPts = [new THREE.Vector3(-0.45, 2.8, -0.05), new THREE.Vector3(-1.7, 2.6, 0), new THREE.Vector3(-1.95, 1.2, 0)];
    const brachialRPts = [new THREE.Vector3(0.2, 2.8, 0.05), new THREE.Vector3(1.7, 2.6, 0), new THREE.Vector3(1.95, 1.2, 0)];
    systemicGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(brachialLPts), 16, 0.04, 8, false), arterialMat),
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(brachialRPts), 16, 0.04, 8, false), arterialMat)
    );

    // Abdominal Aorta descending
    const abdAortaPts = [new THREE.Vector3(-0.08, 1.6, -0.15), new THREE.Vector3(-0.06, 0.4, -0.15), new THREE.Vector3(-0.04, -0.75, -0.1)];
    systemicGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(abdAortaPts), 20, 0.12, 12, false), arterialMat));

    // Iliac and Femoral Arteries
    const iliacLPts = [new THREE.Vector3(-0.04, -0.75, -0.1), new THREE.Vector3(-0.4, -1.3, 0), new THREE.Vector3(-0.65, -3.8, 0.05)];
    const iliacRPts = [new THREE.Vector3(-0.04, -0.75, -0.1), new THREE.Vector3(0.4, -1.3, 0), new THREE.Vector3(0.65, -3.8, 0.05)];
    systemicGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(iliacLPts), 24, 0.06, 8, false), arterialMat),
      new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(iliacRPts), 24, 0.06, 8, false), arterialMat)
    );

    // C. THE HEART & GREAT VESSELS (Vibrant Medical-Grade Cardiac Anatomy)
    const heartGroup = new THREE.Group();
    heartGroupRef.current = heartGroup;
    scene.add(heartGroup);

    // Anatomical location in mediastinum
    heartGroup.position.set(-0.15, 1.95, 0.15);
    heartGroup.rotation.z = -0.32;
    heartGroup.rotation.y = 0.22;
    heartGroup.rotation.x = 0.18;

    // 1. Aorta & Aortic Arch (Polished Medical Arterial Crimson with high clearcoat)
    const aortaPoints = [
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.04, 0.9, 0.05),
      new THREE.Vector3(-0.18, 1.45, 0),
      new THREE.Vector3(-0.55, 1.55, -0.2),
      new THREE.Vector3(-0.75, 1.1, -0.35),
      new THREE.Vector3(-0.7, -0.6, -0.4),
    ];
    const aortaCurve = new THREE.CatmullRomCurve3(aortaPoints);
    const aortaMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      roughness: 0.2,
      metalness: 0.2,
      clearcoat: 0.9,
      emissive: 0xbe123c,
      emissiveIntensity: 0.3,
    });
    heartGroup.add(new THREE.Mesh(new THREE.TubeGeometry(aortaCurve, 48, 0.28, 16, false), aortaMat));

    // Arch branches (Brachiocephalic, Carotid, Subclavian)
    [
      { s: new THREE.Vector3(-0.1, 1.45, 0.02), e: new THREE.Vector3(0.12, 1.9, 0.08) },
      { s: new THREE.Vector3(-0.3, 1.52, -0.06), e: new THREE.Vector3(-0.25, 1.95, 0.0) },
      { s: new THREE.Vector3(-0.5, 1.48, -0.16), e: new THREE.Vector3(-0.58, 1.9, -0.1) },
    ].forEach((b) => {
      heartGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(b.s, b.e), 8, 0.075, 10, false), aortaMat));
    });

    // 2. Pulmonary Trunk (Clean sapphire blue)
    const pulmoPoints = [new THREE.Vector3(0.15, 0.15, 0.18), new THREE.Vector3(0.1, 0.75, 0.25), new THREE.Vector3(-0.25, 1.05, 0.08)];
    const pulmoMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.2,
      clearcoat: 0.8,
    });
    heartGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pulmoPoints), 24, 0.24, 16, false), pulmoMat));

    // 3. Ventricular Myocardium (Vibrant, oxygenated ruby red, NOT muddy brown!)
    const myocardialMat = new THREE.MeshPhysicalMaterial({
      color: 0xe11d48, // Vibrant medical crimson
      roughness: 0.3,
      metalness: 0.08,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
      emissive: 0x9f1239,
      emissiveIntensity: 0.25,
    });

    const lvGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const pos = lvGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      let x = pos.getX(i);
      let z = pos.getZ(i);
      if (y < 0) {
        const taper = 1.0 + y * 0.42;
        pos.setX(i, x * taper);
        pos.setZ(i, z * taper);
      }
      if (z > 0) pos.setZ(i, z * 1.15);
    }
    lvGeo.computeVertexNormals();

    const lvMesh = new THREE.Mesh(lvGeo, myocardialMat);
    lvMesh.position.set(-0.18, -0.28, 0.03);
    lvMesh.scale.set(0.95, 1.25, 0.85);
    heartGroup.add(lvMesh);

    // Right Ventricle & Atria
    const rvMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 20), myocardialMat);
    rvMesh.position.set(0.48, -0.22, 0.08);
    rvMesh.scale.set(0.85, 1.1, 0.75);
    heartGroup.add(rvMesh);

    const atriaMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), myocardialMat);
    atriaMesh.position.set(0.55, 0.42, -0.15);
    heartGroup.add(atriaMesh);

    // 4. Myocardial Ischemia / Perfusion Overlays (SPECT Medical False-Color)
    // Normal = Emerald/Cyan glow, Ischemic = Electric Amber or Magenta Warning
    const antGeo = new THREE.SphereGeometry(0.87, 20, 20, 0, Math.PI * 0.9, 0, Math.PI * 0.65);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.45, roughness: 0.4 });
    const antMesh = new THREE.Mesh(antGeo, antMat);
    antMesh.position.copy(lvMesh.position);
    antMesh.scale.copy(lvMesh.scale);
    antMesh.rotation.y = -0.4;
    heartGroup.add(antMesh);
    anteriorMeshRef.current = antMesh;

    const latGeo = new THREE.SphereGeometry(0.87, 20, 20, Math.PI * 0.85, Math.PI * 0.6, 0, Math.PI * 0.65);
    const latMat = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.45, roughness: 0.4 });
    const latMesh = new THREE.Mesh(latGeo, latMat);
    latMesh.position.copy(lvMesh.position);
    latMesh.scale.copy(lvMesh.scale);
    heartGroup.add(latMesh);
    lateralMeshRef.current = latMesh;

    const infGeo = new THREE.SphereGeometry(0.82, 20, 20, Math.PI * 1.4, Math.PI * 0.8, 0, Math.PI * 0.65);
    const infMat = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.45, roughness: 0.4 });
    const infMesh = new THREE.Mesh(infGeo, infMat);
    infMesh.position.set(0.24, -0.25, -0.08);
    infMesh.scale.set(0.9, 1.15, 0.85);
    heartGroup.add(infMesh);
    inferiorMeshRef.current = infMesh;

    // D. HIGH-PRECISION CORONARY ARTERIES & CLINICAL PLAQUE MARKERS
    const coronaryGroup = new THREE.Group();
    coronaryGroupRef.current = coronaryGroup;
    heartGroup.add(coronaryGroup);

    const plaqueMarkersGroup = new THREE.Group();
    plaqueMarkersGroupRef.current = plaqueMarkersGroup;
    heartGroup.add(plaqueMarkersGroup);

    buildCoronaries(coronaryGroup, plaqueMarkersGroup);

    // E. Dynamic Blood Flow Stream
    const particleCount = 280;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 0.35;
      particlePositions[i * 3 + 1] = 4.0 - Math.random() * 8.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;

      particleColors[i * 3] = 1.0;
      particleColors[i * 3 + 1] = 0.25 + Math.random() * 0.2;
      particleColors[i * 3 + 2] = 0.2;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const flowParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(flowParticles);
    flowParticleSystemRef.current = flowParticles;
  };

  // Build Coronary Arteries (LMCA, LAD, LCx, RCA) with Clinical CTA Measurement Rings
  const buildCoronaries = (coronaryGroup: THREE.Group, plaqueMarkersGroup: THREE.Group) => {
    while (coronaryGroup.children.length > 0) coronaryGroup.remove(coronaryGroup.children[0]);
    while (plaqueMarkersGroup.children.length > 0) plaqueMarkersGroup.remove(plaqueMarkersGroup.children[0]);
    vesselMeshesRef.current.clear();

    const arteryMat = (colorHex: number, isHigh: boolean) =>
      new THREE.MeshPhysicalMaterial({
        color: isHigh ? 0xf59e0b : colorHex,
        roughness: 0.2,
        metalness: 0.25,
        clearcoat: 0.9,
        emissive: isHigh ? 0xd97706 : 0xbe123c,
        emissiveIntensity: isHigh ? 0.9 : 0.25,
      });

    // 1. LMCA (Left Main)
    const lmcaPts = [new THREE.Vector3(-0.02, 0.32, 0.16), new THREE.Vector3(-0.18, 0.3, 0.3), new THREE.Vector3(-0.35, 0.26, 0.42)];
    const lmcaMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lmcaPts), 14, 0.068, 12, false), arteryMat(0xf43f5e, activeVessel === 'LMCA'));
    lmcaMesh.userData = { vesselId: 'LMCA', name: assessment.LMCA.name };
    coronaryGroup.add(lmcaMesh);
    vesselMeshesRef.current.set('LMCA', lmcaMesh);

    // 2. LAD ("Widowmaker")
    const ladPts = [
      new THREE.Vector3(-0.35, 0.26, 0.42),
      new THREE.Vector3(-0.3, 0.05, 0.62),
      new THREE.Vector3(-0.25, -0.28, 0.75),
      new THREE.Vector3(-0.2, -0.65, 0.68),
      new THREE.Vector3(-0.1, -1.02, 0.45),
    ];
    const ladMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ladPts), 24, 0.06, 12, false), arteryMat(0xf43f5e, activeVessel === 'LAD'));
    ladMesh.userData = { vesselId: 'LAD', name: assessment.LAD.name };
    coronaryGroup.add(ladMesh);
    vesselMeshesRef.current.set('LAD', ladMesh);

    // Diagonal D1
    const d1Pts = [new THREE.Vector3(-0.27, -0.12, 0.7), new THREE.Vector3(-0.48, -0.32, 0.6), new THREE.Vector3(-0.6, -0.5, 0.45)];
    coronaryGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(d1Pts), 12, 0.032, 8, false), arteryMat(0xf43f5e, activeVessel === 'LAD')));

    // 3. LCx (Circumflex)
    const lcxPts = [
      new THREE.Vector3(-0.35, 0.26, 0.42),
      new THREE.Vector3(-0.55, 0.18, 0.32),
      new THREE.Vector3(-0.76, 0.02, 0.1),
      new THREE.Vector3(-0.85, -0.25, -0.15),
      new THREE.Vector3(-0.75, -0.55, -0.35),
    ];
    const lcxMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lcxPts), 24, 0.054, 12, false), arteryMat(0xf97316, activeVessel === 'LCx'));
    lcxMesh.userData = { vesselId: 'LCx', name: assessment.LCx.name };
    coronaryGroup.add(lcxMesh);
    vesselMeshesRef.current.set('LCx', lcxMesh);

    // Obtuse Marginal OM1
    const omPts = [new THREE.Vector3(-0.76, 0.02, 0.1), new THREE.Vector3(-0.9, -0.3, 0.02), new THREE.Vector3(-0.85, -0.62, -0.08)];
    coronaryGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(omPts), 12, 0.03, 8, false), arteryMat(0xf97316, activeVessel === 'LCx')));

    // 4. RCA (Right Coronary)
    const rcaPts = [
      new THREE.Vector3(0.12, 0.32, 0.18),
      new THREE.Vector3(0.4, 0.24, 0.3),
      new THREE.Vector3(0.62, 0.02, 0.25),
      new THREE.Vector3(0.66, -0.35, 0.1),
      new THREE.Vector3(0.55, -0.65, -0.15),
      new THREE.Vector3(0.32, -0.8, -0.32),
    ];
    const rcaMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rcaPts), 24, 0.06, 12, false), arteryMat(0xf59e0b, activeVessel === 'RCA'));
    rcaMesh.userData = { vesselId: 'RCA', name: assessment.RCA.name };
    coronaryGroup.add(rcaMesh);
    vesselMeshesRef.current.set('RCA', rcaMesh);

    // HIGH-TECH CLINICAL STENOSIS INDICATORS (Sleek measurement rings & calcification cuffs instead of brown lumps!)
    const sites: { metrics: VesselMetrics; pos: THREE.Vector3 }[] = [
      { metrics: assessment.LMCA, pos: new THREE.Vector3(-0.24, 0.28, 0.34) },
      { metrics: assessment.LAD, pos: new THREE.Vector3(-0.27, -0.12, 0.7) },
      { metrics: assessment.LCx, pos: new THREE.Vector3(-0.68, 0.1, 0.22) },
      { metrics: assessment.RCA, pos: new THREE.Vector3(0.64, -0.15, 0.18) },
    ];

    sites.forEach(({ metrics, pos }) => {
      if (metrics.stenosis < 15) return;

      const isSevere = metrics.stenosis >= 70;
      const ringColor = isSevere ? 0xf43f5e : 0xf59e0b;

      // 1. High-precision clinical measurement caliper ring encircling the stenosed vessel
      const ringGeo = new THREE.TorusGeometry(0.09, 0.014, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        wireframe: false,
      });
      const caliperRing = new THREE.Mesh(ringGeo, ringMat);
      caliperRing.position.copy(pos);
      caliperRing.lookAt(pos.x + 0.1, pos.y + 0.3, pos.z + 0.2);
      plaqueMarkersGroup.add(caliperRing);

      // 2. Translucent arterial wall atheroma cuff (clean amber/rose translucent band)
      const cuffGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.12, 16);
      const cuffMat = new THREE.MeshPhysicalMaterial({
        color: metrics.plaqueType === 'calcified' ? 0xffffff : ringColor,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        metalness: 0.1,
        emissive: ringColor,
        emissiveIntensity: isSevere ? 0.5 : 0.2,
      });
      const cuff = new THREE.Mesh(cuffGeo, cuffMat);
      cuff.position.copy(pos);
      cuff.lookAt(pos.x + 0.1, pos.y + 0.3, pos.z + 0.2);
      plaqueMarkersGroup.add(cuff);

      // 3. Dense calcification crystal specks (crisp white crystalline facets)
      if (metrics.plaqueType === 'calcified' || metrics.plaqueType === 'mixed_vulnerable') {
        const calGeo = new THREE.OctahedronGeometry(0.035);
        const calMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
        const cal = new THREE.Mesh(calGeo, calMat);
        cal.position.set(pos.x + 0.04, pos.y + 0.03, pos.z + 0.02);
        plaqueMarkersGroup.add(cal);
      }
    });
  };

  // Re-build on assessment change
  useEffect(() => {
    if (coronaryGroupRef.current && plaqueMarkersGroupRef.current) {
      buildCoronaries(coronaryGroupRef.current, plaqueMarkersGroupRef.current);
    }
  }, [assessment, activeVessel]);

  // Layer visibilities & SPECT ischemia color update
  useEffect(() => {
    if (fullBodyGroupRef.current) fullBodyGroupRef.current.visible = showFullBody;
    if (systemicVesselsGroupRef.current) systemicVesselsGroupRef.current.visible = showSystemicVessels;
    if (heartGroupRef.current) heartGroupRef.current.visible = showHeartMuscle;
    if (coronaryGroupRef.current) coronaryGroupRef.current.visible = showCoronaries;
    if (plaqueMarkersGroupRef.current) plaqueMarkersGroupRef.current.visible = showPlaque;
    if (flowParticleSystemRef.current) flowParticleSystemRef.current.visible = showFlowParticles;

    const heatVisible = showIschemiaHeatmap && showHeartMuscle;
    if (anteriorMeshRef.current) anteriorMeshRef.current.visible = heatVisible;
    if (lateralMeshRef.current) lateralMeshRef.current.visible = heatVisible;
    if (inferiorMeshRef.current) inferiorMeshRef.current.visible = heatVisible;

    // SPECT Perfusion Coloring:
    // Normal (>80%) = 0x10b981 (emerald), Mild/Mod (50-70%) = 0xf59e0b (amber), Severe (>70%) = 0xf43f5e (warning red/magenta)
    if (anteriorMeshRef.current) {
      const col = assessment.LAD.stenosis >= 70 ? 0xf43f5e : assessment.LAD.stenosis >= 50 ? 0xf59e0b : 0x10b981;
      (anteriorMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(col);
    }
    if (lateralMeshRef.current) {
      const col = assessment.LCx.stenosis >= 70 ? 0xf43f5e : assessment.LCx.stenosis >= 50 ? 0xf59e0b : 0x10b981;
      (lateralMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(col);
    }
    if (inferiorMeshRef.current) {
      const col = assessment.RCA.stenosis >= 70 ? 0xf43f5e : assessment.RCA.stenosis >= 50 ? 0xf59e0b : 0x10b981;
      (inferiorMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(col);
    }
  }, [showFullBody, showSystemicVessels, showHeartMuscle, showCoronaries, showPlaque, showFlowParticles, showIschemiaHeatmap, assessment]);

  // Camera presets
  useEffect(() => {
    if (!controlsRef.current) return;
    switch (cameraPreset) {
      case 'fullbody':
        targetCamPosRef.current.set(0, -0.6, 14.5);
        targetLookAtRef.current.set(0, -0.6, 0);
        break;
      case 'thorax':
        targetCamPosRef.current.set(0, 1.8, 6.5);
        targetLookAtRef.current.set(0, 1.8, 0);
        break;
      case 'cardiac':
        targetCamPosRef.current.set(0, 1.95, 3.8);
        targetLookAtRef.current.set(-0.15, 1.95, 0.2);
        break;
      case 'lad':
        targetCamPosRef.current.set(-1.0, 1.8, 2.9);
        targetLookAtRef.current.set(-0.35, 1.8, 0.6);
        break;
      case 'rca':
        targetCamPosRef.current.set(2.2, 1.8, 2.3);
        targetLookAtRef.current.set(0.4, 1.8, 0.2);
        break;
      case 'lcx':
        targetCamPosRef.current.set(-2.2, 2.1, 1.8);
        targetLookAtRef.current.set(-0.6, 1.95, 0.1);
        break;
      case 'posterior':
        targetCamPosRef.current.set(0.2, 2.0, -4.2);
        targetLookAtRef.current.set(-0.15, 1.95, -0.2);
        break;
    }
  }, [cameraPreset]);

  // Animation Loop (Heart Beat + Laser Scan Ring)
  useEffect(() => {
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.05);
        controlsRef.current.target.lerp(targetLookAtRef.current, 0.05);
        controlsRef.current.update();
      }

      // Smooth cardiac systolic ejection & diastolic filling
      const beatFreq = (heartRate / 60) * Math.PI * 2;
      const pulse = 1.0 + Math.sin(time * beatFreq) * 0.038;
      if (heartGroupRef.current) {
        heartGroupRef.current.scale.set(pulse, 1.0 - (pulse - 1.0) * 0.6, pulse);
      }

      // Medical scan ring vertical cycle
      if (scanRingRef.current && showFullBody) {
        scanRingRef.current.position.y = 1.8 + Math.sin(time * 0.8) * 4.2;
      }

      // Blood particles flow
      if (flowParticleSystemRef.current && showFlowParticles) {
        const positions = flowParticleSystemRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] -= (0.02 + (heartRate / 100) * 0.025);
          if (positions[i * 3 + 1] < -6.0) {
            positions[i * 3 + 1] = 4.2;
            positions[i * 3] = (Math.random() - 0.5) * 0.35;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
          }
        }
        flowParticleSystemRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [heartRate, showFlowParticles, showFullBody]);

  // Raycasting
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const targetMeshes = Array.from(vesselMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(targetMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const vesselId = hit.userData.vesselId as 'LMCA' | 'LAD' | 'LCx' | 'RCA';
        if (vesselId && assessment[vesselId]) {
          const v = assessment[vesselId];
          setHoveredInfo({
            name: v.name,
            stenosis: v.stenosis,
            ffr: v.estimatedFFR,
            territory: v.myocardialTerritory,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          containerRef.current.style.cursor = 'pointer';
          return;
        }
      }

      setHoveredInfo(null);
      if (containerRef.current) containerRef.current.style.cursor = 'grab';
    },
    [assessment]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const targetMeshes = Array.from(vesselMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(targetMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const vesselId = hit.userData.vesselId as 'LMCA' | 'LAD' | 'LCx' | 'RCA';
        if (vesselId) {
          onSelectVessel(activeVessel === vesselId ? null : vesselId);
        }
      }
    },
    [activeVessel, onSelectVessel]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {/* Real-time Hover HUD Tooltip */}
      {hoveredInfo && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl border border-sky-400/60 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-2xl backdrop-blur-md"
          style={{
            left: `${hoveredInfo.x + 14}px`,
            top: `${hoveredInfo.y + 14}px`,
            maxWidth: '250px',
          }}
        >
          <div className="font-semibold text-sky-400">{hoveredInfo.name}</div>
          {hoveredInfo.stenosis !== undefined && (
            <div className="mt-1 flex items-center justify-between gap-4 font-mono">
              <span className="text-slate-400">Predicted Stenosis:</span>
              <span className={hoveredInfo.stenosis >= 70 ? 'text-rose-400 font-bold' : hoveredInfo.stenosis >= 50 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {hoveredInfo.stenosis}%
              </span>
            </div>
          )}
          {hoveredInfo.ffr !== undefined && (
            <div className="flex items-center justify-between gap-4 font-mono">
              <span className="text-slate-400">Est. FFR:</span>
              <span className={hoveredInfo.ffr <= 0.8 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                {hoveredInfo.ffr}
              </span>
            </div>
          )}
          {hoveredInfo.territory && (
            <div className="mt-1 border-t border-slate-700/60 pt-1 text-[10px] text-slate-400">
              {hoveredInfo.territory}
            </div>
          )}
          <div className="mt-0.5 text-[9px] text-sky-300 font-mono">Click to inspect CTA cross-section</div>
        </div>
      )}

      {/* Top Quick Perspective Pills */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/85 border border-slate-700/70 backdrop-blur-md shadow-xl">
          <button
            onClick={() => onCameraChange?.('thorax')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition ${
              cameraPreset === 'thorax'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Thorax & Heart
          </button>
          <button
            onClick={() => onCameraChange?.('cardiac')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition ${
              cameraPreset === 'cardiac'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Heart Zoom
          </button>
          <button
            onClick={() => onCameraChange?.('lad')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition ${
              cameraPreset === 'lad'
                ? 'bg-rose-500 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            LAD (Widowmaker)
          </button>
          <button
            onClick={() => onCameraChange?.('fullbody')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition ${
              cameraPreset === 'fullbody'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Full Body 3D
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-400 px-1">
          Pulsatile Rhythm: <span className="text-rose-400 font-bold">{heartRate} BPM</span> • Drag to Rotate 360°
        </div>
      </div>
    </div>
  );
};
