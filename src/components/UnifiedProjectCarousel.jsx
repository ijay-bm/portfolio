import { animated, useSpring } from "@react-spring/three";
import { Environment, MeshReflectorMaterial } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { Flex } from "@react-three/flex";
import { geometry } from "maath";
import { lazy, Suspense, useCallback, useEffect, useState, useRef } from "react";
import ImagePlane from "./ImagePlane";
import NextButton from "./NextButton";
import PreviousButton from "./PreviousButton";
import ProjectCard from "./ProjectCard";
import { PerformanceMonitor } from "@react-three/drei";

// Lazy-loaded so the perf overlay's code is only downloaded when it's toggled
// on (Shift+P), keeping it out of the default production payload.
const Perf = lazy(() => import("r3f-perf").then((module) => ({ default: module.Perf })));

extend(geometry);

const BASE_Y = 0;

// Vertical field of view of the scene camera, in degrees.
const FOV = 45;
// Focused panel's bounding box in world units, with breathing room. Used to fit
// the camera distance to the viewport so the content never overflows the edges.
const CONTENT_WIDTH = 5.2;
const CONTENT_HEIGHT = 3;

// Camera distance at which a CONTENT_WIDTH x CONTENT_HEIGHT box just fits the
// given viewport. Narrower / taller viewports push the camera back; wide ones
// let it move in closer. Keeps the focused panel framed across aspect ratios
// (the focused panel sits at z=0, so this distance is also its apparent size).
const fitCameraZ = (viewportWidth, viewportHeight) => {
  const aspect = viewportWidth / viewportHeight;
  const halfFov = (FOV * Math.PI) / 180 / 2;
  const distForHeight = CONTENT_HEIGHT / (2 * Math.tan(halfFov));
  const distForWidth = CONTENT_WIDTH / (2 * Math.tan(halfFov) * aspect);
  return Math.max(distForHeight, distForWidth);
};

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

// Detect a low-power / mobile device once at mount. Kept stable for the
// session so the reflector render target and DPR don't thrash on resize or
// orientation change (device class effectively never changes mid-session).
const useIsMobile = () => {
  const [isMobile] = useState(() => {
    if (
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ) {
      return true;
    }
    return typeof window !== "undefined" && window.innerWidth < 640;
  });

  return isMobile;
};

// Minimum sustained FPS (rendering the full scene, reflection included) for a
// device to keep the expensive effects. Below this they're dropped.
const MIN_FPS_FOR_REFLECTION = 50;

// One-shot capability probe: renders the real scene for a moment, measures the
// sustained frame rate (after a warm-up to skip shader / reflector-FBO compile
// spikes), and reports it once so we keep the reflection only on machines that
// can actually hold it.
const DeviceBenchmark = ({ onGraded, sampleMs = 800, warmupFrames = 15 }) => {
  const invalidate = useThree((state) => state.invalidate);
  const stats = useRef({ warmed: 0, frames: 0, start: 0, done: false });

  useFrame(() => {
    const s = stats.current;
    if (s.done) {
      return;
    }
    if (s.warmed < warmupFrames) {
      s.warmed += 1;
      invalidate();
      return;
    }
    if (s.start === 0) {
      s.start = performance.now();
    }
    s.frames += 1;
    const elapsed = performance.now() - s.start;
    if (elapsed >= sampleMs) {
      s.done = true;
      onGraded((s.frames / elapsed) * 1000);
    } else {
      invalidate();
    }
  });

  return null;
};

const ProjectPanel = ({
  project,
  index,
  currentProjectIndex,
  cameraZ = 0,
  initialized = () => {}
}) => {
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
};

