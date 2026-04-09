import React, { useEffect, useRef, ReactNode, useState } from 'react';
import { useLiquidGlass } from './LiquidGlassContext';

interface LiquidGlassContainerProps {
  children: ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  borderRadius?: number;
  containerRef?: React.RefObject<HTMLDivElement>;
  useGlass?: boolean;
}

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  
  void main() {
    v_uv = vec2(a_position.x, -a_position.y) * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float u_dpr;
  uniform sampler2D u_background;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform vec2 u_size;
  uniform float u_intensity;
  varying vec2 v_uv;

  float cssPxUV() {
    return u_dpr / min(u_resolution.x, u_resolution.y);
  }

  float roundedBox(vec2 uv, vec2 center, vec2 size, float radius) {
    vec2 q = abs(uv - center) - size + radius;
    return length(max(q, 0.0)) - radius;
  }

  vec3 blurBackground(vec2 uv, vec2 resolution) {
    vec3 result = vec3(0.0);
    float total = 0.0;
    float radius = 2.0;
    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec2 offset = vec2(float(x), float(y)) * 1.5 / resolution;
        float weight = exp(-(float(x * x + y * y)) / (2.0 * radius));
        result += texture2D(u_background, uv + offset).rgb * weight;
        total += weight;
      }
    }
    return result / total;
  }

  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + vec2(r);
    return length(max(d, 0.0)) - r;
  }

  vec2 getNormal(vec2 uv, vec2 center, vec2 size, float radius) {
    vec2 eps = vec2(1.0) / u_resolution * 2.0;
    vec2 p = uv - center;

    float sdfCenter = roundedBoxSDF(p, size, radius);
    float dx = (roundedBoxSDF(p + vec2(eps.x, 0.0), size, radius) - roundedBoxSDF(p - vec2(eps.x, 0.0), size, radius)) * 0.5;
    float dy = (roundedBoxSDF(p + vec2(0.0, eps.y), size, radius) - roundedBoxSDF(p - vec2(0.0, eps.y), size, radius)) * 0.5;

    vec2 gradient = vec2(dx, dy);
    float dxy1 = roundedBoxSDF(p + eps, size, radius);
    float dxy2 = roundedBoxSDF(p - eps, size, radius);
    vec2 diag = vec2(dxy1 - dxy2);

    gradient = mix(gradient, diag, 0.15);

    if (length(gradient) < 0.001) {
      return vec2(0.0);
    }
    return normalize(gradient);
  }

  void main() {
    vec2 pixelUV = (v_uv * u_resolution) / u_dpr;
    vec2 center = u_mouse;
    vec2 size = u_size * 0.5;

    vec2 local = (pixelUV - center) / size;
    local.y *= u_resolution.x / u_resolution.y;

    float radius = 20.0;
    float dist = roundedBox(pixelUV, center, size, radius);

    if (dist > 1.0) {
      gl_FragColor = texture2D(u_background, v_uv);
      return;
    }

    float r = clamp(length(local * 1.0), 0.0, 1.0);
    float curvature = pow(r, 1.0);
    vec2 domeNormal = normalize(local) * curvature;
    float eta = 1.0 / 1.5;
    vec2 incident = -domeNormal;
    vec2 refractVec = refract(incident, domeNormal, eta);
    vec2 curvedRefractUV = v_uv + refractVec * (0.02 * u_intensity);

    float contourFalloff = exp(-abs(dist) * 0.4);
    vec2 normal = getNormal(pixelUV, center, size, radius);
    vec2 domeNormalContour = normal * pow(contourFalloff, 1.5);
    vec2 refractVecContour = refract(vec2(0.0), domeNormalContour, eta);
    vec2 uvContour = v_uv + refractVecContour * (0.25 * u_intensity) * contourFalloff;

    float edgeWeight = smoothstep(0.0, 1.0, abs(dist));
    float radialWeight = smoothstep(0.5, 1.0, r);
    float combinedWeight = clamp((edgeWeight * 1.0) + (-radialWeight * 0.5), 0.0, 1.0);
    vec2 refractUV = mix(curvedRefractUV, uvContour, combinedWeight);

    vec3 refracted = texture2D(u_background, refractUV).rgb;
    vec3 blurred = blurBackground(refractUV, u_resolution);
    vec3 base = mix(refracted, blurred, 0.4);

    float edgeFalloff = smoothstep(0.01, 0.0, dist);
    float verticalBand = 1.0 - smoothstep(-1.5, -0.2, local.y);
    float topShadow = edgeFalloff * verticalBand;
    vec3 shadowColor = vec3(0.0);
    base = mix(base, shadowColor, topShadow * 0.08);

    float edge = 1.0 - smoothstep(0.0, 0.03, dist * -2.0);
    vec3 glow = vec3(0.8, 0.9, 1.0);
    vec3 color = mix(base, glow, edge * 0.3);

    float alpha = 0.8;
    gl_FragColor = vec4(color, alpha);
  }
