import { animated, useSpring } from "@react-spring/three";
import { Text, useCursor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Box, Flex } from "@react-three/flex";
import { useState } from "react";
import { FOV } from "../config/camera";

// Responsive text: pixels-per-world-unit at which the card's font is at its base
// size; below this (smaller windows pull the camera back) the font scales up so
// it stays legible, capped so it never balloons or overflows the fixed card.
const REFERENCE_PX_PER_WORLD = 400;
const FONT_SCALE_MAX = 1.3;

const ButtonMesh = ({ text, onClick, disabled }) => {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const { color } = useSpring({
    color: hovered ? "#9333ea" : "#4a4a4a",
    config: { duration: 200 }
  });

  return (
    <group
      onPointerOver={() => {
        if (disabled) {
          return;
        }
        setHovered(true);
      }}
      onPointerOut={() => {
        if (disabled) {
          return;
        }
        setHovered(false);
      }}
      onClick={onClick}
    >
      <mesh position={[0, 0, 0.01]}>
        <roundedPlaneGeometry args={[0.34, 0.11, 0.055]} />
        <animated.meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      <Text
        position={[0, 0, 0.02]}
        fontSize={0.04}
        color="white"
        anchorX="center"
        anchorY="middle"
        material-toneMapped={false}
      >
        {text}
      </Text>
    </group>
  );
};

const CHIP_FONT = 0.032;
const CHIP_HEIGHT = 0.084;
const CHIP_PAD_X = 0.039;
const CHIP_MARGIN = 0.014;

// A rounded "pill" chip — the 3D equivalent of the Lite mode's tags. `accent`
// gives the role a primary (purple) treatment so it reads as the lead of the
// meta row; tech chips use the translucent white the rest of the card uses.
// `fontScale` grows the pill (text + box) in lockstep with the card's
// responsive text so chips never shrink on their own.
const Chip = ({ text, accent = false, fontScale = 1 }) => {
  const font = CHIP_FONT * fontScale;
  const height = CHIP_HEIGHT * fontScale;
  const padX = CHIP_PAD_X * fontScale;
  const margin = CHIP_MARGIN * fontScale;
  // troika's default font advances ~0.55em per glyph — enough to size the pill
  // synchronously (async measuring would reflow after layout).
  const chipWidth = Math.max(text.length * font * 0.55 + padX * 2, height);
  const radius = Math.min(height / 2, chipWidth / 2);

  return (
    <Box width={chipWidth} height={height} margin={margin} centerAnchor>
      <group>
        <mesh position={[0, 0, 0.002]}>
          <roundedPlaneGeometry args={[chipWidth, height, radius]} />
          <meshBasicMaterial
            color={accent ? "#9333ea" : "#ffffff"}
            transparent
            opacity={accent ? 0.8 : 0.1}
          />
        </mesh>
        <Text
          position={[0, 0, 0.004]}
          fontSize={font}
          color={accent ? "#ffffff" : "#e6e6e6"}
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
        >
          {text}
        </Text>
      </group>
    </Box>
  );
};

const ProjectCard = ({ project, position = [0, 0, 0], disabled = false }) => {
  const width = 1.1;
  const padding = 0.04;
  const maxTextWidth = width - padding * 2;

  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Scale the card's text up as it renders smaller on screen. The focused card
  // sits at z=0, so its apparent size tracks pixels-per-world-unit there; on
  // smaller windows the camera pulls back and that drops, so the font grows to
  // stay legible. Clamped to [1, MAX] so it never shrinks below base or overflows
  // the fixed card width. The OPEN button intentionally opts out of this.
  const viewportPx = useThree((state) => state.size);
  const cameraZ = useThree((state) => state.camera.position.z);
  const pxPerWorld = viewportPx.height / (2 * cameraZ * Math.tan((FOV * Math.PI) / 180 / 2));
  const fontScale = Math.min(Math.max(REFERENCE_PX_PER_WORLD / pxPerWorld, 1), FONT_SCALE_MAX);

  // The 3D card stays terse — implementation highlights are Lite-mode only, to
  // avoid blowing out the text-mesh layout. Show the what/what-I-did lines, the
  // tech as pill chips, then the role and contribution (mirrors the Lite card).
  const descriptionLines = [project.summary, project.notes].filter(Boolean);

  function onReflow(totalWidth, totalHeight) {
    setCardWidth(totalWidth);
    setCardHeight(totalHeight);
  }

  // Animation springs
  const { color } = useSpring({
    // color: hovered ? "#9333ea" : "#3a3a3a",
    color: hovered ? "#1a1a24" : "#1a1a1a",
    config: {
      mass: 1,
      tension: 280,
      friction: 60,
      duration: 200
    }
  });

  return (
    <Box
      onPointerOver={() => {
        if (disabled) {
          return;
        }
        setHovered(true);
      }}
      onPointerOut={() => {
        if (disabled) {
          return;
        }
        setHovered(false);
      }}
      centerAnchor
    >
      <animated.mesh position={[position[0], 0, -0.01]}>
        {/* Width tracks the Flex's fixed `width` (content is left-anchored to it),
            not the measured content width — otherwise sparse cards like the
            text-only Resume slide get a narrow panel the content spills out of. */}
        <planeGeometry args={[width + 0.2, cardHeight + 0.2]} />
        <animated.meshBasicMaterial color={color} opacity={0.95} transparent />
      </animated.mesh>

      <Flex
        size={[width, "auto", 0]}
        flexDirection="column"
        gap={0.35}
        padding={padding}
        position={position}
        centerAnchor
        onReflow={onReflow}
      >
        <Box centerAnchor>
          <Text
            fontSize={0.044 * fontScale}
            maxWidth={maxTextWidth}
            lineHeight={1.2}
            material-toneMapped={false}
          >
            {project.title}
          </Text>
        </Box>

        <Box centerAnchor marginBottom={0.1}>
          <Text
            fontSize={0.036 * fontScale}
            maxWidth={maxTextWidth}
            lineHeight={1.2}
            material-toneMapped={false}
          >
            {project.subtitle}
          </Text>
        </Box>

        {descriptionLines.map((description, index) => (
          <Box
            key={`desc-${index}`}
            centerAnchor
            marginBottom={index < descriptionLines.length - 1 ? 0.05 : 0}
          >
            <Text
              fontSize={0.039 * fontScale}
              maxWidth={maxTextWidth}
              lineHeight={1.2}
              material-toneMapped={false}
            >
              {description}
            </Text>
          </Box>
        ))}

        {(project.role || project.tech?.length > 0) && (
          <Box
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="flex-start"
            alignItems="center"
            width={maxTextWidth}
            marginTop={0.05}
          >
            {project.role && <Chip text={project.role} accent fontScale={fontScale} />}
            {project.tech?.map((tech, index) => (
              <Chip key={`tech-${index}`} text={tech} fontScale={fontScale} />
            ))}
          </Box>
        )}

        {project.link && (
          <group>
            <Box centerAnchor marginBottom={0.1}></Box>
            <Box centerAnchor>
              <ButtonMesh
                text="OPEN"
                onClick={() => {
                  if (disabled) {
                    return;
                  }
                  window.open(project.link, "_blank");
                }}
                disabled={disabled}
              />
            </Box>
          </group>
        )}
      </Flex>
    </Box>
  );
};

export default ProjectCard;
