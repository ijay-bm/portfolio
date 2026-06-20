import { animated, useSpring } from "@react-spring/three";
import { Line, useCursor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Box } from "@react-three/flex";
import { useState } from "react";
import * as THREE from "three";

// Two-stage "black hole" collapse driven by a 0->1 spring: first flatten in Y
// to a horizontal line (0 -> 0.5), then shrink that line in X to a point
// (0.5 -> 1). Returns an [x, y, z] scale. Reversing the spring plays it
// backwards, so the chevron reappears on its own when the transition ends.
const collapseScale = (c) => {
  const x = c < 0.5 ? 1 : Math.max(0, 1 - (c - 0.5) * 2);
  const y = Math.max(0, 1 - c * 2);
  return [x, y, 1];
};

// Milliseconds the bigger bg container lags the chevron, so they collapse (and
// reappear) one after the other instead of together.
const COLLAPSE_STAGGER = 160;

// Chevron geometry per direction (mirror images of each other across x).
const CHEVRON_POINTS = {
  previous: [
    new THREE.Vector3(-0.015, 0.03, 0.02),
    new THREE.Vector3(0.02, 0, 0.02),
    new THREE.Vector3(-0.015, -0.03, 0.02)
  ],
  next: [
    new THREE.Vector3(0.015, 0.03, 0.02),
    new THREE.Vector3(-0.02, 0, 0.02),
    new THREE.Vector3(0.015, -0.03, 0.02)
  ]
};

// One image-cycle arrow overlaid on an ImagePlane: hover highlight, press-pop on
// click, and a staggered collapse-to-nothing while a transition is animating.
export default function ImageNavButton({
  direction,
  onClick = () => {},
  disabled = false,
  transitioning = false
}) {
  const [hovered, setHovered] = useState(false);
  // Inert while the panel is disabled or an image transition is animating.
  const inert = disabled || transitioning;
  useCursor(hovered && !inert);
  const invalidate = useThree((state) => state.invalidate);

  const { color } = useSpring({
    color: hovered && !inert ? "#9333ea" : "#4a4a4a",
    config: { duration: 200 }
  });

  // Press-pop on click: shrink then spring back for tactile click feedback.
  const [{ scale }, scaleApi] = useSpring(() => ({ scale: 1 }));

  // Staggered "black hole" collapse while transitioning: the chevron implodes
  // first, the bigger bg container a beat later. On the way back the order
  // reverses (container first), via direction-dependent delays.
  const { collapse: chevronCollapse } = useSpring({
    collapse: transitioning ? 1 : 0,
    delay: transitioning ? 0 : COLLAPSE_STAGGER,
    config: { tension: 320, friction: 22 },
    onChange: () => invalidate()
  });
  const { collapse: containerCollapse } = useSpring({
    collapse: transitioning ? 1 : 0,
    delay: transitioning ? COLLAPSE_STAGGER : 0,
    config: { tension: 320, friction: 22 },
    onChange: () => invalidate()
  });

  const handleClick = () => {
    if (inert) {
      return;
    }
    scaleApi.start({
      from: { scale: 0.7 },
      to: { scale: 1 },
      config: { tension: 500, friction: 12 },
      onChange: () => invalidate()
    });
    onClick();
  };

  return (
    <Box
      onPointerOver={() => {
        if (inert) {
          return;
        }
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
      position={[0, 0, 0]}
    >
      <animated.group scale={scale}>
        <animated.group scale={containerCollapse.to(collapseScale)}>
          <mesh position={[0, 0, 0.01]}>
            <roundedPlaneGeometry args={[0.2, 0.2, 0.1]} />
            <animated.meshBasicMaterial color={color} transparent opacity={0.3} />
          </mesh>
        </animated.group>

        <animated.group scale={chevronCollapse.to(collapseScale)}>
          <Line points={CHEVRON_POINTS[direction]} color={"#dedede"} lineWidth={3} />
        </animated.group>
      </animated.group>
    </Box>
  );
}