`;

export const LiquidGlassContainer: React.FC<LiquidGlassContainerProps> = ({
  children,
  className = '',
  intensity = 'medium',
  borderRadius = 20,
  containerRef: externalRef,
  useGlass = true,
}) => {
  const { mousePos, isDesktop } = useLiquidGlass();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationRef = useRef<number>(0);

  const intensityMap = { low: 0.5, medium: 1.0, high: 1.5 };
  const intensityValue = intensityMap[intensity];

  useEffect(() => {
    if (!isDesktop || !useGlass) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    try {
      const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
      if (!gl) return;

      glRef.current = gl;
      const dpr = window.devicePixelRatio || 1;

      const resize = () => {
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
      };

      const compileShader = (type: GLenum, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader compile error:', gl.getShaderInfoLog(shader));
          return null;
        }
        return shader;
      };

      const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

      if (!vertexShader || !fragmentShader) return;

      const program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
      }

      gl.useProgram(program);

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const u_resolution = gl.getUniformLocation(program, 'u_resolution');
      const u_mouse = gl.getUniformLocation(program, 'u_mouse');
      const u_size = gl.getUniformLocation(program, 'u_size');
      const u_dpr = gl.getUniformLocation(program, 'u_dpr');
      const u_intensity = gl.getUniformLocation(program, 'u_intensity');

      // Create background texture from current background
      const backgroundTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Initialize with blank texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([100, 100, 150, 255]));

      gl.uniform1i(gl.getUniformLocation(program, 'u_background'), 0);
      gl.uniform1f(u_dpr, dpr);

      let targetMouse = [window.innerWidth / 2, window.innerHeight / 2];
      let currentMouse = [...targetMouse];
      let targetSize = [200, 100];
      let currentSize = [...targetSize];

      const draw = () => {
        const delta = 0.016; // ~60fps
        const speed = 6.0;

        currentMouse[0] += (targetMouse[0] - currentMouse[0]) * speed * delta;
        currentMouse[1] += (targetMouse[1] - currentMouse[1]) * speed * delta;
        currentSize[0] += (targetSize[0] - currentSize[0]) * speed * delta;
        currentSize[1] += (targetSize[1] - currentSize[1]) * speed * delta;

        resize();
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(u_resolution, canvas.width, canvas.height);
        gl.uniform2f(u_mouse, currentMouse[0] * dpr, currentMouse[1] * dpr);
        gl.uniform2f(u_size, currentSize[0], currentSize[1]);
        gl.uniform1f(u_intensity, intensityValue);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        animationRef.current = requestAnimationFrame(draw);
      };

      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        targetMouse = [e.clientX - rect.left, e.clientY - rect.top];
      };

      window.addEventListener('mousemove', handleMouseMove);
      resize();
      draw();

      const resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(container);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        resizeObserver.disconnect();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } catch (error) {
      console.error('WebGL initialization error:', error);
    }
  }, [isDesktop, intensityValue, useGlass]);

  const internalRef = externalRef || containerRef;

  if (!isDesktop || !useGlass) {
    // Fallback for mobile or when glass is disabled
    return (
      <div
        ref={internalRef}
        className={`${className} relative rounded-[${borderRadius}px] overflow-hidden`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: `${borderRadius}px`,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${className} relative overflow-hidden`}
      style={{ borderRadius: `${borderRadius}px` }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          pointerEvents: 'none',
          borderRadius: `${borderRadius}px`,
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
