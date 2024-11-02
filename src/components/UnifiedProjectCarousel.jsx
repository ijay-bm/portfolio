import { animated, useSpring } from "@react-spring/three";
import { Environment, MeshReflectorMaterial } from "@react-three/drei";
import { Canvas, extend, useThree } from "@react-three/fiber";
import { Flex } from "@react-three/flex";
import { geometry } from "maath";
import React, { useCallback, useEffect, useState } from "react";
import ImagePlane from "./ImagePlane";
import NextButton from "./NextButton";
import PreviousButton from "./PreviousButton";
import ProjectCard from "./ProjectCard";

extend(geometry);

// Separate hook to handle resize
const useResize = () => {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const handleResize = useCallback(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);

  useEffect(() => {
    // Handle both window resize and orientation change
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    // Initial size
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [handleResize]);

  return size;
};

const ProjectPanel = ({
  project,
  index,
  currentProjectIndex,
  cameraZ = 0,
  initialized = () => {}
}) => {
  const { viewport } = useThree();
  const distanceFromCurrent = Math.abs(index - currentProjectIndex);
  const isFocused = currentProjectIndex === index;

  const baseX = distanceFromCurrent * 0.8;
  const baseZ = distanceFromCurrent * -1;

  const { position } = useSpring({
    position: [
      isFocused ? 0 : currentProjectIndex < index ? baseX : -10,
      0.5,
      isFocused ? cameraZ - 6 : currentProjectIndex < index ? baseZ : 0
    ],
    config: {
      mass: 1.5,
      tension: 170,
      friction: 26,
      clamp: false,
      velocity: 0
    }
  });

  return (
    <animated.group position={position}>
      <Flex
        justifyContent="center"
        alignItems="center"
        flexDirection="row-reverse"
        width={5}
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

      <transitionMaterial transparent intensity={0.7} progress={1.0} direction={1.0} />
    </animated.group>
  );
};

const UnifiedProjectCarousel = ({ projects }) => {
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [initializations, initialized] = useState(0);
  const cameraZ = 6;
  const { width, height } = useResize();

  const hasFullyInitialized = initializations === projects.length - 1;

  const handlePrevious = () => {
    setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length);
  };

  const handleNext = () => {
    setCurrentProjectIndex((prev) => (prev + 1) % projects.length);
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className={`absolute flex h-screen w-screen items-center justify-center duration-500 ${hasFullyInitialized && "opacity-0"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 32 32">
          <circle cx={24} cy={12} r={0} fill="currentColor">
            <animate
              attributeName="r"
              begin={0.99}
              calcMode="spline"
              dur="1.5s"
              keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
              repeatCount="indefinite"
              values="0;2;0;0"
            ></animate>
          </circle>
          <circle cx={18} cy={12} r={0} fill="currentColor">
            <animate
              attributeName="r"
              begin={0.67}
              calcMode="spline"
              dur="1.5s"
              keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
              repeatCount="indefinite"
              values="0;2;0;0"
            ></animate>
          </circle>
          <circle cx={12} cy={12} r={0} fill="currentColor">
            <animate
              attributeName="r"
              begin={0.33}
              calcMode="spline"
              dur="1.5s"
              keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
              repeatCount="indefinite"
              values="0;2;0;0"
            ></animate>
          </circle>
          <circle cx={6} cy={12} r={0} fill="currentColor">
            <animate
              attributeName="r"
              begin={0}
              calcMode="spline"
              dur="1.5s"
              keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
              repeatCount="indefinite"
              values="0;2;0;0"
            ></animate>
          </circle>
        </svg>
      </div>

      <Canvas
        className={`duration-500 ${!hasFullyInitialized && "opacity-0"}`}
        key={`${width}-${height}`} // Force canvas recreation on resize
        style={{ width, height }}
        camera={{
          fov: 45,
          near: 0.1,
          far: 200,
          position: [0, 0, cameraZ]
        }}
        resize={{ scroll: false }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#19191F"]} />
        <fog attach="fog" args={["#19191F", 0, 15]} />

        {projects.map((project, index) => (
          <ProjectPanel
            key={index}
            project={project}
            index={index}
            currentProjectIndex={currentProjectIndex}
            totalProjects={projects.length}
            cameraZ={cameraZ}
            initialized={() => initialized((prev) => prev + 1)}
          />
        ))}

        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={2048}
            mixBlur={0.5}
            mixStrength={80}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#050505"
            metalness={0.8}
            transparent={true}
          />
        </mesh>
        <Environment preset="city" />
      </Canvas>

      <PreviousButton
        className="absolute bottom-5 left-5 z-10"
        onClick={handlePrevious}
        disabled={!hasFullyInitialized}
      />
      <NextButton
        className="absolute bottom-5 right-5 z-10"
        onClick={handleNext}
        disabled={!hasFullyInitialized}
      />
    </div>
  );
};

export default UnifiedProjectCarousel;
