import { useEffect, useRef } from "react";
import { currentGelHex, hexToRgb } from "@/lib/gel";
import { currentTheme } from "@/lib/theme";
import { useReducedMotion } from "@/hooks/use-reduced";

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uPrimary;
uniform float uDark;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float caustic(vec2 p, float t) {
  vec2 q = p;
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 w = q + vec2(sin(t * (0.31 + fi * 0.07) + q.y * 1.3), cos(t * (0.24 + fi * 0.05) - q.x * 1.1));
    v += amp * exp(-abs(sin(w.x) * cos(w.y)) * (3.4 + fi));
    q = mat2(0.78, -0.62, 0.62, 0.78) * q * 1.35;
    amp *= 0.62;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime * 0.22;
  vec2 par = (uPointer - 0.5) * vec2(0.22, 0.16);
  float c1 = caustic(p * 2.15 + par, t);
  float c2 = caustic(p * 3.1 - par * 1.4 + 2.7, t * 0.85 + 1.7);
  float c = mix(c1, c2, 0.45);
  float n = noise(p * 18.0 + t * 0.15);
  vec3 paper = mix(vec3(0.965, 0.965, 0.972), vec3(0.07, 0.07, 0.08), uDark);
  vec3 col = mix(paper, uPrimary, c * mix(0.42, 0.55, uDark));
  col = mix(col, vec3(1.0), c * mix(0.22, 0.08, uDark));
  col += (n - 0.5) * 0.025;
  float vign = smoothstep(1.2, 0.12, length(p));
  float alpha = (mix(0.2, 0.14, uDark) + c * mix(0.4, 0.32, uDark)) * vign;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, mix(0.62, 0.48, uDark)));
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

export function LightField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
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
    const uTime = gl.getUniformLocation(program, "uTime");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uPrimary = gl.getUniformLocation(program, "uPrimary");
    const uDark = gl.getUniformLocation(program, "uDark");

    const pointer = { x: 0.62, y: 0.28 };
    const primary = { r: 0.76, g: 0.278, b: 0.227 };
    const theme = { dark: 0 };
    const applyGel = () => {
      const [r, g, b] = hexToRgb(currentGelHex());
      primary.r = r;
      primary.g = g;
      primary.b = b;
    };
    const applyTheme = () => {
      theme.dark = currentTheme() === "dark" ? 1 : 0;
    };
    applyGel();
    applyTheme();

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / Math.max(1, window.innerWidth);
      pointer.y = 1 - e.clientY / Math.max(1, window.innerHeight);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("folio-gel", applyGel);
    window.addEventListener("folio-theme", applyTheme);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
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
    const t0 = performance.now();
    const loop = (now: number) => {
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      resize();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform3f(uPrimary, primary.r, primary.g, primary.b);
      gl.uniform1f(uDark, theme.dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("folio-gel", applyGel);
      window.removeEventListener("folio-theme", applyTheme);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="atmosphere-field" aria-hidden="true" />;
}
