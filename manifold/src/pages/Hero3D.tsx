import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cssVar } from '../components/Plot';
import { useThemeName } from '../lib/theme';

/** The loss landscape: a bowl with one global and two local minima. */
export function loss(x: number, z: number) {
  return (
    1.7 -
    1.25 * Math.exp(-((x - 0.85) ** 2 + (z + 0.45) ** 2) / 0.7) -
    0.75 * Math.exp(-((x + 1.15) ** 2 + (z - 0.95) ** 2) / 0.32) -
    0.55 * Math.exp(-((x + 0.7) ** 2 + (z + 1.35) ** 2) / 0.22) +
    0.075 * (x * x + z * z) +
    0.06 * Math.sin(2.6 * x) * Math.cos(2.1 * z)
  );
}

const SIZE = 5.2;
const HS = 0.9; // height scale

function grad(x: number, z: number): [number, number] {
  const e = 1e-3;
  return [(loss(x + e, z) - loss(x - e, z)) / (2 * e), (loss(x, z + e) - loss(x, z - e)) / (2 * e)];
}

interface Runner {
  x: number;
  z: number;
  vx: number;
  vz: number;
  trail: THREE.Vector3[];
  line: THREE.Line;
  ball: THREE.Mesh;
  halo: THREE.Mesh;
  done: number; // frames since converged
  age: number;
}