const UnifiedProjectCarousel = ({ projects }) => {
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [initializations, initialized] = useState(0);
  // Perf overlay: visible by default in dev, toggleable anywhere with Shift+P.
  const [showPerf, setShowPerf] = useState(import.meta.env.DEV);
  // True briefly during a project change so the demand-mode loop renders
  // continuously while the slide spring animates (its onChange invalidate
  // alone starves for frames in production).
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimer = useRef();
  // Device capability tier from a one-time benchmark: "measuring" until graded,
  // then "high" (keep reflection) or "low" (drop it and lighten the render).
  const [perfTier, setPerfTier] = useState("measuring");
  const { width, height } = useResize();
  const isMobile = useIsMobile();

  // Pull the camera to a distance where the focused panel fits the current
  // viewport instead of overflowing on narrower aspect ratios.
  const cameraZ = fitCameraZ(width, height);

  // Device-tiered render settings: cap the pixel ratio and shrink the
  // reflective-floor render target on mobile, where the reflector's blur
  // passes are the most expensive part of the frame.
  const dpr = perfTier === "low" ? [1, 1] : isMobile ? [1, 1.5] : [1, 2];
  const reflectorResolution = isMobile ? 512 : 2048;
  const reflectorBlur = isMobile ? [150, 50] : [300, 100];

  const hasFullyInitialized = initializations === projects.length;
  // const hasFullyInitialized = true;

  // Run the benchmark once the scene is fully loaded; keep the reflection while
  // measuring (so its cost is included) and after, only on "high" devices.
  const isBenchmarking = hasFullyInitialized && perfTier === "measuring";
  const showReflection = perfTier !== "low";

  const handleGraded = useCallback((avgFps) => {
    if (import.meta.env.DEV) {
      const tier = avgFps >= MIN_FPS_FOR_REFLECTION ? "high" : "low";
      console.log(`device benchmark: ${Math.round(avgFps)} fps -> ${tier}`);
    }
    setPerfTier(avgFps >= MIN_FPS_FOR_REFLECTION ? "high" : "low");
  }, []);

  // Keep rendering continuously until the slide spring settles (~1.2s), then
  // fall back to demand mode. Resets on rapid presses so spamming stays smooth.
  const startNavRender = useCallback(() => {
    setIsNavigating(true);
    clearTimeout(navTimer.current);
    navTimer.current = setTimeout(() => setIsNavigating(false), 1400);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length);
    startNavRender();
  }, [projects.length, startNavRender]);

  const handleNext = useCallback(() => {
    setCurrentProjectIndex((prev) => (prev + 1) % projects.length);
    startNavRender();
  }, [projects.length, startNavRender]);

  useEffect(() => () => clearTimeout(navTimer.current), []);

  useEffect(() => {
    const handlePerfToggle = (event) => {
      if (event.shiftKey && event.code === "KeyP") {
        event.preventDefault();
        setShowPerf((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handlePerfToggle);

    return () => {
      window.removeEventListener("keydown", handlePerfToggle);
    };
  }, []);

  // Keyboard navigation: arrow keys cycle through projects once the scene is ready
  useEffect(() => {
    if (!hasFullyInitialized) {
      return;
    }

    const handleKeyDown = (event) => {
      // Ignore auto-repeat events fired while a key is held down
      if (event.repeat) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handlePrevious();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasFullyInitialized, handlePrevious, handleNext]);

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
          fov: FOV,
          near: 0.1,
          far: 200,
          position: [0, BASE_Y, cameraZ]
        }}
        resize={{ scroll: false }}
        gl={{ antialias: !isMobile }}
        dpr={dpr}
        frameloop={showPerf || isNavigating || isBenchmarking ? "always" : "demand"}
      >
        {showPerf && (
          <Suspense fallback={null}>
            <Perf position="top-left" />
          </Suspense>
        )}

        {isBenchmarking && <DeviceBenchmark onGraded={handleGraded} />}

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

        {showReflection && (
          <mesh position={[0, -BASE_Y - 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[50, 50]} />
            <MeshReflectorMaterial
              blur={reflectorBlur}
              resolution={reflectorResolution}
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
        )}
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

      {isMobile && (
        <button
          type="button"
          style={{ opacity: showPerf ? 1 : 0.2 }}
          onClick={() => setShowPerf((prev) => !prev)}
          className="absolute right-5 top-5 z-10 rounded-md bg-white/10 px-3 py-2 text-xs text-white/60 backdrop-blur-sm"
        >
          {showPerf ? "Hide FPS" : "Show Dx"}
        </button>
      )}
    </div>
  );
};

export default UnifiedProjectCarousel;
