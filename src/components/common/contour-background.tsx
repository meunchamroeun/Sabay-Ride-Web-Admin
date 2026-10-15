"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Animated topographic-contour background (thin iso-lines drifting over a soft gradient),
 * drawn by one WebGL fragment shader. No three.js; pauses when the tab is hidden, draws a single
 * still frame for reduced-motion users, and follows the light/dark theme.
 */

type Palette = {
  top: number[];
  bottom: number[];
  glow: number[];
  line: number[];
  lineAlpha: number;
  /** Two soft colour pools (aurora); strength 0 turns them off. */
  auraA: number[];
  auraB: number[];
  auraStrength: number;
  /** Opacity of a faint dot grid (0 = none). */
  dots: number;
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const PALETTE: Record<"light" | "dark", Palette> = {
  // Warm paper with sand-coloured contours.
  light: {
    top: rgb("#f7f2e7"),
    bottom: rgb("#e3d9c6"),
    glow: rgb("#fffbf2"),
    line: rgb("#b9a57c"),
    lineAlpha: 0.42,
    auraA: rgb("#f3e3c0"),
    auraB: rgb("#e9dcc4"),
    auraStrength: 0.0,
    dots: 0.0,
  },
  // Neutral charcoal: no hue, barely-there grey contours and a faint dot grid.
  dark: {
    top: rgb("#1b1c1f"),
    bottom: rgb("#151618"),
    glow: rgb("#1e1f22"),
    line: rgb("#3a3d44"),
    lineAlpha: 0.55,
    auraA: rgb("#000000"),
    auraB: rgb("#000000"),
    auraStrength: 0.0,
    dots: 0.05,
  },
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// 3D simplex noise: Ashima Arts / Stefan Gustavson (MIT).
const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uTop, uBottom, uGlow, uLine, uAuraA, uAuraB;
uniform float uLineAlpha, uAuraStrength, uDots;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

  // Height field: two octaves of slowly evolving noise, plus a gentle rise under the pointer.
  float t = uTime;
  float h = snoise(vec3(p * 0.9, t * 0.035)) * 0.65
          + snoise(vec3(p * 2.1 + 11.0, t * 0.06)) * 0.22;
  h += 0.35 * exp(-dot(p - uPointer, p - uPointer) * 6.0);

  // Contours: distance to the nearest iso-level, anti-aliased with screen-space derivatives.
  float v = h * 9.0;
  float d = abs(fract(v + 0.5) - 0.5);
  float w = fwidth(v);
  // Every fifth contour is an "index" line: a touch wider and brighter, like a real topo map.
  float major = 1.0 - step(0.5, mod(floor(v + 0.5), 5.0));
  float line = 1.0 - smoothstep(0.0, w * mix(1.15, 1.9, major), d);
  float lineStrength = uLineAlpha * mix(1.0, 1.7, major);

  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, uv.y));
  col = mix(col, uGlow, 0.55 * exp(-dot(p - vec2(0.0, 0.35), p - vec2(0.0, 0.35)) * 2.2));

  // Slowly breathing colour pools.
  vec2 a = vec2(-0.75 + 0.08 * sin(t * 0.13), -0.45 + 0.06 * cos(t * 0.11));
  vec2 b = vec2(0.8 + 0.07 * cos(t * 0.09), 0.5 + 0.08 * sin(t * 0.12));
  float ga = exp(-dot(p - a, p - a) * 1.6);
  float gb = exp(-dot(p - b, p - b) * 1.9);
  col += (uAuraA * ga + uAuraB * gb) * uAuraStrength * 0.6;

  float vignette = smoothstep(1.25, 0.25, length(p));
  // Lines pick up a little of the aura colour where they cross it.
  vec3 lineCol = uLine + (uAuraA * ga + uAuraB * gb) * uAuraStrength * 0.5;
  col = mix(col, lineCol, line * lineStrength * (0.45 + 0.55 * vignette));

  // Faint dot grid (pixel-spaced so it stays crisp at any size).
  vec2 cell = mod(gl_FragCoord.xy, 48.0) - 24.0;
  float grid = 1.0 - smoothstep(0.8, 1.6, length(cell));
  col += vec3(grid * uDots);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export function ContourBackground({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const palette = useRef<Palette>(PALETTE.dark);
  const redraw = useRef<(() => void) | null>(null);

  useEffect(() => {
    palette.current = PALETTE[resolvedTheme === "light" ? "light" : "dark"];
    redraw.current?.();
  }, [resolvedTheme]);

  useEffect(() => {
    const el = canvas.current;
    const gl = el?.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!el || !gl || !gl.getExtension("OES_standard_derivatives")) return; // CSS colour shows instead

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
    } catch {
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uTime = u("uTime"), uPointer = u("uPointer");
    const uTop = u("uTop"), uBottom = u("uBottom"), uGlow = u("uGlow"), uLine = u("uLine"), uLineAlpha = u("uLineAlpha");
    const uAuraA = u("uAuraA"), uAuraB = u("uAuraB"), uAuraStrength = u("uAuraStrength"), uDots = u("uDots");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const start = performance.now();
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.max(1, Math.floor(el.clientWidth * dpr));
      el.height = Math.max(1, Math.floor(el.clientHeight * dpr));
      gl.viewport(0, 0, el.width, el.height);
    };

    const draw = (now = performance.now()) => {
      const p = palette.current;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      gl.uniform2f(uRes, el.width, el.height);
      gl.uniform1f(uTime, reduced ? 12 : (now - start) / 1000);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform3fv(uTop, p.top);
      gl.uniform3fv(uBottom, p.bottom);
      gl.uniform3fv(uGlow, p.glow);
      gl.uniform3fv(uLine, p.line);
      gl.uniform1f(uLineAlpha, p.lineAlpha);
      gl.uniform3fv(uAuraA, p.auraA);
      gl.uniform3fv(uAuraB, p.auraB);
      gl.uniform1f(uAuraStrength, p.auraStrength);
      gl.uniform1f(uDots, p.dots);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      cancelAnimationFrame(raf);
      if (!reduced && !document.hidden) raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      const m = Math.min(window.innerWidth, window.innerHeight);
      pointer.tx = (e.clientX - window.innerWidth / 2) / m;
      pointer.ty = -(e.clientY - window.innerHeight / 2) / m;
    };

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(el);
    resize();
    redraw.current = () => draw();
    draw();
    play();
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", play);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", play);
      redraw.current = null;
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={cn("pointer-events-none block size-full bg-[#ece4d4] dark:bg-[#18191b]", className)}
    />
  );
}
