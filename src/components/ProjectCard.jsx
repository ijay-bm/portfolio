import { animated, useSpring } from "@react-spring/three";
import { Text, useCursor } from "@react-three/drei";
import { Box, Flex } from "@react-three/flex";
import { useState } from "react";

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

// troika's default font advances ~0.55em per glyph on average — close enough to
// size a pill synchronously, which keeps flex layout stable (async text
// measurement would reflow after the box was already placed).
const estimateChipWidth = (text) =>
  Math.max(text.length * CHIP_FONT * 0.55 + CHIP_PAD_X * 2, CHIP_HEIGHT);

// A rounded "pill" chip — the 3D equivalent of the Lite mode's tags. `accent`
// gives the role a primary (purple) treatment so it reads as the lead of the
// meta row; tech chips use the translucent white the rest of the card uses.
const Chip = ({ text, accent = false }) => {
  const chipWidth = estimateChipWidth(text);
  const radius = Math.min(CHIP_HEIGHT / 2, chipWidth / 2);

  return (
    <Box width={chipWidth} height={CHIP_HEIGHT} margin={CHIP_MARGIN} centerAnchor>
      <group>
        <mesh position={[0, 0, 0.002]}>
          <roundedPlaneGeometry args={[chipWidth, CHIP_HEIGHT, radius]} />
          <meshBasicMaterial
            color={accent ? "#9333ea" : "#ffffff"}
            transparent
            opacity={accent ? 0.8 : 0.1}
          />
        </mesh>
        <Text
          position={[0, 0, 0.004]}
          fontSize={CHIP_FONT}
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
  const width = 1.5;
  const padding = 0.1;
  const maxTextWidth = width - padding * 2;

  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [hovered, setHovered] = useState(false);

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
            fontSize={0.044}
            maxWidth={maxTextWidth}
            lineHeight={1.2}
            material-toneMapped={false}
          >
            {project.title}
          </Text>
        </Box>

        <Box centerAnchor marginBottom={0.1}>
          <Text
            fontSize={0.036}
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
              fontSize={0.039}
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
            {project.role && <Chip text={project.role} accent />}
            {project.tech?.map((tech, index) => (
              <Chip key={`tech-${index}`} text={tech} />
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
