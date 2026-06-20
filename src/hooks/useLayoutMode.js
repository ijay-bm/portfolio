import { useEffect, useState } from "react";

// Below either of these the 3D scene is dropped for the pure-HTML carousel.
// Width catches portrait phones and small desktop windows; height catches short
// landscape phones (whose width can exceed the breakpoint).
const COMPACT_MAX_WIDTH = 768;
const COMPACT_MAX_HEIGHT = 600;

const getMode = () => {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const compact = window.innerWidth < COMPACT_MAX_WIDTH || window.innerHeight < COMPACT_MAX_HEIGHT;
  return compact ? "compact" : "desktop";
};

// "compact" (small / mobile -> HTML carousel) or "desktop" (-> 3D carousel),
// derived from viewport width AND height and re-evaluated on resize.
export default function useLayoutMode() {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const onResize = () => setMode(getMode());
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return mode;
}
