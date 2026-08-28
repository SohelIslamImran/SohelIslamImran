import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { ShaderMaterial, Vector2, Color } from "three";
import { currentGelHex } from "@/lib/gel";

export type LensPointer = { x: number; y: number };

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
varying vec2 vUv;
uniform vec2 uPointer;
uniform vec3 uPrimary;
uniform float uTime;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float schlick(float f0, float ndv) {
  float u = 1.0 - clamp(ndv, 0.0, 1.0);
  return f0 + (1.0 - f0) * u * u * u * u * u;
}

vec3 thinFilm(float ndv, float t) {
  vec3 lambda = vec3(0.61, 0.55, 0.47);
  vec3 phase = 12.56637 * 1.38 * 0.55 / lambda * ndv + t * 0.18;
  return 0.5 + 0.5 * cos(phase);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d = sdRoundedBox(p, vec2(1.0), 0.32);
  float inside = 1.0 - smoothstep(-0.012, 0.012, d);
  if (inside < 0.001) discard;

  float edge = smoothstep(-0.28, 0.0, d);
  float ndv = 1.0 - edge;
  float F = schlick(0.035, ndv);

  vec2 L = vec2(uPointer.x, -uPointer.y) * 0.42 + vec2(0.18, 0.42);
  float spec = pow(max(1.0 - length(p - L), 0.0), 14.0);
  float specWide = pow(max(1.0 - length(p - L), 0.0), 4.5);
  float streak = specWide * exp(-abs(p.y - L.y) * 7.0) * (0.35 + edge);

  vec3 irid = thinFilm(ndv, uTime);
  float newton = 0.5 + 0.5 * cos(length(p) * length(p) * 42.0 - uTime * 0.22);

  vec3 col = mix(vec3(1.0), irid, F * 0.55);
  col = mix(col, uPrimary, newton * F * 0.12);
  col += spec * vec3(1.0);
  col += streak * vec3(1.0, 0.97, 0.94) * 0.65;
  col += irid * edge * 0.12;

  float alpha = (F * 0.28 + spec * 0.36 + streak * 0.16 + edge * 0.06) * inside;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.42));
}
`;

function Boot() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate]);
  return null;
}

function GlassSheet({
  pointer,
  reduced,
}: {
  pointer: MutableRefObject<LensPointer>;
  reduced: boolean;
}) {
  const mat = useRef<ShaderMaterial>(null);
  const { viewport } = useThree();
  const primary = useMemo(() => new Color(currentGelHex()), []);

  useEffect(() => {
    const sync = () => primary.set(currentGelHex());
    sync();
    window.addEventListener("folio-gel", sync);
    return () => window.removeEventListener("folio-gel", sync);
  }, [primary]);

  const uniforms = useMemo(
    () => ({
      uPointer: { value: new Vector2(0, 0) },
      uPrimary: { value: primary },
      uTime: { value: 0 },
    }),
    [primary],
  );

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const prev = mat.current?.uniforms.uTime.value;
    const t = (typeof prev === "number" ? prev : 0) + d;
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = t;
    const px = reduced ? 0 : pointer.current.x;
    const py = reduced ? 0 : pointer.current.y;
    const cur = mat.current.uniforms.uPointer.value as Vector2;
    cur.x += (px - cur.x) * 0.12;
    cur.y += (py - cur.y) * 0.12;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
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
      orthographic
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 1], zoom: 1 }}
      gl={{ alpha: true, antialias: true, stencil: false, powerPreference: "high-performance" }}
      frameloop={playing ? "always" : "demand"}
      flat
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Boot />
      <GlassSheet pointer={pointer} reduced={reduced} />
    </Canvas>
  );
}
