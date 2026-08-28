import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { Color, FrontSide, Group, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2 } from "three";
import { currentGelHex } from "@/lib/gel";

export type LensPointer = { x: number; y: number };

const glassVert = /* glsl */ `
varying vec3 vN;
varying vec3 vPos;
void main() {
  float rho = length(position.xy);
  vec3 p = position + normal * sin(rho * 22.0) * 0.01 * smoothstep(0.15, 1.0, rho);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vPos = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const glassFrag = /* glsl */ `
varying vec3 vN;
varying vec3 vPos;
uniform vec3 uPaper;
uniform vec3 uPrimary;
uniform vec2 uLight;
uniform float uTime;

float schlick(float f0, float ndv) {
  float u = 1.0 - clamp(ndv, 0.0, 1.0);
  return f0 + (1.0 - f0) * u * u * u * u * u;
}

vec3 thinFilm(float ndv, float t) {
  vec3 lambda = vec3(0.61, 0.55, 0.47);
  vec3 phase = 12.56637 * 1.38 * 0.55 / lambda * ndv + t * 0.22;
  return 0.5 + 0.5 * cos(phase);
}

void main() {
  vec3 n = normalize(vN);
  vec3 view = normalize(cameraPosition - vPos);
  float ndv = max(dot(n, view), 0.0);
  float F = schlick(0.04, ndv);

  vec3 L = normalize(vec3(uLight.x, uLight.y, 0.92));
  vec3 H = normalize(L + view);
  float spec = pow(max(dot(n, H), 0.0), 90.0);
  float specWide = pow(max(dot(n, H), 0.0), 12.0);
  float streak = specWide * exp(-abs(n.y) * 10.0);

  vec3 irid = thinFilm(ndv, uTime);
  vec3 env = mix(uPaper, vec3(1.0), n.y * 0.4 + 0.6);
  env = mix(env, uPrimary, smoothstep(0.3, -0.2, n.y) * 0.12);

  float rho = length(n.xy);
  float newton = 0.5 + 0.5 * cos(rho * rho * 88.0 - uTime * 0.28);

  vec3 col = mix(vec3(1.0), env, F);
  col = mix(col, irid, F * 0.55);
  col = mix(col, uPrimary, newton * F * 0.18);
  col += spec * vec3(1.0);
  col += streak * vec3(1.0, 0.95, 0.9) * 0.7;
  col += irid * F * 0.22;

  float alpha = F * 0.72 + spec * 0.55 + streak * 0.28 + newton * F * 0.12;
  gl_FragColor = vec4(col, clamp(alpha, 0.02, 0.92));
}
`;

const plateVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const plateFrag = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uMap;
uniform vec2 uMapSize;
uniform vec2 uPointer;
uniform vec3 uPaper;
uniform float uTime;

vec2 coverUv(vec2 uv) {
  float texA = uMapSize.x / max(uMapSize.y, 1.0);
  vec2 s = uv;
  if (texA > 1.0) {
    float f = 1.0 / texA;
    s.x = (uv.x - 0.5) * f + 0.5;
  } else {
    s.y = (uv.y - 0.5) * texA + 0.5;
  }
  return s;
}

vec2 barrel(vec2 uv, float k) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + k * r2;
  return c * 0.5 + 0.5;
}

void main() {
  float r = length(vUv * 2.0 - 1.0);
  if (r > 1.0) discard;

  vec2 uv = coverUv(vUv);
  float defocus = length(uPointer);
  float k = 0.06 + defocus * 0.04;
  vec2 ca = uPointer * 0.012;

  vec3 rgb = vec3(
    texture2D(uMap, clamp(barrel(uv + ca, k), 0.0, 1.0)).r,
    texture2D(uMap, clamp(barrel(uv, k), 0.0, 1.0)).g,
    texture2D(uMap, clamp(barrel(uv - ca, k), 0.0, 1.0)).b
  );

  float blur = defocus * 0.006;
  if (blur > 0.0008) {
    vec2 o = vec2(blur, 0.0);
    rgb = rgb * 0.52
      + texture2D(uMap, clamp(barrel(uv + o, k), 0.0, 1.0)).rgb * 0.12
      + texture2D(uMap, clamp(barrel(uv - o, k), 0.0, 1.0)).rgb * 0.12
      + texture2D(uMap, clamp(barrel(uv + o.yx, k), 0.0, 1.0)).rgb * 0.12
      + texture2D(uMap, clamp(barrel(uv - o.yx, k), 0.0, 1.0)).rgb * 0.12;
  }

  rgb = pow(max(rgb, vec3(0.0)), vec3(0.86));
  rgb *= 1.18;
  rgb = mix(uPaper * 0.42, rgb, 0.9);

  float vig = mix(1.0, pow(max(1.0 - r * 0.42, 0.0), 1.1), 0.55);
  float cau = pow(0.52 + 0.48 * sin((uv.x + uv.y) * 28.0 + uTime) * sin(uv.x * 22.0 - uTime * 0.65), 3.0);
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime * 3.0) * 43758.5453);

  vec3 col = rgb * vig;
  col += cau * vec3(1.0, 0.96, 0.9) * 0.06;
  col += (grain - 0.5) * 0.03;

  gl_FragColor = vec4(col, 1.0);
}
`;

