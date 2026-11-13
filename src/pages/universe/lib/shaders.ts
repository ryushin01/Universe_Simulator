/** 3D 심플렉스 잡음 (Ashima Arts, MIT) */
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return f;
}
`

/** 행성·위성 표면 (텍스처 또는 잡음으로 그린 표면, 밤 불빛, 크레이터, 오로라, 기후 변화) */
export const planetVertex = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vLocal;
varying vec2 vUv;
void main() {
  vUv = uv;
  vLocal = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const MAX_MARKS = 8

export const planetFragment = /* glsl */ `
${NOISE}
uniform sampler2D uMap;
uniform float uHasMap;
uniform sampler2D uNight;
uniform float uHasNight;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uNoiseScale;
uniform float uRidged;
uniform vec4 uSpot;
uniform vec3 uSpotColor;
uniform vec3 uSunPos;
uniform vec3 uSunColor;
uniform float uLight;
uniform float uAurora;
uniform float uHeat;
uniform float uIce;
uniform float uDry;
uniform float uTerraform;
uniform float uCityLights;
uniform float uTime;
uniform vec4 uMarks[${MAX_MARKS}];
uniform vec4 uMarkInfo[${MAX_MARKS}];
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vLocal;
varying vec2 vUv;

vec3 surface() {
  if (uHasMap > 0.5) return texture2D(uMap, vUv).rgb;
  float n = fbm(vLocal * uNoiseScale);
  if (uRidged > 0.5) n = 1.0 - abs(n) * 2.2;
  vec3 c = mix(uColorA, uColorB, smoothstep(-0.45, 0.55, n));
  if (uSpot.w > 0.0) {
    float d = acos(clamp(dot(vLocal, normalize(uSpot.xyz)), -1.0, 1.0));
    c = mix(c, uSpotColor, smoothstep(uSpot.w, uSpot.w * 0.55, d));
  }
  return c;
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunPos - vWorldPos);
  float ndl = dot(N, L);
  float day = smoothstep(-0.08, 0.22, ndl);
  vec3 albedo = surface();

  // 바다가 마르면 파란 곳이 소금 사막으로
  float ocean = smoothstep(0.02, 0.12, albedo.b - max(albedo.r, albedo.g));
  albedo = mix(albedo, vec3(0.62, 0.55, 0.46) * (0.7 + 0.3 * albedo.b), ocean * uDry);
  // 얼어붙음: 높은 위도부터 하얗게
  float lat = abs(vLocal.y);
  albedo = mix(albedo, vec3(0.92, 0.95, 1.0), clamp(uIce * (0.6 + lat), 0.0, 1.0));
  // 테라포밍: 어두운 저지대에 물, 나머지에 초록
  float low = 1.0 - smoothstep(0.18, 0.42, dot(albedo, vec3(0.33)));
  vec3 terra = mix(albedo * vec3(0.55, 0.85, 0.5), vec3(0.08, 0.22, 0.45), low);
  albedo = mix(albedo, terra, uTerraform);

  // 충돌 흔적
  vec3 emission = vec3(0.0);
  for (int i = 0; i < ${MAX_MARKS}; i++) {
    vec4 mark = uMarks[i];
    vec4 info = uMarkInfo[i];
    if (mark.w <= 0.0) continue;
    float d = acos(clamp(dot(vLocal, normalize(mark.xyz)), -1.0, 1.0));
    float r = mark.w;
    if (info.x < 1.5) {
      // 크레이터: 어두운 바닥과 밝은 테두리
      float floorMask = smoothstep(r, r * 0.6, d);
      float rim = smoothstep(r * 1.35, r, d) * (1.0 - floorMask);
      albedo = mix(albedo, albedo * 0.45, floorMask * info.y);
      albedo = mix(albedo, albedo * 1.35 + 0.05, rim * info.y);
      emission += vec3(1.0, 0.45, 0.12) * floorMask * info.z;
    } else if (info.x < 2.5) {
      // 가스 행성 대기 흔적
      float spot = smoothstep(r, r * 0.3, d);
      albedo = mix(albedo, vec3(0.12, 0.08, 0.06), spot * info.y);
    } else {
      // 기지 불빛 (밤에만)
      float glow = smoothstep(r, 0.0, d);
      float twinkle = 0.6 + 0.4 * snoise(vLocal * 140.0);
      emission += vec3(1.0, 0.78, 0.45) * glow * twinkle * info.y * (1.0 - day) * 1.6;
    }
  }

  float light = uLight * max(ndl, 0.0);
  vec3 color = albedo * (uSunColor * light + 0.035);
  // 지구 밤 불빛
  if (uHasNight > 0.5) {
    vec3 lights = texture2D(uNight, vUv).rgb;
    color += lights * vec3(1.0, 0.82, 0.55) * (1.0 - day) * uCityLights * (1.0 - uDry) * (1.0 - uIce);
  }
  // 뜨거운 표면: 용암 빛
  if (uHeat > 0.0) {
    float lava = smoothstep(0.1, 0.7, fbm(vLocal * 6.0 + uTime * 0.02) * 0.5 + 0.5);
    emission += mix(vec3(0.6, 0.08, 0.02), vec3(1.0, 0.55, 0.15), lava) * uHeat * (0.55 + 0.45 * lava);
  }
  // 오로라: 위도 약 67° 띠
  if (uAurora > 0.0) {
    float band = exp(-pow((lat - 0.92) / 0.035, 2.0));
    float ripple = 0.55 + 0.45 * snoise(vec3(vLocal.xz * 9.0, uTime * 0.6));
    vec3 aurora = mix(vec3(0.2, 1.0, 0.55), vec3(0.75, 0.35, 1.0), smoothstep(0.92, 0.97, lat));
    emission += aurora * band * ripple * uAurora * (1.0 - day * 0.7) * 1.4;
  }
  gl_FragColor = vec4(color + emission, 1.0);
  #include <colorspace_fragment>
}
`

/** 대기 가장자리 빛 (뒷면 구) */
export const atmosphereVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const atmosphereFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform vec3 uSunPos;
uniform vec3 uCenter;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormalW);
  float rim = pow(clamp(1.0 + dot(V, N) * 1.15, 0.0, 1.0), 2.6);
  vec3 L = normalize(uSunPos - uCenter);
  float lit = smoothstep(-0.45, 0.5, dot(normalize(vWorldPos - uCenter), L));
  float a = rim * uStrength * (0.15 + 0.85 * lit);
  gl_FragColor = vec4(uColor * a, a);
}
`

