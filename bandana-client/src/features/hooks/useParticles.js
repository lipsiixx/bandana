import { useEffect, useRef } from "react";

const BASE_DENSITY = 0.00025;
const MAX_PARTICLES = 140;
const MOBILE_BREAKPOINT = 768;
const INFLUENCE_RADIUS = 150;
const MAX_LINE_DISTANCE = 100;
const FRAME_BUDGET_MS = 16.67; // "виртуальный" шаг кадра, под который откалиброваны старые константы
const MAX_DELTA_MS = 50; // не даём частицам "скакнуть" после паузы вкладки

const createParticle = (width, height) => ({
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 10 + 2,
  color: "#8b5cf6",
  rotation: Math.random() * Math.PI * 2,
  alpha: 1,
  life: Math.random() * 5000,
  vx: Math.random() * 2 - 1,
  vy: Math.random() * 2 - 1,
});

const getMaxParticles = (width, height) =>
  Math.min(Math.floor(width * height * BASE_DENSITY), MAX_PARTICLES);

export function useParticles(canvasRef) {
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const sizeRef = useRef({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let rafId = null;
    let lastTime = performance.now();
    let isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    let shouldAnimate = false;

    const startAnimation = () => {
      if (rafId !== null) return;
      lastTime = performance.now();
      rafId = requestAnimationFrame(draw);
    };

    const stopAnimation = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // пересчитывает флаг "нужно ли анимировать" (мобильный/узкий экран, prefers-reduced-motion)
    // и синхронизирует с ним количество частиц и состояние rAF-луп
    const applyMotionState = () => {
      shouldAnimate = !isMobile && !reduceMotionQuery.matches;
      const { width, height } = sizeRef.current;

      if (shouldAnimate) {
        const maxParticles = getMaxParticles(width, height);
        particlesRef.current.length = Math.min(particlesRef.current.length, maxParticles);
        while (particlesRef.current.length < maxParticles) {
          particlesRef.current.push(createParticle(width, height));
        }
        startAnimation();
      } else {
        stopAnimation();
        particlesRef.current.length = 0;
        ctx.clearRect(0, 0, width, height);
      }
    };

    const resizeCanvas = () => {
      const { innerWidth, innerHeight } = window;
      sizeRef.current = { width: innerWidth, height: innerHeight };
      const dpr = window.devicePixelRatio || 1;

      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      isMobile = innerWidth < MOBILE_BREAKPOINT;
      applyMotionState();
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleReducedMotionChange = () => applyMotionState();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else if (shouldAnimate) {
        startAnimation();
      }
    };

    function draw(timestamp) {
      const { width, height } = sizeRef.current;
      const dt = Math.min(timestamp - lastTime, MAX_DELTA_MS);
      lastTime = timestamp;
      const step = dt / FRAME_BUDGET_MS;

      const { x: mouseX, y: mouseY } = mouseRef.current;
      const particles = particlesRef.current;
      const maxParticles = getMaxParticles(width, height);

      // обновление позиций/скоростей
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const distSq = dx * dx + dy * dy;

        if (distSq < INFLUENCE_RADIUS * INFLUENCE_RADIUS && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / INFLUENCE_RADIUS) * 0.8 * step;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        p.x += p.vx * step;
        p.y += p.vy * step;
        p.life -= 16 * step;

        const damping = Math.pow(0.98, step);
        p.vx *= damping;
        p.vy *= damping;
      }

      // удаляем умершие/улетевшие частицы и добираем до нужного количества
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const alive =
          p.life > 0 &&
          p.x + p.size > 0 &&
          p.x < width &&
          p.y + p.size > 0 &&
          p.y < height;
        if (!alive) particles.splice(i, 1);
      }
      while (particles.length < maxParticles) {
        particles.push(createParticle(width, height));
      }

      ctx.clearRect(0, 0, width, height);

      // линии между близкими частицами (с ранним отсевом по dx/dy, без полного O(n^2) sqrt)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx > MAX_LINE_DISTANCE || dx < -MAX_LINE_DISTANCE) continue;
          if (dy > MAX_LINE_DISTANCE || dy < -MAX_LINE_DISTANCE) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_LINE_DISTANCE) {
            const alpha = 1 - dist / MAX_LINE_DISTANCE;
            ctx.beginPath();
            ctx.moveTo(a.x + a.size / 2, a.y + a.size / 2);
            ctx.lineTo(b.x + b.size / 2, b.y + b.size / 2);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // сами частицы
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.save();
        ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha * (p.life / 1000);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    }

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (reduceMotionQuery.addEventListener) {
      reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    } else {
      // старые браузеры (Safari < 14)
      reduceMotionQuery.addListener(handleReducedMotionChange);
    }

    return () => {
      stopAnimation();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reduceMotionQuery.removeEventListener) {
        reduceMotionQuery.removeEventListener("change", handleReducedMotionChange);
      } else {
        reduceMotionQuery.removeListener(handleReducedMotionChange);
      }
    };
  }, [canvasRef]);

  return { particles: particlesRef.current };
}
