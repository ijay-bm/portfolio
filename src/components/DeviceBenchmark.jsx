import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

// One-shot capability probe: renders the real scene for a moment, measures the
// sustained frame rate (after a warm-up to skip shader / reflector-FBO compile
// spikes), and reports it once via onGraded so the caller can keep expensive
// effects only on machines that can actually hold them.
export default function DeviceBenchmark({ onGraded, sampleMs = 800, warmupFrames = 15 }) {
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
}