const metalVert = /* glsl */ `
varying vec3 vN;
varying vec3 vPos;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPos = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const metalFrag = /* glsl */ `
varying vec3 vN;
varying vec3 vPos;
uniform vec3 uPrimary;
uniform vec2 uLight;

void main() {
  vec3 n = normalize(vN);
  vec3 view = normalize(cameraPosition - vPos);
  vec3 T = normalize(vec3(-n.z, 0.0, n.x));
  float aniso = pow(abs(dot(T, view)), 5.0);
  vec3 L = normalize(vec3(uLight.x, uLight.y, 0.8));
  float spec = pow(max(dot(n, normalize(L + view)), 0.0), 36.0);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 2.0);
  float theta = atan(vPos.y, vPos.x);
  float ticks = smoothstep(0.03, 0.0, abs(fract(theta * 3.8197) - 0.5));

  vec3 col = mix(vec3(0.62, 0.6, 0.57), vec3(0.97, 0.96, 0.94), aniso);
  col = mix(col, uPrimary, 0.08 * (1.0 - aniso));
  col += spec * 0.65;
  col += rim * 0.22;
  col = mix(col, vec3(0.28, 0.26, 0.24), ticks * 0.5);
  gl_FragColor = vec4(col, 1.0);
}
`;

function Boot() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate]);
  return null;
}

function LensAssembly({
  pointer,
  reduced,
}: {
  pointer: MutableRefObject<LensPointer>;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  const glass = useRef<ShaderMaterial>(null);
  const plate = useRef<ShaderMaterial>(null);
  const metal = useRef<ShaderMaterial>(null);
  const texture = useLoader(TextureLoader, "/portrait.png");

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const paper = useMemo(() => new Color("#f5f4f1"), []);
  const primary = useMemo(() => new Color(currentGelHex()), []);

  useEffect(() => {
    const sync = () => primary.set(currentGelHex());
    sync();
    window.addEventListener("folio-gel", sync);
    return () => window.removeEventListener("folio-gel", sync);
  }, [primary]);

  const glassUniforms = useMemo(
    () => ({
      uPaper: { value: paper },
      uPrimary: { value: primary },
      uLight: { value: new Vector2(0.35, 0.6) },
      uTime: { value: 0 },
    }),
    [paper, primary],
  );

  const plateUniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uMapSize: { value: new Vector2(texture.image?.width || 300, texture.image?.height || 300) },
      uPointer: { value: new Vector2(0, 0) },
      uPaper: { value: paper },
      uTime: { value: 0 },
    }),
    [texture, paper],
  );

  const metalUniforms = useMemo(
    () => ({
      uPrimary: { value: primary },
      uLight: { value: new Vector2(0.35, 0.6) },
    }),
    [primary],
  );

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const prev = glass.current?.uniforms.uTime.value;
    const t = (typeof prev === "number" ? prev : 0) + d;
    if (glass.current) glass.current.uniforms.uTime.value = t;
    if (plate.current) plate.current.uniforms.uTime.value = t;

    const px = reduced ? 0 : pointer.current.x;
    const py = reduced ? 0 : pointer.current.y;
    if (plate.current) plate.current.uniforms.uPointer.value.set(px, py);

    const lx = 0.35 + px * 0.45;
    const ly = 0.6 - py * 0.32;
    if (glass.current) glass.current.uniforms.uLight.value.set(lx, ly);
    if (metal.current) metal.current.uniforms.uLight.value.set(lx, ly);

    if (!group.current || reduced) return;
    const idleX = Math.sin(t * 0.35) * 0.06;
    const idleY = Math.cos(t * 0.27) * 0.04;
    const tx = px * 0.38 + idleX;
    const ty = py * 0.26 + idleY;
    group.current.rotation.y += (tx - group.current.rotation.y) * 0.09;
    group.current.rotation.x += (ty - group.current.rotation.x) * 0.09;
  });

  return (
    <group ref={group}>
      <mesh renderOrder={0} position={[0, 0, -0.02]}>
        <circleGeometry args={[1.28, 48]} />
        <meshBasicMaterial color={paper} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1} position={[0, 0, 0.05]}>
        <circleGeometry args={[1.08, 64]} />
        <shaderMaterial
          ref={plate}
          vertexShader={plateVert}
          fragmentShader={plateFrag}
          uniforms={plateUniforms}
          toneMapped={false}
        />
      </mesh>
      <mesh renderOrder={2}>
        <sphereGeometry args={[1.32, 64, 64]} />
        <shaderMaterial
          ref={glass}
          vertexShader={glassVert}
          fragmentShader={glassFrag}
          uniforms={glassUniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
          side={FrontSide}
        />
      </mesh>
      <mesh renderOrder={3}>
        <torusGeometry args={[1.38, 0.045, 16, 80]} />
        <shaderMaterial
          ref={metal}
          vertexShader={metalVert}
          fragmentShader={metalFrag}
          uniforms={metalUniforms}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function LensScene({
  pointer,
  reduced,
  playing,
}: {
  pointer: MutableRefObject<LensPointer>;
  reduced: boolean;
  playing: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 3.4], fov: 30 }}
      gl={{ alpha: true, antialias: true, stencil: false, powerPreference: "high-performance" }}
      frameloop={playing ? "always" : "demand"}
      flat
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Boot />
      <Suspense fallback={null}>
        <LensAssembly pointer={pointer} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