/** 구름층 (알파 텍스처) */
export const cloudFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uSunPos;
uniform float uOpacity;
uniform float uOffset;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vLocal;
varying vec2 vUv;
void main() {
  // 구름 양은 알파 채널에 들어 있음 (색 채널은 압축으로 깨져 있음)
  float c = texture2D(uMap, vec2(fract(vUv.x + uOffset), vUv.y)).a;
  float a = smoothstep(0.12, 0.85, c);
  vec3 L = normalize(uSunPos - vWorldPos);
  float light = smoothstep(-0.1, 0.35, dot(normalize(vNormalW), L));
  gl_FragColor = vec4(vec3(0.95) * (0.05 + light), a * uOpacity * (0.25 + 0.75 * light));
}
`

/** 태양 표면 (쌀알 무늬, 흑점, 주연 감광) */
export const sunVertex = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalV;
void main() {
  vLocal = normalize(position);
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const sunFragment = /* glsl */ `
${NOISE}
uniform vec3 uColor;
uniform float uTime;
uniform float uGiant;
varying vec3 vLocal;
varying vec3 vNormalV;
void main() {
  float scale = mix(18.0, 4.0, uGiant);
  float g = fbm(vLocal * scale + vec3(0.0, uTime * 0.03, 0.0));
  float cells = 0.8 + 0.3 * g;
  // 흑점은 드물게 (강한 잡음 꼭대기만)
  float spots = smoothstep(0.8, 0.9, snoise(vLocal * 2.2 + uTime * 0.004)) * (1.0 - uGiant);
  float limb = pow(max(vNormalV.z, 0.0), 0.42);
  vec3 c = uColor * cells * (0.5 + 0.55 * limb) * (1.0 - spots * 0.65);
  gl_FragColor = vec4(c, 1.0);
}
`

/** 빛 번짐 (가산 혼합 스프라이트) */
export const glowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const glowFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uRays;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float core = exp(-r * r * 9.0);
  float halo = exp(-r * 3.2) * 0.55;
  float angle = atan(p.y, p.x);
  float rays = pow(abs(cos(angle * 3.0 + uTime * 0.05)), 40.0) * exp(-r * 2.5) * uRays;
  float a = (core + halo + rays) * uIntensity * smoothstep(1.0, 0.7, r);
  gl_FragColor = vec4(uColor * a, a);
}
`

