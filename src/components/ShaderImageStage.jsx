import { shaderMaterial } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import dispUrl from "../assets/images/displacement.png";
import fragmentContain from "../assets/shaders/fragmentContain.glsl";
import vertex from "../assets/shaders/vertex.glsl";

const AUTOPLAY_MS = 3500;
const TRANSITION_MS = 1000;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const aspectOf = (texture) => (texture?.image ? texture.image.width / texture.image.height : 1);

const ContainTransitionMaterial = shaderMaterial(
  {
    currentTexture: null,
    nextTexture: null,
    disp: null,
    intensity: 0.7,
    progress: 1,
    direction: 1,
    currentAspect: 1,
    nextAspect: 1,
    canvasAspect: 1
  },
  vertex,
  fragmentContain
);
extend({ ContainTransitionMaterial });

// Small chevron overlaid on the image to cycle through a project's screenshots.
function ImageChevron({ direction, onClick }) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      aria-label={isNext ? "Next image" : "Previous image"}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm transition active:scale-90 ${
        isNext ? "right-3" : "left-3"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d={isNext ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// Fullscreen quad running the displacement shader. Loads images lazily (only the
// current one, then transition targets on demand) so entering an image-heavy
// project doesn't decode + GPU-upload them all at once.
function Scene({ images, index, command, onDone }) {
  const { size, viewport } = useThree();
  const materialRef = useRef();
  const stateRef = useRef({ active: false });
  const cacheRef = useRef(new Map());
  const loaderRef = useRef();
  if (!loaderRef.current) {
    loaderRef.current = new THREE.TextureLoader();
  }
  const dispRef = useRef(null);
  const [ready, setReady] = useState(false);

  const getTexture = useCallback((url) => {
    const cache = cacheRef.current;
    const cached = cache.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve) => {
      loaderRef.current.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          cache.set(url, texture);
          resolve(texture);
        },
        undefined,
        () => resolve(null)
      );
    });
  }, []);

  // Load the displacement map once.
  useEffect(() => {
    loaderRef.current.load(dispUrl, (texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      dispRef.current = texture;
      if (materialRef.current) {
        materialRef.current.disp = texture;
      }
    });
  }, []);

  // Abandon any in-flight transition when the project changes.
  useEffect(() => {
    stateRef.current.active = false;
  }, [images]);

  // Keep the canvas aspect uniform in sync with the element size.
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.canvasAspect = size.width / size.height;
    }
  }, [size.width, size.height]);

  // Show the current image (loaded on demand), unless a transition is running.
  useEffect(() => {
    if (stateRef.current.active) {
      return undefined;
    }
    let cancelled = false;
    getTexture(images[Math.min(index, images.length - 1)]).then((texture) => {
      if (cancelled || !materialRef.current || !texture) {
        return;
      }
      const material = materialRef.current;
      material.disp = dispRef.current;
      material.currentTexture = texture;
      material.nextTexture = texture;
      material.currentAspect = aspectOf(texture);
      material.nextAspect = aspectOf(texture);
      material.progress = 1;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [images, index, getTexture]);

  // Start a transition when a new command arrives, loading the target on demand.
  useEffect(() => {
    if (!command) {
      return undefined;
    }
    let cancelled = false;
    Promise.all([getTexture(images[index]), getTexture(images[command.to])]).then(
      ([fromTex, toTex]) => {
        const material = materialRef.current;
        if (cancelled || !material || !fromTex || !toTex) {
          return;
        }
        material.disp = dispRef.current;
        material.currentTexture = fromTex;
        material.nextTexture = toTex;
        material.currentAspect = aspectOf(fromTex);
        material.nextAspect = aspectOf(toTex);
        material.canvasAspect = size.width / size.height;
        material.direction = command.direction;
        material.progress = 0;
        stateRef.current = { active: true, to: command.to, toTex, start: performance.now() };
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  useFrame(() => {
    const s = stateRef.current;
    const material = materialRef.current;
    if (!s.active || !material) {
      return;
    }
    const t = Math.min((performance.now() - s.start) / TRANSITION_MS, 1);
    material.progress = easeInOutCubic(t);
    if (t >= 1) {
      s.active = false;
      material.currentTexture = s.toTex;
      material.nextTexture = s.toTex;
      material.currentAspect = aspectOf(s.toTex);
      material.nextAspect = aspectOf(s.toTex);
      material.progress = 1;
      onDone(s.to);
    }
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]} visible={ready}>
      <planeGeometry args={[1, 1]} />
      <containTransitionMaterial ref={materialRef} transparent />
    </mesh>
  );
}

// Image cycler backed by the displacement shader in a tiny R3F canvas.
export default function ShaderImageStage({ images }) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const transitioningRef = useRef(false);
  const [command, setCommand] = useState(null);
  const [tick, setTick] = useState(0);

  // Reset to the first image when the project changes.
  useEffect(() => {
    setIndex(0);
    setCommand(null);
    transitioningRef.current = false;
  }, [images]);

  const advance = useCallback(
    (stepDir) => {
      if (transitioningRef.current || images.length < 2) {
        return;
      }
      const to = (indexRef.current + stepDir + images.length) % images.length;
      transitioningRef.current = true;
      setTick((t) => t + 1);
      setCommand({ to, direction: stepDir > 0 ? 1 : -1 });
    },
    [images.length]
  );

  const handleDone = useCallback((to) => {
    setIndex(to);
    setCommand(null);
    transitioningRef.current = false;
  }, []);

  // Autoplay; depends on tick so any advance (manual or auto) restarts the timer.
  // Depends on `images` (not just length) so changing project restarts the timer.
  useEffect(() => {
    if (images.length < 2) {
      return undefined;
    }
    const id = setInterval(() => advance(1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [images, advance, tick]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        dpr={[1, 2]}
        gl={{ alpha: true }}
        className="absolute inset-0"
      >
        <Scene images={images} index={index} command={command} onDone={handleDone} />
      </Canvas>

      {images.length > 1 && (
        <>
          <ImageChevron direction="previous" onClick={() => advance(-1)} />
          <ImageChevron direction="next" onClick={() => advance(1)} />
        </>
      )}
    </div>
  );
}
