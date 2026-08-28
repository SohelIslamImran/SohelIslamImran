import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { currentGelHex, hexToRgb } from "@/lib/gel";

export type LensPointer = { x: number; y: number };

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
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
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * 2.0 - 1.0;
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

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LensGlass({
  pointer,
  reduced,
  playing,
}: {
  pointer: MutableRefObject<LensPointer>;
  reduced: boolean;
  playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uPrimary = gl.getUniformLocation(program, "uPrimary");
    const uTime = gl.getUniformLocation(program, "uTime");

    const primary = { r: 0.76, g: 0.278, b: 0.227 };
    const smooth = { x: 0, y: 0 };
    const applyGel = () => {
      const [r, g, b] = hexToRgb(currentGelHex());
      primary.r = r;
      primary.g = g;
      primary.b = b;
    };
    applyGel();
    window.addEventListener("folio-gel", applyGel);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing && !reduced && !document.hidden) elapsed += dt;
      const target = reduced ? { x: 0, y: 0 } : pointer.current;
      smooth.x += (target.x - smooth.x) * 0.12;
      smooth.y += (target.y - smooth.y) * 0.12;
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uPointer, smooth.x, smooth.y);
      gl.uniform3f(uPrimary, primary.r, primary.g, primary.b);
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      raf = playing && !reduced ? requestAnimationFrame(loop) : 0;
    };
    draw(performance.now());
    if (playing && !reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("folio-gel", applyGel);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [pointer, playing, reduced]);

  return <canvas className="lens-glass-gl" aria-hidden="true" ref={canvasRef} />;
}
