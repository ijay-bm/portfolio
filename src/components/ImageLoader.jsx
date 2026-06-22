import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// In-canvas loading indicator shown where a project image hasn't resolved yet:
// a dim frame with a spinning arc in the brand purple. It keeps the demand-mode
// loop awake (via invalidate) only while it's mounted, so it stops costing
// frames the moment the image is ready and the loader unmounts.
export default function ImageLoader({ width = 2.5, height = 1.4 }) {
  const ringRef = useRef();
  const invalidate = useThree((state) => state.invalidate);

  useFrame(() => {
    if (!ringRef.current) {
      return;
    }
    ringRef.current.rotation.z -= 0.06;
    invalidate();
  });

  const radius = Math.min(width, height) * 0.09;

  return (
    <group position={[0, 0, 0.06]}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#1f1f26" transparent opacity={0.55} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0, 0.01]}>
        <ringGeometry args={[radius * 0.72, radius, 48, 1, 0, Math.PI * 1.4]} />
        <meshBasicMaterial color="#9333ea" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
