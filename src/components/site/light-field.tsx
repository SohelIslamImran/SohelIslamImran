import { useEffect, useRef } from "react";
import { currentGelHex, hexToRgb } from "@/lib/gel";
import { currentTheme } from "@/lib/theme";

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos,0.0,1.0); }
`;

// 1 octave, no exp/noise, mediump — shader compile + fill was freezing clicks.
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uPrimary;
uniform float uDark;

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 par = (uPointer - 0.5) * vec2(0.14, 0.10);
  float t = uTime * 0.16;
  vec2 q = p * 1.85 + par;
  float s = sin(q.x * 2.8 + t) * cos(q.y * 2.4 - t * 0.85);
  float c = s * s;
  vec3 paper = mix(vec3(0.965, 0.965, 0.972), vec3(0.07, 0.07, 0.08), uDark);
  vec3 col = mix(paper, uPrimary, c * mix(0.36, 0.48, uDark));
  col = mix(col, vec3(1.0), c * mix(0.14, 0.05, uDark));
  float vign = clamp(1.15 - length(p), 0.0, 1.0);
  float alpha = (mix(0.14, 0.10, uDark) + c * mix(0.28, 0.22, uDark)) * vign;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, mix(0.42, 0.34, uDark)));
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
      desynchronized: true,
      failIfMajorPerformanceCaveat: true,
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
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.28;
      const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
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
    let last = 0;
    const frameMs = 1000 / 12;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < frameMs) return;
      last = now;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform3f(uPrimary, primary.r, primary.g, primary.b);
      gl.uniform1f(uDark, theme.dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
  }, []);

  return <canvas ref={canvasRef} className="atmosphere-field" aria-hidden="true" />;
}
