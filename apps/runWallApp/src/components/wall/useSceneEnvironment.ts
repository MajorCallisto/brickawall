"use client";

import * as THREE from "three";
import { useState } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Returns the scene environment texture once the Environment component has
 * produced it. Materials that take an explicit envMap need this because the
 * portal-based Environment sets scene.environment after its first frame.
 */
export function useSceneEnvironment() {
  const [environment, setEnvironment] = useState<THREE.Texture | null>(null);
  useFrame(({ scene }) => {
    if (scene.environment !== environment) setEnvironment(scene.environment);
  });
  return environment;
}
