import { useEffect, useRef } from 'react';
import './NetworkBackground.css';

export default function NetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let lastFrameTime = 0;
    let isVisible = document.visibilityState !== 'hidden';
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particles = [];
    const stars = [];
    const particleCount = prefersReducedMotion ? 40 : 64;
    const starCount = prefersReducedMotion ? 28 : 42;
    const connectionDistance = 172;
    const targetFrameDuration = prefersReducedMotion ? 1000 / 24 : 1000 / 45;

    function randomPoint() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const safeRadius = Math.min(width, height) * 0.22;

      while (true) {
        const edgeBias = Math.random();
        let x = Math.random() * width;
        let y = Math.random() * height;

        if (edgeBias > 0.45) {
          const edge = Math.floor(Math.random() * 4);
          if (edge === 0) {
            x = Math.random() * width;
            y = Math.random() * height * 0.22;
          } else if (edge === 1) {
            x = width * (0.78 + Math.random() * 0.22);
            y = Math.random() * height;
          } else if (edge === 2) {
            x = Math.random() * width;
            y = height * (0.78 + Math.random() * 0.22);
          } else {
            x = Math.random() * width * 0.22;
            y = Math.random() * height;
          }
        }

        const dx = x - centerX;
        const dy = y - centerY;
        if (Math.sqrt(dx * dx + dy * dy) > safeRadius || Math.random() > 0.78) {
          return { x, y };
        }
      }
    }

    function resizeCanvas() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();

    class Particle {
      constructor() {
        const point = randomPoint();
        this.x = point.x;
        this.y = point.y;
        this.vx = (Math.random() - 0.5) * 0.16;
        this.vy = (Math.random() - 0.5) * 0.16;
        this.radius = Math.random() * 1.9 + 1.1;
        this.glow = Math.random() * 0.35 + 0.35;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -20 || this.x > window.innerWidth + 20) this.vx *= -1;
        if (this.y < -20 || this.y > window.innerHeight + 20) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(62, 223, 207, ${this.glow})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(48, 201, 191, 0.45)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    class Star {
      constructor() {
        const point = randomPoint();
        this.x = point.x;
        this.y = point.y;
        this.size = Math.random() * 1.8 + 0.4;
        this.opacity = Math.random() * 0.55 + 0.15;
        this.twinkle = (Math.random() - 0.5) * 0.01;
      }

      update() {
        this.opacity += this.twinkle;
        if (this.opacity <= 0.1 || this.opacity >= 0.8) this.twinkle *= -1;
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    for (let i = 0; i < starCount; i++) {
      stars.push(new Star());
    }

    function drawFrame() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const backdrop = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);
      backdrop.addColorStop(0, '#161d3a');
      backdrop.addColorStop(0.5, '#231c43');
      backdrop.addColorStop(1, '#21173b');
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const topGlow = ctx.createRadialGradient(
        window.innerWidth * 0.1,
        window.innerHeight * 0.08,
        0,
        window.innerWidth * 0.1,
        window.innerHeight * 0.08,
        window.innerWidth * 0.55
      );
      topGlow.addColorStop(0, 'rgba(84, 118, 198, 0.16)');
      topGlow.addColorStop(1, 'rgba(84, 118, 198, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const bottomGlow = ctx.createRadialGradient(
        window.innerWidth * 0.5,
        window.innerHeight * 1.02,
        0,
        window.innerWidth * 0.5,
        window.innerHeight * 1.02,
        window.innerWidth * 0.75
      );
      bottomGlow.addColorStop(0, 'rgba(148, 118, 204, 0.18)');
      bottomGlow.addColorStop(1, 'rgba(148, 118, 204, 0)');
      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(40, 185, 182, ${(1 - distance / connectionDistance) * 0.18})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

    }

    function animate(timestamp) {
      if (!isVisible) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      if (timestamp - lastFrameTime >= targetFrameDuration) {
        lastFrameTime = timestamp;
        drawFrame();
      }
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      resizeCanvas();
      particles.forEach((particle) => {
        if (particle.x > window.innerWidth || particle.y > window.innerHeight) {
          const point = randomPoint();
          particle.x = point.x;
          particle.y = point.y;
        }
      });
      stars.forEach((star) => {
        if (star.x > window.innerWidth || star.y > window.innerHeight) {
          const point = randomPoint();
          star.x = point.x;
          star.y = point.y;
        }
      });
    };

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState !== 'hidden';
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-canvas" />;
}
