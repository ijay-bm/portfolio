// Camera framing for the project carousel — tweak the knobs freely.

// --- Framing knobs ---
// Content (focused panel) height in world units.
export const BASE_Y = 0;
// Camera eye height. The gap between CAMERA_Y and BASE_Y shifts the content
// vertically in frame: lower CAMERA_Y (or raise BASE_Y) pushes content UP.
export const CAMERA_Y = 0;
// Scales the auto-fit distance: 1 = exact fit, <1 zooms in (bigger, but wide
// content may clip the edges), >1 zooms out (smaller, more margin).
export const ZOOM = 0.8;

// Vertical field of view of the scene camera, in degrees.
export const FOV = 45;
// Focused panel's bounding box in world units, with breathing room. Used to fit
// the camera distance to the viewport so the content never overflows the edges.
const CONTENT_WIDTH = 6;
const CONTENT_HEIGHT = 3;

// Camera distance at which a CONTENT_WIDTH x CONTENT_HEIGHT box just fits the
// given viewport. Narrower / taller viewports push the camera back; wide ones
// let it move in closer. Keeps the focused panel framed across aspect ratios
// (the focused panel sits at z=0, so this distance is also its apparent size).
export const fitCameraZ = (viewportWidth, viewportHeight) => {
  const aspect = viewportWidth / viewportHeight;
  const halfFov = (FOV * Math.PI) / 180 / 2;
  const distForHeight = CONTENT_HEIGHT / (2 * Math.tan(halfFov));
  const distForWidth = CONTENT_WIDTH / (2 * Math.tan(halfFov) * aspect);
  return Math.max(distForHeight, distForWidth);
};
