import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { currentGelHex, hexToRgb } from "@/lib/gel";

export type LensPointer = { x: number; y: number };

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos,0.0,1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform vec3 uPrimary;

void main() {
  vec2 p = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec2 b = abs(p) - 0.72;
  float d = length(max(b, 0.0)) - 0.28;
  float inside = 1.0 - smoothstep(-0.02, 0.02, d);
  if (inside < 0.001) discard;
  float edge = smoothstep(-0.28, 0.0, d);
  vec2 L = vec2(uPointer.x, -uPointer.y) * 0.4 + vec2(0.18, 0.42);
  float fall = max(1.0 - length(p - L), 0.0);
  float spec = fall * fall * fall * fall;
  spec *= spec;
  float streak = max(fall * fall * (1.0 - abs(p.y - L.y) * 4.2), 0.0);
  vec3 col = mix(vec3(1.0), uPrimary, edge * 0.12);
  col += spec + streak * 0.45;
  float alpha = (edge * 0.08 + spec * 0.32 + streak * 0.14) * inside;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.38));
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
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uPrimary = gl.getUniformLocation(program, "uPrimary");

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
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.4;
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
    let last = 0;
    const frameMs = 1000 / 12;

    const draw = () => {
      const target = reduced ? { x: 0, y: 0 } : pointer.current;
      smooth.x += (target.x - smooth.x) * 0.16;
      smooth.y += (target.y - smooth.y) * 0.16;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uPointer, smooth.x, smooth.y);
      gl.uniform3f(uPrimary, primary.r, primary.g, primary.b);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < frameMs) return;
      last = now;
      draw();
      if (!playing || reduced) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    draw();
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
