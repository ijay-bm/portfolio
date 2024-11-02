uniform sampler2D currentTexture;
uniform sampler2D nextTexture;
uniform sampler2D disp;
uniform float intensity;
uniform float progress;
uniform float direction;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Sample the displacement texture
  vec4 dispTexture = texture2D(disp, uv);

  // Calculate displacement amount for both textures
  float currentDisplacement = progress * intensity;
  float nextDisplacement = (1.0 - progress) * intensity;

  // Offset UVs for the current texture (fade out)
  vec2 distortedUV1 = uv + (dispTexture.rg * 2.0 - 1.0) * currentDisplacement * direction;
  vec4 current = texture2D(currentTexture, distortedUV1);
  current.a *= (1.0 - progress);

  // Offset UVs for the next texture (fade in)
  vec2 distortedUV2 = uv - (dispTexture.rg * 2.0 - 1.0) * nextDisplacement * direction;
  vec4 next = texture2D(nextTexture, distortedUV2);
  next.a *= progress;

  // Mix between the two textures based on progress
  gl_FragColor = mix(current, next, progress);
}