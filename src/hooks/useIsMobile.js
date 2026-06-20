import { useState } from "react";

// Detects a low-power / mobile device once at mount. Kept stable for the session
// so the reflector render target and DPR don't thrash on resize or orientation
// change (device class effectively never changes mid-session).
export default function useIsMobile() {
  const [isMobile] = useState(() => {
    if (
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ) {
      return true;
    }
    return typeof window !== "undefined" && window.innerWidth < 640;
  });

  return isMobile;
}
