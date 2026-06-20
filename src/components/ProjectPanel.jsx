import { animated, useSpring } from "@react-spring/three";
import { useThree } from "@react-three/fiber";
import { Flex } from "@react-three/flex";
import { useEffect, useRef } from "react";
import { BASE_Y } from "../config/camera";
import ImagePlane from "./ImagePlane";
import ProjectCard from "./ProjectCard";

export default function ProjectPanel({
  project,
  index,
  currentProjectIndex,
  initialized = () => {}
}) {
  const distanceFromCurrent = Math.abs(index - currentProjectIndex);
  const isFocused = currentProjectIndex === index;
  const invalidate = useThree((state) => state.invalidate);

  const baseX = distanceFromCurrent * 0.8;
  const baseZ = distanceFromCurrent * -1;

  const { position } = useSpring({
    position: [
      isFocused ? 0 : currentProjectIndex < index ? baseX : -10,
      BASE_Y,
      isFocused ? 0 : currentProjectIndex < index ? baseZ : 0
    ],
    config: {
      mass: 1.5,
      tension: 170,
      friction: 26,
      clamp: false,
      velocity: 0
    },
    // In demand mode the loop is asleep; request a render on each spring tick
    // so the slide animation is actually drawn.
    onChange: () => invalidate()
  });

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!project.imageUrls?.length && !hasInitialized.current) {
      hasInitialized.current = true;
      initialized();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <animated.group position={position}>
      <Flex
        justifyContent="center"
        alignItems="center"
        width={5}
        flexDirection="row-reverse"
        centerAnchor
      >
        {project.imageUrls?.length && (
          <ImagePlane
            scaleX={2.5}
            imageUrls={project.imageUrls}
            marginRight={0.2}
            disabled={index !== currentProjectIndex}
            distanceFromCurrent={distanceFromCurrent}
            initialized={() => initialized()}
          />
        )}

        <ProjectCard
          project={project}
          position={[0, 0, 0]}
          disabled={index !== currentProjectIndex}
        />
      </Flex>
    </animated.group>
  );
}
