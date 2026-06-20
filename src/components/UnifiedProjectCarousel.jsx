import { Environment, MeshReflectorMaterial } from "@react-three/drei";
import { Canvas, extend } from "@react-three/fiber";
import { geometry } from "maath";
import { lazy, Suspense, useCallback, useEffect, useState, useRef } from "react";
import { BASE_Y, CAMERA_Y, FOV, ZOOM, fitCameraZ } from "../config/camera";
import useIsMobile from "../hooks/useIsMobile";
import useResize from "../hooks/useResize";
import DeviceBenchmark from "./DeviceBenchmark";
import LoadingDots from "./LoadingDots";
import NextButton from "./NextButton";
import PreviousButton from "./PreviousButton";
import ProjectPanel from "./ProjectPanel";

// Lazy-loaded so the perf overlay's code is only downloaded when it's toggled
// on (Shift+P), keeping it out of the default production payload.
const Perf = lazy(() => import("r3f-perf").then((module) => ({ default: module.Perf })));

extend(geometry);

// Minimum sustained FPS (rendering the full scene, reflection included) for a
// device to keep the expensive effects. Below this they're dropped.
const MIN_FPS_FOR_REFLECTION = 50;

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
  const cameraZ = fitCameraZ(width, height) * ZOOM;

  // Device-tiered render settings: cap the pixel ratio and shrink the
  // reflective-floor render target on mobile, where the reflector's blur
  // passes are the most expensive part of the frame.
  const dpr = perfTier === "low" ? [1, 1] : isMobile ? [1, 1.5] : [1, 2];
  const reflectorResolution = 512;
  const reflectorBlur = [150, 50];

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
        <LoadingDots />
      </div>

      <Canvas
        className={`duration-500 ${!hasFullyInitialized && "opacity-0"}`}
        key={`${width}-${height}`} // Force canvas recreation on resize
        style={{ width, height }}
        camera={{
          fov: FOV,
          near: 0.1,
          far: 200,
          position: [0, CAMERA_Y, cameraZ]
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
          className="absolute right-5 top-[3rem] z-10 rounded-md bg-white/10 px-3 py-2 text-xs text-white/60 backdrop-blur-sm"
        >
          {showPerf ? "Hide FPS" : "Show Dx"}
        </button>
      )}
    </div>
  );
};

export default UnifiedProjectCarousel;
