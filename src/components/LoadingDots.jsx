// Four pulsing dots shown while the scene loads. Each entry is [cx, begin],
// staggering the animation start so the dots ripple right-to-left.
const DOTS = [
  [24, 0.99],
  [18, 0.67],
  [12, 0.33],
  [6, 0]
];

export default function LoadingDots() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 32 32">
      {DOTS.map(([cx, begin]) => (
        <circle key={cx} cx={cx} cy={12} r={0} fill="currentColor">
          <animate
            attributeName="r"
            begin={begin}
            calcMode="spline"
            dur="1.5s"
            keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
            repeatCount="indefinite"
            values="0;2;0;0"
          ></animate>
        </circle>
      ))}
    </svg>
  );
}
