uniform sampler2D currentTexture;
uniform sampler2D nextTexture;
uniform sampler2D disp;
uniform float intensity;
uniform float progress;
uniform float direction;
uniform float currentAspect;
uniform float nextAspect;
uniform float canvasAspect;

varying vec2 vUv;

// Fit an image inside the canvas (letterbox) instead of stretching, by scaling
// the sampling UVs around the centre based on the aspect mismatch.
vec2 containUV(vec2 uv, float imageAspect) {
  vec2 s = vec2(1.0);
  if (canvasAspect > imageAspect) {
    s.x = canvasAspect / imageAspect;
  } else {
    s.y = imageAspect / canvasAspect;
  }
  return (uv - 0.5) * s + 0.5;
}

vec4 sampleContained(sampler2D tex, vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture2D(tex, uv);
}

void main() {
  vec2 offset = texture2D(disp, vUv).rg * 2.0 - 1.0;
  float currentDisplacement = progress * intensity;
  float nextDisplacement = (1.0 - progress) * intensity;

  vec2 cuv = containUV(vUv, currentAspect) + offset * currentDisplacement * direction;
  vec4 current = sampleContained(currentTexture, cuv);
  current.a *= (1.0 - progress);

  vec2 nuv = containUV(vUv, nextAspect) - offset * nextDisplacement * direction;
  vec4 next = sampleContained(nextTexture, nuv);
  next.a *= progress;

  gl_FragColor = mix(current, next, progress);

  #include <colorspace_fragment>
}
