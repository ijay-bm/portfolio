import { animated } from "@react-spring/three";
import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { Box, Flex } from "@react-three/flex";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import displacementTexture from "../assets/images/displacement.png";
import fragment from "../assets/shaders/fragment.glsl";
import vertex from "../assets/shaders/vertex.glsl";
import ImageLoader from "./ImageLoader";
import ImageNavButton from "./ImageNavButton";

const TransitionMaterial = shaderMaterial(
  {
    currentTexture: null,
    nextTexture: null,
    disp: null,
    intensity: 0.7,
    progress: 1.0,
    resolution: new THREE.Vector2(1, 1),
    direction: 1.0
  },
  vertex,
  fragment
);

extend({ TransitionMaterial });

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Plane size for an image, fitting it to scaleX while capping how tall portrait
// or non-16:9 shots get.
const calculateImageScale = (texture, scaleX) => {
  const imageAspect = texture.image.width / texture.image.height;
  const targetAspect = 16 / 9;
  const fixedWidth = scaleX;
  let calculatedHeight = fixedWidth / imageAspect;

  if (imageAspect < 1) {
    const maxHeight = fixedWidth * 0.8;
    if (calculatedHeight > maxHeight) {
      calculatedHeight = maxHeight;
      return { x: calculatedHeight * imageAspect, y: calculatedHeight };
    }
  }

  if (imageAspect < targetAspect) {
    const maxHeight = (fixedWidth / targetAspect) * 1.2;
    if (calculatedHeight > maxHeight) {
      calculatedHeight = maxHeight;
      return { x: calculatedHeight * imageAspect, y: calculatedHeight };
    }
  }

  return { x: fixedWidth, y: calculatedHeight };
};

