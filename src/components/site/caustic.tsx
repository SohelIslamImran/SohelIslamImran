import { useEffect, useRef } from "react";
import { currentGelHex, hexToRgb, type Gel } from "@/lib/gel";
import { useReducedMotion } from "@/hooks/use-reduced";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uTime;
uniform vec3 uPrimary;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float caustic(vec2 uv, float t, float scale) {
  vec2 p = uv * scale;
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    float a = float(i) * 2.094395102;
    vec2 dir = vec2(cos(a + t * 0.05), sin(a - t * 0.04));
    s += sin(dot(p, dir) * 3.15 + t);
  }
  return pow(abs(s), 3.2);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec2 m = (uMouse * uRes - 0.5 * uRes) / min(uRes.x, uRes.y);

  vec2 warp = vec2(
    sin(p.y * 3.1 + uTime * 0.31),
    cos(p.x * 2.7 - uTime * 0.27)
  ) * 0.07;
  warp += (m - p) * 0.1;

  float c1 = caustic(p + warp, uTime * 0.62, 4.4);
  float c2 = caustic(p - warp * 1.25 + vec2(0.17), uTime * 0.41 + 1.7, 6.6);
  float c = c1 * 0.62 + c2 * 0.48;

  float d = length(vUv - uMouse);
  float glow = exp(-d * 3.6);

  vec3 col = vec3(1.0);
  col -= vec3(0.16, 0.13, 0.1) * (1.0 - smoothstep(0.12, 0.8, c));
  col = mix(col, uPrimary, c * (0.34 + glow * 0.5));
  col.r += c2 * 0.06;
  col.b += c1 * 0.045;
  col += glow * vec3(1.0, 0.96, 0.93) * 0.1;

  float grain = hash(gl_FragCoord.xy + uTime) * 0.025;
  col += grain - 0.01;

  float alpha = 0.62 + c * 0.3 + glow * 0.2;
  gl_FragColor = vec4(col, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function CausticField() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;

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
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uPrimary = gl.getUniformLocation(prog, "uPrimary");
    const rgb = { v: hexToRgb(currentGelHex()) };

    const mouse = { x: 0.62, y: 0.28, tx: 0.62, ty: 0.28 };
    const fine = window.matchMedia("(pointer: fine)").matches;
    let w = 0;
    let h = 0;
    let t = 0;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      w = Math.max(1, Math.floor(window.innerWidth * dpr));
      h = Math.max(1, Math.floor(window.innerHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, w, h);
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    };

    const onGel = (e: Event) => {
      const gel = (e as CustomEvent<Gel>).detail;
      rgb.v = hexToRgb(gel?.hex || currentGelHex());
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uTime, t);
      gl.uniform3f(uPrimary, rgb.v[0], rgb.v[1], rgb.v[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("folio-gel", onGel);
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("folio-gel", onGel);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <canvas
      ref={ref}
      className="folio-caustic pointer-events-none fixed inset-0 z-0 mix-blend-multiply"
      aria-hidden="true"
    />
  );
}