export function Hero3D({ onStatus }: { onStatus?: (s: { loss: number; steps: number }) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const theme = useThemeName();
  const [failed, setFailed] = useState(false);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    const col = (v: string, fb: string) => new THREE.Color(cssVar(v) || fb);
    const dark = theme === 'dark';

    // Surface
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const h = loss(pos.getX(i), pos.getZ(i)) * HS;
      pos.setY(i, h);
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uLow: { value: dark ? new THREE.Color('#0b1636') : new THREE.Color('#3a52d8') },
        uHigh: { value: dark ? new THREE.Color('#9aa6ff') : new THREE.Color('#e3e8fa') },
        uLine: { value: dark ? new THREE.Color('#dfe5ff') : new THREE.Color('#16226a') },
        uMinH: { value: minH },
        uMaxH: { value: maxH },
        uRadius: { value: SIZE / 2 },
        uLineAlpha: { value: dark ? 0.5 : 0.42 },
        uRamp: { value: dark ? 0.9 : 0.5 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLow; uniform vec3 uHigh; uniform vec3 uLine;
        uniform float uMinH; uniform float uMaxH; uniform float uRadius; uniform float uLineAlpha; uniform float uRamp;
        varying vec3 vPos;
        void main() {
          float h = clamp((vPos.y - uMinH) / (uMaxH - uMinH), 0.0, 1.0);
          vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
          if (n.y < 0.0) n = -n;
          float light = clamp(dot(n, normalize(vec3(-0.45, 0.85, 0.35))), 0.0, 1.0);
          vec3 base = mix(uLow, uHigh, smoothstep(0.0, uRamp, h));
          base *= 0.62 + 0.55 * light;
          float t = h * 22.0;
          float fw = max(fwidth(t), 1e-4);
          float d = abs(fract(t - 0.5) - 0.5) / fw;
          float line = (1.0 - min(d, 1.0)) * (1.0 - smoothstep(0.08, 0.28, fw));
          float tm = h * 5.5;
          float fwm = max(fwidth(tm), 1e-4);
          float major = (1.0 - min(abs(fract(tm - 0.5) - 0.5) / (fwm * 1.4), 1.0)) * (1.0 - smoothstep(0.05, 0.18, fwm));
          vec3 col = mix(base, uLine, max(line * uLineAlpha, major * (uLineAlpha + 0.25)));
          float r = length(vPos.xz) / uRadius;
          float a = 1.0 - smoothstep(0.62, 1.0, r);
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
    const surface = new THREE.Mesh(geo, mat);
    scene.add(surface);

    // Runners (gradient descent with momentum)
    const roseC = col('--rose', '#ff6f9c');
    const ballGeo = new THREE.SphereGeometry(0.065, 24, 16);
    const haloGeo = new THREE.SphereGeometry(0.11, 24, 16);
    const runners: Runner[] = [];
    const MAX_TRAIL = 900;

    const spawn = (x: number, z: number) => {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3));
      lineGeo.setDrawRange(0, 0);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: roseC, transparent: true, opacity: 0.95 }));
      const ball = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: roseC }));
      const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: roseC, transparent: true, opacity: 0.18 }));
      scene.add(line, ball, halo);
      const r: Runner = { x, z, vx: 0, vz: 0, trail: [], line, ball, halo, done: 0, age: 0 };
      runners.push(r);
      if (runners.length > 4) {
        const old = runners.shift()!;
        scene.remove(old.line, old.ball, old.halo);
        old.line.geometry.dispose();
      }
      return r;
    };

    const stepRunner = (r: Runner) => {
      if (r.done > 0) {
        r.done++;
        return;
      }
      const [gx, gz] = grad(r.x, r.z);
      r.vx = 0.92 * r.vx - 0.012 * gx;
      r.vz = 0.92 * r.vz - 0.012 * gz;
      r.x += r.vx;
      r.z += r.vz;
      r.age++;
      const y = loss(r.x, r.z) * HS + 0.035;
      const p = new THREE.Vector3(r.x, y, r.z);
      if (r.trail.length < MAX_TRAIL) {
        r.trail.push(p);
        const arr = (r.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const k = r.trail.length - 1;
        arr[k * 3] = p.x;
        arr[k * 3 + 1] = p.y;
        arr[k * 3 + 2] = p.z;
        r.line.geometry.attributes.position.needsUpdate = true;
        r.line.geometry.setDrawRange(0, r.trail.length);
      }
      r.ball.position.copy(p).add(new THREE.Vector3(0, 0.03, 0));
      r.halo.position.copy(r.ball.position);
      if ((Math.hypot(r.vx, r.vz) < 2e-4 && r.age > 40) || r.age > 1400) r.done = 1;
    };

    const rnd = () => (Math.random() - 0.5) * SIZE * 0.78;
    const starts: [number, number][] = [
      [-1.9, -1.7],
      [1.9, 1.6],
      [-0.3, 1.9],
    ];
    starts.forEach(([x, z]) => spawn(x, z));
    if (reduce) {
      for (let k = 0; k < 900; k++) runners.forEach(stepRunner);
    }

    // Camera rig
    let az = -0.72;
    let el0 = 0.86;
    let dist = 7.6;
    let targetAz = az;
    const place = () => {
      camera.position.set(dist * Math.cos(el0) * Math.sin(az), dist * Math.sin(el0) + 0.2, dist * Math.cos(el0) * Math.cos(az));
      camera.lookAt(0.25, 0.35, 0);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const wide = w / h > 1.15;
      dist = wide ? 8.4 : 11;
      // shift the landscape to the right of the headline on wide screens
      if (wide) camera.setViewOffset(w, h, -w * 0.17, -h * 0.04, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      place();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Interaction: drag to orbit, click to drop a new starting point
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number; az: number; el: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, az: targetAz, el: el0 };
    };
    const onMove = (e: PointerEvent) => {
      if (!down || !(e.buttons & 1)) return;
      targetAz = down.az - (e.clientX - down.x) * 0.006;
      el0 = Math.min(1.25, Math.max(0.25, down.el + (e.clientY - down.y) * 0.004));
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(surface)[0];
      if (hit && Math.abs(hit.point.x) < SIZE * 0.45 && Math.abs(hit.point.z) < SIZE * 0.45) spawn(hit.point.x, hit.point.z);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
    });
    io.observe(el);

    let t = 0;
    let lastReport = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      t++;
      if (!reduce) {
        for (let k = 0; k < 2; k++) runners.forEach(stepRunner);
        // respawn the oldest settled runner occasionally
        const settled = runners.filter((r) => r.done > 160);
        if (settled.length === runners.length && runners.length) spawn(rnd(), rnd());
        targetAz += 0.0006;
        const pulse = 1 + 0.18 * Math.sin(t * 0.08);
        runners.forEach((r) => r.halo.scale.setScalar(pulse));
      }
      az += (targetAz - az) * 0.08;
      place();
      renderer.render(scene, camera);
      if (statusRef.current && t - lastReport > 12) {
        lastReport = t;
        const r = runners[runners.length - 1];
        if (r) statusRef.current({ loss: loss(r.x, r.z), steps: r.age });
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      geo.dispose();
      mat.dispose();
      ballGeo.dispose();
      haloGeo.dispose();
      runners.forEach((r) => r.line.geometry.dispose());
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [theme]);

  if (failed) return <div className="hero__fallback" aria-hidden="true" />;
  return <div ref={mount} className="hero__canvas" aria-label="Interactive loss landscape: drag to rotate, click to drop a starting point for gradient descent" role="img" />;
}
