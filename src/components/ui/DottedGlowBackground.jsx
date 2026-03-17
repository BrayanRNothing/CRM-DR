import React, { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";

export const DottedGlowBackground = ({
    children,
    className,
    opacity = 1,
    gap = 10,
    radius = 1.6,
    colorLightVar = "--color-neutral-500",
    glowColorLightVar = "--color-neutral-600",
    colorDarkVar = "--color-neutral-500",
    glowColorDarkVar = "--color-sky-800",
    backgroundOpacity = 0,
    speedMin = 0.3,
    speedMax = 1.6,
    speedScale = 1,
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        let animationFrameId;

        // Set canvas size with device pixel ratio for crisp rendering
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.scale(dpr, dpr);

            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Dots array with random speeds and diagonal pattern
        const dots = [];
        let rowIndex = 0;
        // Use different vertical spacing for proper diagonal pattern
        const verticalGap = gap * 0.866; // sqrt(3)/2 for equilateral spacing
        const displayWidth = canvas.width / (window.devicePixelRatio || 1);
        const displayHeight = canvas.height / (window.devicePixelRatio || 1);

        for (let y = 0; y < displayHeight + verticalGap; y += verticalGap) {
            for (let x = 0; x < displayWidth + gap; x += gap) {
                // Offset every other row to create diagonal "/" pattern
                const offsetX = (rowIndex % 2) * (gap / 2);
                dots.push({
                    x: x + offsetX,
                    y,
                    speed: speedMin + Math.random() * (speedMax - speedMin),
                    phase: Math.random() * Math.PI * 2,
                    brightness: Math.random(), // Random brightness factor
                });
            }
            rowIndex++;
        }

        // Animation
        let time = 0;
        const animate = () => {
            const displayWidth = canvas.width / (window.devicePixelRatio || 1);
            const displayHeight = canvas.height / (window.devicePixelRatio || 1);

            ctx.clearRect(0, 0, displayWidth, displayHeight);

            // Background
            if (backgroundOpacity > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${backgroundOpacity})`;
                ctx.fillRect(0, 0, displayWidth, displayHeight);
            }

            // Draw dots with pulsation only (no mouse glow)
            dots.forEach((dot) => {
                // Calculate distance from center for edge dimming
                const centerX = displayWidth / 2;
                const centerY = displayHeight / 2;
                const distanceFromCenter = Math.sqrt(
                    Math.pow(dot.x - centerX, 2) + Math.pow(dot.y - centerY, 2)
                );
                const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
                const edgeFactor = 1 - Math.pow(distanceFromCenter / maxDistance, 2);

                // Pulsating effect with proper frequency scaling
                const pulse = Math.sin(time * dot.speed + dot.phase) * 0.5 + 0.5;

                // Only show dots that pass brightness threshold (reduces simultaneous bright dots)
                if (pulse < dot.brightness * 0.8) return;

                // Dot color with more variation for visible twinkling
                // Use easing for smoother transitions
                const easedPulse = pulse * pulse * (3 - 2 * pulse); // smoothstep
                const baseOpacity = (0.1 + easedPulse * 0.3) * (0.3 + edgeFactor * 0.7);

                // Better quality rendering with slight glow for definition
                ctx.shadowBlur = 3;
                ctx.shadowColor = `rgba(180, 190, 200, ${baseOpacity * opacity * 0.6})`;
                ctx.fillStyle = `rgba(220, 230, 240, ${baseOpacity * opacity})`;

                // Draw base dot
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Reset shadow
                ctx.shadowBlur = 0;
            });

            time += 0.03 * speedScale;
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [opacity, gap, radius, backgroundOpacity, speedMin, speedMax, speedScale]);

    return (
        <div className={cn("absolute inset-0 overflow-hidden", className)}>
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ background: "transparent" }}
            />
            {children}
        </div>
    );
};

export default DottedGlowBackground;
