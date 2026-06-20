import { animated } from "@react-spring/three";
import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { Box, Flex } from "@react-three/flex";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import displacementTexture from "../assets/images/displacement.png";
import fragment from "../assets/shaders/fragment.glsl";
import vertex from "../assets/shaders/vertex.glsl";
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
  const { size, invalidate } = useThree();
  const meshRef = useRef();
  const materialRef = useRef();
  // Always holds the latest transition() so the autoplay interval never calls
  // a stale closure (which would otherwise freeze it on the first image).
  const transitionFnRef = useRef(null);
  // Freeze the random interval once instead of re-rolling it on every render.
  const [stableInterval] = useState(() => autoPlayInterval);
  const [textures, setTextures] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scales, setScales] = useState([]);
  const transitionRef = useRef({
    progress: 0,
    nextIndex: 0,
    direction: 1,
    active: false
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [dispTexture, setDispTexture] = useState(null);
  // Bumped on manual navigation to restart the autoplay countdown so it doesn't
  // fire again immediately after the user clicks.
  const [autoPlayResetToken, setAutoPlayResetToken] = useState(0);

  useEffect(() => {
    if (materialRef.current && textures.length && dispTexture) {
      materialRef.current.currentTexture = textures[0];
      materialRef.current.nextTexture = textures[0];
      materialRef.current.disp = dispTexture;
      materialRef.current.resolution.set(size.width, size.height);
      setIsInitialized(true);
      initialized();
    }
  }, [textures, dispTexture, size.width, size.height]);

  useEffect(() => {
    if (!isInitialized || disabled || !autoPlay) {
      return;
    }
    const autoPlayTimer = setInterval(() => {
      transitionFnRef.current?.(1);
    }, stableInterval);

    return () => {
      clearInterval(autoPlayTimer);
    };
  }, [autoPlay, stableInterval, isInitialized, disabled, autoPlayResetToken]);

  // Updated calculateImageScale to handle various aspect ratios
  const calculateImageScale = (texture) => {
    const imageAspect = texture.image.width / texture.image.height;
    const targetAspect = 16 / 9; // Target aspect ratio (16:9)

    // Set a fixed width for consistency
    const fixedWidth = scaleX;

    // Calculate height based on image aspect ratio
    let calculatedHeight = fixedWidth / imageAspect;

    // For portrait images (phone screenshots, etc)
    if (imageAspect < 1) {
      // Cap the height and adjust width to maintain aspect ratio
      const maxHeight = fixedWidth * 0.8; // Cap height at 80% of width

      if (calculatedHeight > maxHeight) {
        calculatedHeight = maxHeight;
        const cappedWidth = calculatedHeight * imageAspect;
        return { x: cappedWidth, y: calculatedHeight };
      }
    }

    // For landscape images that aren't 16:9
    // If image is taller than 16:9 would be at this width
    if (imageAspect < targetAspect) {
      // Allow some flexibility, but ensure it's not too tall
      const maxHeight = (fixedWidth / targetAspect) * 1.2;

      if (calculatedHeight > maxHeight) {
        calculatedHeight = maxHeight;
        const cappedWidth = calculatedHeight * imageAspect;
        return { x: cappedWidth, y: calculatedHeight };
      }
    }

    return { x: fixedWidth, y: calculatedHeight };
  };

  // Load textures
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();

    // Load displacement texture
    textureLoader.load(displacementTexture, (loadedDisp) => {
      setDispTexture(loadedDisp);
    });

    if (!imageUrls.length) {
      return;
    }

    // Load image textures
    Promise.all(
      imageUrls.map(
        (url) =>
          new Promise((resolve) => {
            textureLoader.load(url, (loadedTexture) => {
              loadedTexture.colorSpace = THREE.SRGBColorSpace;
              resolve(loadedTexture);
            });
          })
      )
    ).then((loadedTextures) => {
      setTextures(loadedTextures);
      const newScales = loadedTextures.map(calculateImageScale);
      setScales(newScales);
    });
  }, [imageUrls]);

  const transition = (direction) => {
    if (isTransitioning || textures.length < 2) return;

    const nextIndex = (currentIndex + direction + textures.length) % textures.length;

    transitionRef.current = {
      progress: 0,
      nextIndex,
      direction,
      active: true,
      startTime: Date.now()
    };

    if (materialRef.current) {
      materialRef.current.currentTexture = textures[currentIndex];
      materialRef.current.nextTexture = textures[nextIndex];
      materialRef.current.direction = direction;
      materialRef.current.progress = 0;
    }

    setIsTransitioning(true);
  };

  // Keep the ref pointing at the freshest transition() every render so the
  // autoplay interval always sees the current index / transitioning state.
  transitionFnRef.current = transition;

  useFrame(() => {
    if (!transitionRef.current.active || !materialRef.current) return;

    // materialRef.current.opacity = opacity.get();

    const elapsed = Date.now() - transitionRef.current.startTime;
    const rawProgress = Math.min(elapsed / transitionDuration, 1);
    const progress = easeInOutCubic(rawProgress);

    // Update material uniforms directly
    materialRef.current.progress = progress;

    // Interpolate scales
    if (meshRef.current && scales.length > 0) {
      const currentScale = scales[currentIndex];
      const nextScale = scales[transitionRef.current.nextIndex];
      meshRef.current.scale.x = currentScale.x + (nextScale.x - currentScale.x) * progress;
      meshRef.current.scale.y = currentScale.y + (nextScale.y - currentScale.y) * progress;
    }

    if (rawProgress >= 1) {
      setCurrentIndex(transitionRef.current.nextIndex);
      setIsTransitioning(false);
      transitionRef.current.active = false;

      // Update final state
      materialRef.current.currentTexture = textures[transitionRef.current.nextIndex];
      materialRef.current.nextTexture = textures[transitionRef.current.nextIndex];
      materialRef.current.progress = 1.0;
    } else {
      // Demand mode: keep requesting frames until the transition completes.
      invalidate();
    }
  });

  // useImperativeHandle(ref, () => ({
  //   transition
  // }));

  if (textures.length === 0 || scales.length === 0) return null;

  return (
    <Box
      position={[0, 0, 0]}
      width={scaleX}
      height={scales[currentIndex].y}
      marginRight={marginRight}
      centerAnchor
    >
      <Box width={scaleX}>
        <animated.mesh ref={meshRef} scale={[scales[currentIndex].x, scales[currentIndex].y, 1]}>
          <planeGeometry args={[1, 1]} />
          <transitionMaterial
            ref={materialRef}
            transparent
            currentTexture={textures[currentIndex]}
            nextTexture={textures[currentIndex]}
            intensity={0.7}
            progress={1.0}
            direction={1.0}
          />
        </animated.mesh>
      </Box>

      <Flex
        position={[0, 0, 0.1]}
        width={scaleX}
        height={scales[currentIndex].y}
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
    </Box>
  );
};

const easeInOutCubic = (t) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export default ImagePlane;