/** 하늘 배경: 은하수 띠와 성운 (방향 벡터로 계산) */
export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const skyFragment = /* glsl */ `
${NOISE}
uniform vec3 uGalacticPole;
uniform float uMilkyWay;
uniform vec3 uTint;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float b = dot(d, uGalacticPole);
  float band = exp(-b * b * 22.0) * uMilkyWay;
  float clouds = fbm(d * 2.2) * 0.5 + 0.5;
  float fine = fbm(d * 9.0) * 0.5 + 0.5;
  vec3 deep = vec3(0.012, 0.018, 0.045);
  vec3 violet = vec3(0.09, 0.05, 0.16);
  vec3 teal = vec3(0.02, 0.09, 0.12);
  vec3 c = deep + violet * smoothstep(0.45, 0.85, clouds) * 0.55 + teal * smoothstep(0.55, 0.9, fbm(d * 1.6 + 3.0) * 0.5 + 0.5) * 0.45;
  c += vec3(0.16, 0.15, 0.2) * band * (0.4 + 0.6 * fine) * smoothstep(0.25, 0.75, clouds + 0.2);
  // 은하수 가운데 먼지 띠
  c *= 1.0 - band * 0.45 * smoothstep(0.55, 0.8, fbm(d * 5.0 + 7.0) * 0.5 + 0.5);
  gl_FragColor = vec4(c + uTint, 1.0);
}
`

/** 별 점 (크기·색은 속성, 화면 픽셀 고정) */
export const starPointsVertex = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPixelRatio;
uniform float uScale;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio * uScale;
  gl_Position = projectionMatrix * mv;
}
`

export const starPointsFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float a = exp(-r * 4.0) * uOpacity;
  gl_FragColor = vec4(vColor * a, a);
}
`

