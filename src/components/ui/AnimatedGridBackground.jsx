import React, { useEffect, useRef } from 'react';

/**
 * ANIMATED GRID BACKGROUND
 * 
 * Fondo elegante y premium con:
 * - Líneas horizontales sutiles
 * - Partículas diagonales con glow
 * - Animación suave y continua
 * 
 * USO:
 * <AnimatedGridBackground mode="light">...</AnimatedGridBackground>
 */

const AnimatedGridBackground = ({
    children,
    particleCount = 30,
    mode = 'light' // 'light' or 'dark'
}) => {
    const canvasRef = useRef(null);

    // Configuración de colores según modo
    const isDark = mode === 'dark';
    const bgColor = isDark ? '#0a0a0a' : '#cbd5e1'; // Slate-300 for light (más oscuro)
    const lineColor = isDark ? 'rgba(255,255,255,0.0)' : 'rgba(0,0,0,0.0)';
    const particleColor = isDark ? '#5eead4' : '#0d9488'; // Teal-400 (dark) vs Teal-600 (light)

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        // Configurar tamaño del canvas
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        // Clase Partícula
        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                // Movimiento flotante suave en todas direcciones
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.blinkSpeed = 0.02 * (Math.random() + 0.5); // Velocidad de parpadeo
                this.blinkPhase = Math.random() * Math.PI * 2;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Parpadeo suave (Twinkle)
                this.blinkPhase += this.blinkSpeed;
                this.opacity = 0.1 + Math.abs(Math.sin(this.blinkPhase)) * (isDark ? 0.6 : 0.4);

                // Rebotar en los bordes
                if (this.x > canvas.width || this.x < 0) {
                    this.speedX *= -1;
                }
                if (this.y > canvas.height || this.y < 0) {
                    this.speedY *= -1;
                }
            }

            draw() {
                ctx.save();

                // Glow effect (más sutil en light mode)
                ctx.shadowBlur = isDark ? 15 : 5;
                ctx.shadowColor = particleColor;

                // Partícula
                ctx.fillStyle = particleColor;
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        // Inicializar partículas
        const initParticles = () => {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        };

        // Dibujar líneas horizontales
        const drawGrid = () => {
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([80, 30]); // Líneas discontinuas: 80px línea, 30px espacio

            // Líneas horizontales cada 50px
            for (let y = 0; y < canvas.height; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            ctx.setLineDash([]); // Resetear para las partículas
        };

        // Animar
        const animate = () => {
            // Limpiar canvas
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Dibujar grid
            drawGrid();

            // Actualizar y dibujar partículas
            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        // Inicializar
        resizeCanvas();
        initParticles();
        animate();

        // Event listeners
        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });

        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [particleCount, mode, bgColor, lineColor, particleColor]);

    return (
        <div className="relative w-full h-full bg-slate-300">
            {/* Canvas de fondo */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ background: bgColor }}
            />

            {/* Contenido */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default AnimatedGridBackground;
