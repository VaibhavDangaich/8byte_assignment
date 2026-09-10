"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);

  float pinchX = 0.5;
  if (uEnableMouse > 0.5) {
    pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  }

  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = sign(pinchX - uv.x);
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;

  vec3 col = vec3(0.0);
  float gsum = 0.0;

  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;

    float amplitude = spreadDx * (1.0 + i * uTaper);
    float phase = (baseT + i * tauOverN) * mirror;

    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;

    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);

    col += g * threadCol;
    gsum += g;
  }

  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);

  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;

  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;

  vec3 outRgb = col * alpha;

float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
  outRgb = clamp(outRgb + gv, 0.0, 1.0);
  alpha = clamp(alpha + gv, 0.0, 1.0);

  fragColor = vec4(outRgb, alpha);
}
`;

type WebThreadsProps = {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  threadCount?: number;
  frequency?: number;
  spread?: number;
  taper?: number;
  position?: number;
  glow?: number;
  falloff?: number;
  thickness?: number;
  brightness?: number;
  opacity?: number;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
};

export default function WebThreads({
  color1 = "#5227FF",
  color2 = "#FF9FFC",
  color3 = "#FFFFFF",
  speed = 0.2,
  threadCount = 6,
  frequency = 5.0,
  spread = 0.18,
  taper = 1.0,
  position = 0.5,
  glow = 0.02,
  falloff = 0.6,
  thickness = 1.1,
  brightness = 0.6,
  opacity = 1.0,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseStrength = 0.3,
}: WebThreadsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = useRef({
    enabled: mouseInteraction,
    strength: mouseStrength,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    let program: Program;
    let mesh: Mesh;
    try {
      program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Float32Array([1, 1]) },
          uSpeed: { value: speed },
          uThreadCount: { value: Math.round(threadCount) },
          uFrequency: { value: frequency },
          uSpread: { value: spread },
          uTaper: { value: taper },
          uPosition: { value: position },
          uGlow: { value: glow },
          uFalloff: { value: falloff },
          uThickness: { value: thickness },
          uBrightness: { value: brightness },
          uOpacity: { value: opacity },
          uGrainIntensity: { value: grainIntensity },
          uColor1: { value: new Float32Array(hexToRgb(color1)) },
          uColor2: { value: new Float32Array(hexToRgb(color2)) },
          uColor3: { value: new Float32Array(hexToRgb(color3)) },
          uMouse: { value: new Float32Array([0.5, 0.5]) },
          uMouseStrength: { value: mouseStrength },
          uEnableMouse: { value: mouseInteraction ? 1 : 0 },
          uMouseActive: { value: 0 },
        },
      });
      mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    } catch {
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return;
    }

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(
        Math.max(1, Math.floor(rect.width)),
        Math.max(1, Math.floor(rect.height)),
      );
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);
    setSize();

    const current = [0.5, 0.5];
    const target = [0.5, 0.5];
    let currentActive = 0;
    let targetActive = 0;

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target[0] = (event.clientX - rect.left) / rect.width;
      target[1] = 1 - (event.clientY - rect.top) / rect.height;
      targetActive = 1;
    };
    const onMouseLeave = () => {
      targetActive = 0;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    let raf = 0;
    let onScreen = true;
    let pageVisible = !document.hidden;
    const start = performance.now();

    const loop = (time: number) => {
      program.uniforms.iTime.value = (time - start) * 0.001;
      current[0] += 0.05 * (target[0] - current[0]);
      current[1] += 0.05 * (target[1] - current[1]);
      currentActive += 0.05 * (targetActive - currentActive);
      const mouse = program.uniforms.uMouse.value as Float32Array;
      mouse[0] = current[0];
      mouse[1] = current[1];
      program.uniforms.uMouseActive.value = currentActive;
      program.uniforms.uEnableMouse.value = settings.current.enabled ? 1 : 0;
      program.uniforms.uMouseStrength.value = settings.current.strength;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const play = () => {
      if (onScreen && pageVisible && raf === 0)
        raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) play();
        else pause();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (pageVisible) play();
      else pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    play();

    return () => {
      pause();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  useEffect(() => {
    settings.current = { enabled: mouseInteraction, strength: mouseStrength };
  }, [mouseInteraction, mouseStrength]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
    />
  );
}