/** 거리에 따라 크기가 줄어드는 점 (은하·우주 거미줄) */
export const pointsVertex = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uPixelRatio;
uniform float uSize;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uSize * uPixelRatio / -mv.z, 1.0, 24.0);
  gl_Position = projectionMatrix * mv;
}
`

/** 소행성대·카이퍼 벨트: 정점마다 궤도 요소를 받아 셰이더에서 케플러 방정식을 풂 */
export const beltVertex = /* glsl */ `
attribute vec4 aOrbit;   // a, e, i, Ω (rad)
attribute vec2 aPhase;   // ω (rad), M0 (rad)
uniform float uDays;
uniform float uLinear;
uniform float uExpand;
uniform float uPixelRatio;
uniform float uSize;
varying float vFade;
void main() {
  float a = aOrbit.x * uExpand;
  float e = aOrbit.y;
  float n = 0.01720209895 / pow(aOrbit.x, 1.5);
  float M = aPhase.y + n * uDays;
  float E = M;
  for (int k = 0; k < 4; k++) E = E - (E - e * sin(E) - M) / (1.0 - e * cos(E));
  float x = a * (cos(E) - e);
  float y = a * sqrt(1.0 - e * e) * sin(E);
  float cO = cos(aOrbit.w); float sO = sin(aOrbit.w);
  float cw = cos(aPhase.x); float sw = sin(aPhase.x);
  float cI = cos(aOrbit.z); float sI = sin(aOrbit.z);
  vec3 p = vec3(
    (cw * cO - sw * sO * cI) * x + (-sw * cO - cw * sO * cI) * y,
    (cw * sO + sw * cO * cI) * x + (-sw * sO + cw * cO * cI) * y,
    (sw * sI) * x + (cw * sI) * y
  );
  float r = length(p);
  float rs = uLinear > 0.5 ? r * 10.0 : 10.0 * sqrt(r);
  vec3 scene = vec3(p.x, p.z, -p.y) * (rs / r);
  vec4 mv = modelViewMatrix * vec4(scene, 1.0);
  gl_PointSize = clamp(uSize * uPixelRatio * 40.0 / -mv.z, 1.0, 3.0);
  vFade = 1.0;
  gl_Position = projectionMatrix * mv;
}
`

export const beltFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  if (dot(p, p) > 1.0) discard;
  gl_FragColor = vec4(uColor, uOpacity * vFade);
}
`

/** 태양 폭풍(CME) 껍질: 가장자리가 밝고 잡음으로 일렁임 */
export const shellVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const shellFragment = /* glsl */ `
${NOISE}
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vLocal;
void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  float edge = 1.0 - abs(dot(V, normalize(vNormalW)));
  float n = fbm(normalize(vLocal) * 5.0 + uTime * 0.25) * 0.5 + 0.5;
  // 얇은 껍질은 시선이 스치는 가장자리가 밝고(주연 증광) 정면은 비침
  float a = uOpacity * (0.08 + 0.92 * pow(edge, 2.4)) * (0.55 + 0.6 * n);
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * 블랙홀: 화면에 붙인 사각형에서 빛이 휘는 정도를 근사해
 * 배경 별빛을 비틀고, 그림자와 광자 고리, 강착 원반 빛을 그림
 */
export const blackHoleFragment = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uDisk;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float shadow = 0.26;
  float ring = exp(-pow((r - shadow * 1.08) / 0.012, 2.0)) * 1.6;
  // 아인슈타인 고리처럼 휘어 모인 배경 빛
  float lens = exp(-pow((r - shadow * 1.6) / 0.08, 2.0)) * 0.35;
  float stars = smoothstep(0.82, 1.0, snoise(vec3(normalize(p) * (3.0 + 0.6 / max(r, 0.05)), 1.3)));
  vec3 c = vec3(0.9, 0.85, 1.0) * (lens + stars * 0.35 * smoothstep(shadow * 1.3, 0.9, r));
  c += vec3(1.0, 0.82, 0.55) * ring;
  if (uDisk > 0.0) {
    // 기울어진 강착 원반: 다가오는 쪽이 더 밝음 (도플러 증폭)
    vec2 q = vec2(p.x, p.y * 3.2);
    float dr = length(q);
    float disk = smoothstep(0.95, 0.55, dr) * smoothstep(shadow * 1.05, shadow * 1.6, dr);
    float swirl = fbm(vec3(atan(q.y, q.x) * 2.0 - uTime * 0.8, dr * 9.0, 0.0)) * 0.5 + 0.5;
    float beam = 1.0 + 0.8 * p.x / max(dr, 0.1);
    vec3 hot = mix(vec3(1.0, 0.45, 0.15), vec3(1.0, 0.92, 0.75), swirl);
    c += hot * disk * (0.45 + 0.8 * swirl) * beam * uDisk;
  }
  float a = clamp(max(max(c.r, c.g), c.b), 0.0, 1.0);
  if (r < shadow) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  gl_FragColor = vec4(c, a * smoothstep(1.0, 0.75, r));
}
`
