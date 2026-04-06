import { useEffect, useRef } from 'react';
import './VideoBackground.css';

export default function VideoBackground() {
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
    const particleCount = prefersReducedMotion ? 36 : 90;
    const starCount = prefersReducedMotion ? 60 : 120;
    const targetFrameDuration = prefersReducedMotion ? 1000 / 24 : 1000 / 45;

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
        this.reset();
      }

      reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.vx = (Math.random() - 0.5) * 0.28;
        this.vy = (Math.random() - 0.5) * 0.28;
        this.radius = Math.random() * 2 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.color = Math.random() > 0.5 ? '0, 173, 181' : '52, 211, 153';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
        if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    class Star {
      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.size = Math.random() * 2;
        this.opacity = Math.random();
        this.fadeSpeed = (Math.random() - 0.5) * 0.012;
      }

      update() {
        this.opacity += this.fadeSpeed;
        if (this.opacity <= 0 || this.opacity >= 1) this.fadeSpeed *= -1;
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

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const gradient = ctx.createLinearGradient(
              particles[i].x, particles[i].y,
              particles[j].x, particles[j].y
            );
            gradient.addColorStop(0, `rgba(0, 173, 181, ${0.2 * (1 - distance / 150)})`);
            gradient.addColorStop(1, `rgba(52, 211, 153, ${0.2 * (1 - distance / 150)})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
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

  return (
    <div className="video-background">
      <div className="video-overlay"></div>
      <div className="gradient-overlay"></div>
      <div className="wave-layer">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>
      <canvas ref={canvasRef} className="particle-canvas" />
    </div>
  );
}
