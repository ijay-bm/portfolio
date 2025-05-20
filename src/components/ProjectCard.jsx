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
        <roundedPlaneGeometry args={[0.6, 0.2, 0.1]} />
        <animated.meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      <Text
        position={[0, 0, 0.02]}
        fontSize={0.07}
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

const ProjectCard = ({ project, position = [0, 0, 0], disabled = false }) => {
  const width = 1.5;
  const padding = 0.1;
  const maxTextWidth = width - padding * 2;

  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [hovered, setHovered] = useState(false);

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
        {/* <roundedPlaneGeometry args={[cardWidth + 0.2, cardHeight + 0.2, 0.1]} /> */}
        <planeGeometry args={[cardWidth + 0.2, cardHeight + 0.2]} />
        <animated.meshBasicMaterial color={color} opacity={0.95} transparent />
      </animated.mesh>

      <Flex
        size={[width, "auto", 0]}
        flexDirection="column"
        gap={0.5}
        padding={padding}
        position={position}
        centerAnchor
        onReflow={onReflow}
      >
        <Box centerAnchor>
          <Text
            fontSize={0.063}
            maxWidth={maxTextWidth}
            lineHeight={1.2}
            material-toneMapped={false}
          >
            {project.title}
          </Text>
        </Box>

        <Box centerAnchor marginBottom={0.1}>
          <Text
            fontSize={0.052}
            maxWidth={maxTextWidth}
            lineHeight={1.2}
            material-toneMapped={false}
          >
            {project.subtitle}
          </Text>
        </Box>

        {project.descriptions?.length &&
          project.descriptions.map((description, index) => (
            <Box key={`desc-${index}`} centerAnchor>
              <Text
                fontSize={0.063}
                maxWidth={maxTextWidth}
                lineHeight={1.2}
                material-toneMapped={false}
              >
                {description}
              </Text>
            </Box>
          ))}

        <Box centerAnchor marginBottom={0.1}></Box>

        {project.roles?.length &&
          project.roles.map((role, index) => (
            <Box key={`desc-${index}`} flexDirection={"row"} padding={0.01}>
              <Box centerAnchor>
                <mesh position={[0, -0.03, 0]}>
                  <sphereGeometry args={[0.01, 8, 8]} />
                  <meshBasicMaterial color="white" />
                </mesh>
              </Box>

              <Box centerAnchor marginLeft={0.02}>
                <Text
                  fontSize={0.063}
                  maxWidth={maxTextWidth}
                  lineHeight={1.2}
                  material-toneMapped={false}
                >
                  {role}
                </Text>
              </Box>
            </Box>
          ))}

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
