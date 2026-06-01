"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface TwinVisualizerSceneProps {
  emphasizeLabel: string;
}

function SceneModels() {
  const [dnaModel, setDnaModel] = useState<Object3D | null>(null);
  const [bodyModel, setBodyModel] = useState<Object3D | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      "/models/dna-helix.glb",
      (gltf) => setDnaModel(gltf.scene.clone()),
      undefined,
      () => setDnaModel(null),
    );
    loader.load(
      "/models/human-body.glb",
      (gltf) => setBodyModel(gltf.scene.clone()),
      undefined,
      () => setBodyModel(null),
    );
  }, []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1} />

      {dnaModel ? (
        <primitive object={dnaModel} position={[-1.2, -0.8, 0]} scale={0.8} />
      ) : (
        // Fallback shape shown if no GLB is present yet.
        <mesh position={[-1.2, -0.4, 0]}>
          <torusKnotGeometry args={[0.5, 0.15, 120, 16]} />
          <meshStandardMaterial color="#de8246" />
        </mesh>
      )}

      {bodyModel ? (
        <primitive object={bodyModel} position={[1.2, -1.2, 0]} scale={1.2} />
      ) : (
        <group position={[1.2, -0.8, 0]}>
          <mesh>
            <capsuleGeometry args={[0.35, 1.2, 8, 16]} />
            <meshStandardMaterial color="#3c4f3d" />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#3c4f3d" />
          </mesh>
        </group>
      )}
    </>
  );
}

export default function TwinVisualizerScene({
  emphasizeLabel,
}: TwinVisualizerSceneProps) {
  return (
    <div className="space-y-2">
      <div className="h-72 w-full overflow-hidden rounded-md border border-[#3c4f3d]/10 bg-white">
        <Canvas camera={{ position: [0, 0.8, 5], fov: 45 }}>
          <SceneModels />
          <OrbitControls enablePan={false} minDistance={3} maxDistance={8} />
        </Canvas>
      </div>
      <p className="text-xs text-[#3c4f3d]/70">
        Visual focus: {emphasizeLabel}
      </p>
    </div>
  );
}