const ImagePlane = ({
  imageUrls,
  transitionDuration = 1000,
  scaleX = 4,
  disabled = false,
  marginRight = 0,
  autoPlay = true,
  autoPlayInterval = Math.floor(Math.random() * 1000 + 3000),
  initialized = () => {}
}) => {
  const { invalidate } = useThree();
  const meshRef = useRef();
  const materialRef = useRef();
  // Always holds the latest transition() so the autoplay interval never calls
  // a stale closure (which would otherwise freeze it on the first image).
  const transitionFnRef = useRef(null);
  // Freeze the random interval once instead of re-rolling it on every render.
  const [stableInterval] = useState(() => autoPlayInterval);
  const [currentIndex, setCurrentIndex] = useState(0);
  // The currently shown image's { texture, scale }; drives sizing and the reveal.
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef({ active: false });
  const [isInitialized, setIsInitialized] = useState(false);
  // True once the current image's texture is actually bound to the material —
  // gates the loader and the panel's "ready" report so we never reveal an
  // unbound (black) plane.
  const [imageReady, setImageReady] = useState(false);
  const [dispTexture, setDispTexture] = useState(null);
  // Bumped on manual navigation to restart the autoplay countdown so it doesn't
  // fire again immediately after the user clicks.
  const [autoPlayResetToken, setAutoPlayResetToken] = useState(0);

  // Lazy texture loading: only the images this panel actually shows get loaded.
  const cacheRef = useRef(new Map());
  const loaderRef = useRef();
  if (!loaderRef.current) {
    loaderRef.current = new THREE.TextureLoader();
  }
  const hasReportedInit = useRef(false);
  const pendingRef = useRef(false);

  const getEntry = useCallback(
    (url) => {
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
            const entry = { texture, scale: calculateImageScale(texture, scaleX) };
            cache.set(url, entry);
            resolve(entry);
          },
          undefined,
          () => resolve(null)
        );
      });
    },
    [scaleX]
  );

  // Load the displacement texture once.
  useEffect(() => {
    loaderRef.current.load(displacementTexture, (loadedDisp) => {
      setDispTexture(loadedDisp);
      if (materialRef.current) {
        materialRef.current.disp = loadedDisp;
      }
    });
  }, []);

  // Resolve the current image lazily. Binding it to the material happens in the
  // effect below — the mesh (and materialRef) doesn't exist until currentEntry
  // is set, so we can't touch the material here on the first resolve.
  useEffect(() => {
    let cancelled = false;
    getEntry(imageUrls[Math.min(currentIndex, imageUrls.length - 1)]).then((entry) => {
      if (cancelled || !entry) {
        return;
      }
      setCurrentEntry(entry);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrls, currentIndex, getEntry]);

  // Bind the resolved image to the shader material once the mesh is mounted.
  // This runs after currentEntry triggers the render (so materialRef exists),
  // fixing the black flash where the texture used to never attach on first load
  // unless a later effect re-run happened to catch it.
  useEffect(() => {
    const material = materialRef.current;
    if (!material || !currentEntry || transitionRef.current.active) {
      return;
    }
    if (dispTexture) {
      material.disp = dispTexture;
    }
    material.currentTexture = currentEntry.texture;
    material.nextTexture = currentEntry.texture;
    material.progress = 1.0;
    setImageReady(true);
    invalidate();
  }, [currentEntry, dispTexture, invalidate]);

  // Report ready only once the image is actually bound (not merely downloaded),
  // so the carousel reveals a drawn image rather than a black plane.
  useEffect(() => {
    if (imageReady && dispTexture && !hasReportedInit.current) {
      hasReportedInit.current = true;
      setIsInitialized(true);
      initialized();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageReady, dispTexture]);

  useEffect(() => {
    if (!isInitialized || disabled || !autoPlay) {
      return undefined;
    }
    const autoPlayTimer = setInterval(() => {
      transitionFnRef.current?.(1);
    }, stableInterval);

    return () => {
      clearInterval(autoPlayTimer);
    };
  }, [autoPlay, stableInterval, isInitialized, disabled, autoPlayResetToken]);

  const transition = (direction) => {
    if (pendingRef.current || transitionRef.current.active || imageUrls.length < 2) {
      return;
    }
    pendingRef.current = true;
    const nextIndex = (currentIndex + direction + imageUrls.length) % imageUrls.length;

    // Load the target image on demand, then start the animation.
    getEntry(imageUrls[nextIndex]).then((nextEntry) => {
      pendingRef.current = false;
      if (!nextEntry || !materialRef.current || !currentEntry) {
        return;
      }
      transitionRef.current = {
        active: true,
        nextIndex,
        direction,
        startTime: Date.now(),
        nextEntry
      };
      materialRef.current.currentTexture = currentEntry.texture;
      materialRef.current.nextTexture = nextEntry.texture;
      materialRef.current.direction = direction;
      materialRef.current.progress = 0;
      setIsTransitioning(true);
      invalidate();
    });
  };

  // Keep the ref pointing at the freshest transition() every render so the
  // autoplay interval always sees the current index / transitioning state.
  transitionFnRef.current = transition;

  useFrame(() => {
    if (!materialRef.current) return;
    const tr = transitionRef.current;

    if (!tr.active) {
      // After a transition completes, keep the demand-mode loop alive briefly so
      // the nav buttons' reappear (collapse-back) spring is actually rendered.
      if (tr.cooldownUntil && Date.now() < tr.cooldownUntil) {
        invalidate();
      }
      return;
    }

    const elapsed = Date.now() - tr.startTime;
    const rawProgress = Math.min(elapsed / transitionDuration, 1);
    const progress = easeInOutCubic(rawProgress);

    materialRef.current.progress = progress;

    // Interpolate the plane scale between the two images.
    if (meshRef.current && currentEntry && tr.nextEntry) {
      const a = currentEntry.scale;
      const b = tr.nextEntry.scale;
      meshRef.current.scale.x = a.x + (b.x - a.x) * progress;
      meshRef.current.scale.y = a.y + (b.y - a.y) * progress;
    }

    if (rawProgress >= 1) {
      tr.active = false;
      // Keep rendering ~0.8s so the buttons' reappear animation is drawn.
      tr.cooldownUntil = Date.now() + 800;

      materialRef.current.currentTexture = tr.nextEntry.texture;
      materialRef.current.nextTexture = tr.nextEntry.texture;
      materialRef.current.progress = 1.0;

      setCurrentEntry(tr.nextEntry);
      setCurrentIndex(tr.nextIndex);
      setIsTransitioning(false);
    }

    invalidate();
  });

  // Reserve the image's footprint even before it resolves (default 16:9), so the
  // panel doesn't shift sideways when the texture pops in.
  const planeHeight = currentEntry ? currentEntry.scale.y : scaleX / (16 / 9);

  return (
    <Box
      position={[0, 0, 0]}
      width={scaleX}
      height={planeHeight}
      marginRight={marginRight}
      centerAnchor
    >
      <Box width={scaleX}>
        {currentEntry && (
          <animated.mesh ref={meshRef} scale={[currentEntry.scale.x, currentEntry.scale.y, 1]}>
            <planeGeometry args={[1, 1]} />
            <transitionMaterial
              ref={materialRef}
              transparent
              intensity={0.7}
              progress={1.0}
              direction={1.0}
            />
          </animated.mesh>
        )}

        {!imageReady && (
          <ImageLoader width={currentEntry ? currentEntry.scale.x : scaleX} height={planeHeight} />
        )}
      </Box>

      {currentEntry && (
        <Flex
          position={[0, 0, 0.1]}
          width={scaleX}
          height={currentEntry.scale.y}
          flexDir={"row"}
          justify="space-between"
          align="center"
          centerAnchor
        >
          <Box width={0.06} centerAnchor>
            <ImageNavButton
              direction="next"
              onClick={() => {
                if (disabled) {
                  return;
                }
                transition(1);
                setAutoPlayResetToken((t) => t + 1);
              }}
              disabled={disabled}
              transitioning={isTransitioning}
            />
          </Box>

          <Box width={0.06} centerAnchor>
            <ImageNavButton
              direction="previous"
              onClick={() => {
                if (disabled) {
                  return;
                }
                transition(-1);
                setAutoPlayResetToken((t) => t + 1);
              }}
              disabled={disabled}
              transitioning={isTransitioning}
            />
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default ImagePlane;
