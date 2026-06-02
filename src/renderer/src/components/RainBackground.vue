<template>
  <div class="rain-root">
    <canvas ref="canvasRef" class="rain-canvas" :style="{ opacity: enabled ? 1 : 0 }" />
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*,video/*"
      class="hidden"
      @change="handleFileUpload"
    />
    <video ref="videoRef" muted loop playsinline class="hidden" @canplay="handleVideoReady" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

const props = withDefaults(
  defineProps<{
    enabled?: boolean;
    rainIntensity?: number;
    fogDensity?: number;
    refractionIndex?: number;
    dropSize?: number;
    speed?: number;
    flipX?: boolean;
    flipY?: boolean;
    backgroundType?: "gradient" | "image" | "video";
    backgroundSrc?: string;
  }>(),
  {
    enabled: true,
    rainIntensity: 0.6,
    fogDensity: 1.5,
    refractionIndex: 0.5,
    dropSize: 1.0,
    speed: 0.8,
    flipX: false,
    flipY: false,
    backgroundType: "gradient",
    backgroundSrc: "",
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram | null = null;
let vao: WebGLVertexArrayObject | null = null;
let animFrameId = 0;
let startTime = 0;

let bgTexture: WebGLTexture | null = null;
let hasTexture = false;
let texWidth = 1;
let texHeight = 1;
let videoFrameTimer: ReturnType<typeof setInterval> | null = null;
const bgCanvas = document.createElement("canvas");
const bgCtx = bgCanvas.getContext("2d")!;

const VS = `#version 300 es
in vec2 position;
out vec2 v_uv;
void main() {
  v_uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// ── Fragment shader (Heartfelt-inspired, David Hoskins algorithm) ──
const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_tex_resolution;
uniform float u_time;
uniform sampler2D u_texture;
uniform float u_has_texture;

uniform float u_rain_intensity;
uniform float u_fog;
uniform float u_refraction;
uniform float u_drop_size;
uniform float u_speed;
uniform float u_flip_x;
uniform float u_flip_y;

#define S(a,b,t) smoothstep(a,b,t)

// Dave Hoskins hash
vec3 N13(float p) {
  vec3 p3 = fract(vec3(p) * vec3(.1031, .11369, .13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}
float N(float t) { return fract(sin(t*12345.564)*7658.76); }
float Saw(float b, float t) { return S(0.,b,t)*S(1.,b,t); }

// Single drop layer with trail
vec2 DropLayer2(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t * 0.75;
  vec2 a = vec2(6.,1.);
  vec2 grid = a * 2.0;
  vec2 id = floor(uv * grid);
  float colShift = N(id.x);
  uv.y += colShift;
  id = floor(uv * grid);
  vec3 n = N13(id.x*35.2 + id.y*2376.1);
  vec2 st = fract(uv * grid) - vec2(.5,0.);
  float x = n.x - .5;
  float y = UV.y * 20.;
  float wiggle = sin(y + sin(y));
  x += wiggle * (.5 - abs(x)) * (n.z - .5);
  x *= .7;
  float ti = fract(t + n.z);
  y = (Saw(.85,ti)-.5)*.9+.5;
  vec2 p = vec2(x, y);
  float d = length((st - p) * a.yx);
  float mainDrop = S(.4,.0,d);
  float r = sqrt(S(1.,y,st.y));
  float cd = abs(st.x - x);
  float trail = S(.23*r,.15*r*r,cd);
  float trailFront = S(-.02,.02,st.y - y);
  trail *= trailFront * r * r;
  y = UV.y;
  float trail2 = S(.2*r,.0,cd);
  float droplets = max(0.,(sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
  y = fract(y*10.)+(st.y-.5);
  float dd = length(st - vec2(x,y));
  droplets = S(.3,0.,dd);
  float m = mainDrop + droplets*r*trailFront;
  return vec2(m, trail);
}

// Static condensation droplets
float StaticDrops(vec2 uv, float t) {
  uv *= 40.;
  vec2 id = floor(uv);
  uv = fract(uv) - .5;
  vec3 n = N13(id.x*107.45 + id.y*3543.654);
  vec2 p = (n.xy-.5)*.7;
  float d = length(uv - p);
  float fade = Saw(.025, fract(t + n.z));
  float c = S(.3,.0,d)*fract(n.z*10.)*fade;
  return c;
}

// Composite all drop layers
vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
  float s = StaticDrops(uv,t)*l0;
  vec2 m1 = DropLayer2(uv,t)*l1;
  vec2 m2 = DropLayer2(uv*1.85,t)*l2;
  float c = s + m1.x + m2.x;
  c = S(.3,1.,c);
  return vec2(c, max(m1.y*l0, m2.y*l1));
}

// Procedural fluid gradient background — metallic blue
vec3 proceduralFluid(vec2 uv, float t) {
  vec2 p = uv - 0.5;
  float angle = t * 0.05;
  vec2 rot = vec2(cos(angle), sin(angle));
  float d = dot(p, rot);
  d += 0.15*sin(uv.x*5.0+t*0.3) + 0.15*cos(uv.y*7.0-t*0.2);
  d += 0.05*sin(uv.x*12.0-t*0.7);
  vec3 c1 = vec3(0.12,0.14,0.18);
  vec3 c2 = vec3(0.42,0.52,0.60);
  vec3 amb = vec3(0.08,0.12,0.22);
  return mix(c1,c2,S(-0.5,0.5,d)) + amb*(0.35+0.2*sin(t*0.15));
}

// Sample background with cover-fit (uniform scale + center-crop) and blur
vec3 sampleBg(vec2 uv, float blur) {
  vec3 fluid = proceduralFluid(uv, u_time);
  if (u_has_texture < 0.5) {
    vec3 mist = vec3(0.05,0.06,0.1);
    return mix(fluid, mist, blur*0.22);
  }
  // Cover: uniformly scale image so it fills the screen, crop overflow
  vec2 tex = u_tex_resolution;
  vec2 scr = u_resolution;
  float scale = max(scr.x/tex.x, scr.y/tex.y);
  vec2 cuv = (uv - 0.5) * scale + 0.5;
  cuv = clamp(cuv, 0.001, 0.999);
  if (blur < 0.05) return texture(u_texture,cuv).rgb;
  vec3 col = vec3(0.); float total = 0.; float stp = blur*0.0035;
  for(float x=-1.5;x<=1.5;x+=1.)
    for(float y=-1.5;y<=1.5;y+=1.)
      { col += texture(u_texture,cuv+vec2(x,y)*stp).rgb; total += 1.; }
  return col/total;
}

void main() {
  vec2 aspect = vec2(u_resolution.x/u_resolution.y, 1.);
  vec2 uv = (v_uv-.5)*aspect*(1.5/u_drop_size);
  vec2 UV = v_uv;
  // Flip UV for image mirroring
  UV.x = mix(UV.x, 1.0 - UV.x, u_flip_x);
  UV.y = mix(UV.y, 1.0 - UV.y, u_flip_y);
  float t = u_time * u_speed;
  float rainAmount = u_rain_intensity;
  float staticDrops = S(-.5,1.,rainAmount)*2.;
  float layer1 = S(.25,.75,rainAmount);
  float layer2 = S(.0,.5,rainAmount);
  vec2 c = Drops(uv,t,staticDrops,layer1,layer2);
  vec2 e = vec2(.001,0.);
  float cx = Drops(uv+e,t,staticDrops,layer1,layer2).x;
  float cy = Drops(uv+e.yx,t,staticDrops,layer1,layer2).x;
  vec2 n = vec2(cx-c.x,cy-c.x);
  float distortion = u_refraction * 0.12;
  vec2 distortedUV = UV + n*distortion;
  float focus = mix(u_fog, 0.0, c.x);
  vec3 col = sampleBg(distortedUV, focus);
  col += vec3(c.x*0.06);
  fragColor = vec4(col, 1.0);
}`;

function compileShader(src: string, type: number): WebGLShader {
  const shader = gl!.createShader(type)!;
  gl!.shaderSource(shader, src);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl!.getShaderInfoLog(shader));
    gl!.deleteShader(shader);
    throw new Error("Shader compile failed");
  }
  return shader;
}

function initWebGL(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  gl = canvas.getContext("webgl2", { alpha: true, antialias: false });
  if (!gl) {
    console.warn("WebGL2 not supported");
    return;
  }

  const vs = compileShader(VS, gl.VERTEX_SHADER);
  const fs = compileShader(FS, gl.FRAGMENT_SHADER);
  program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Init texture
  bgTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, bgTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255]),
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.useProgram(program);
  gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
  generateGradientTexture();
  resizeCanvas();
}

function resizeCanvas(): void {
  const canvas = canvasRef.value;
  if (!canvas || !gl) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function generateGradientTexture(): void {
  const style = getComputedStyle(document.documentElement);
  const from = style.getPropertyValue("--bg-gradient-from").trim() || "#16324f";
  const to = style.getPropertyValue("--bg-gradient-to").trim() || "#08111c";
  bgCanvas.width = 256;
  bgCanvas.height = 256;
  const grad = bgCtx.createRadialGradient(128, 0, 0, 128, 128, 256);
  grad.addColorStop(0, from);
  grad.addColorStop(0.62, to);
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 256, 256);
  uploadBgTexture();
}

function uploadBgTexture(): void {
  if (!gl || !bgTexture) return;
  gl.bindTexture(gl.TEXTURE_2D, bgTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
  texWidth = bgCanvas.width;
  texHeight = bgCanvas.height;
}

function loadImageToTexture(src: string): void {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    bgCanvas.width = img.width;
    bgCanvas.height = img.height;
    bgCtx.drawImage(img, 0, 0);
    hasTexture = true;
    if (gl && bgTexture) {
      gl.bindTexture(gl.TEXTURE_2D, bgTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texWidth = img.width;
      texHeight = img.height;
    }
  };
  img.onerror = () => {
    hasTexture = false;
    generateGradientTexture();
  };
  img.src = src;
}

function loadVideoToTexture(src: string): void {
  const video = videoRef.value;
  if (!video) return;
  video.src = src;
  video.load();
}

function handleVideoReady(): void {
  const video = videoRef.value;
  if (!video) return;
  if (videoFrameTimer) clearInterval(videoFrameTimer);
  hasTexture = true;
  videoFrameTimer = setInterval(() => {
    if (!gl || !bgTexture || video.paused || video.ended) return;
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    texWidth = video.videoWidth;
    texHeight = video.videoHeight;
  }, 1000 / 30);
  video.play();
}

function handleFileUpload(e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) loadVideoToTexture(url);
  else loadImageToTexture(url);
  input.value = "";
}

function render(timestamp: number): void {
  animFrameId = requestAnimationFrame(render);
  if (!gl || !program || !vao) return;
  // Skip drawing when disabled — shows original gradient underneath via CSS
  if (!props.enabled) return;

  if (!startTime) startTime = timestamp;
  const elapsed = (timestamp - startTime) / 1000;

  gl.useProgram(program);
  gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), gl.canvas.width, gl.canvas.height);
  gl.uniform2f(gl.getUniformLocation(program, "u_tex_resolution"), texWidth, texHeight);
  gl.uniform1f(gl.getUniformLocation(program, "u_time"), elapsed);
  gl.uniform1f(gl.getUniformLocation(program, "u_has_texture"), hasTexture ? 1.0 : 0.0);
  gl.uniform1f(gl.getUniformLocation(program, "u_rain_intensity"), props.rainIntensity);
  gl.uniform1f(gl.getUniformLocation(program, "u_fog"), props.fogDensity);
  gl.uniform1f(gl.getUniformLocation(program, "u_refraction"), props.refractionIndex);
  gl.uniform1f(gl.getUniformLocation(program, "u_drop_size"), props.dropSize);
  gl.uniform1f(gl.getUniformLocation(program, "u_speed"), props.speed);
  gl.uniform1f(gl.getUniformLocation(program, "u_flip_x"), props.flipX ? 1.0 : 0.0);
  gl.uniform1f(gl.getUniformLocation(program, "u_flip_y"), props.flipY ? 1.0 : 0.0);

  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}

defineExpose({
  triggerFileUpload: () => fileInputRef.value?.click(),
  resetBackground: () => {
    if (videoFrameTimer) {
      clearInterval(videoFrameTimer);
      videoFrameTimer = null;
    }
    const video = videoRef.value;
    if (video) {
      video.pause();
      video.src = "";
      video.load();
    }
    hasTexture = false;
    generateGradientTexture();
  },
});

onMounted(() => {
  initWebGL();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  animFrameId = requestAnimationFrame(render);
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeCanvas);
  cancelAnimationFrame(animFrameId);
  if (videoFrameTimer) clearInterval(videoFrameTimer);
  if (gl && program) gl.deleteProgram(program);
  const video = videoRef.value;
  if (video) {
    video.pause();
    video.src = "";
  }
});

watch(
  () => props.backgroundSrc,
  (src) => {
    if (!src) return;
    if (props.backgroundType === "image") loadImageToTexture(src);
    else if (props.backgroundType === "video") loadVideoToTexture(src);
  },
);
</script>

<style scoped>
.rain-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  z-index: 0;
  pointer-events: none;
}
.rain-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.6s ease;
}
.hidden {
  display: none;
}
</style>
