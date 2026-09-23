// confetti.js - High-performance celebratory confetti engine

export class ConfettiCelebration {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'celebrationCanvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '99999';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animId = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.colors = [
            '#10b981', // Emerald
            '#06b6d4', // Cyan
            '#f59e0b', // Amber
            '#8b5cf6', // Violet
            '#ec4899', // Pink
            '#3b82f6', // Sapphire
            '#fbbf24', // Gold
            '#ffffff', // Sparkle white
        ];
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
    }

    burst(originX = null, originY = null, count = 80) {
        const cx = originX !== null ? originX : this.width / 2;
        const cy = originY !== null ? originY : this.height / 2;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 12;
            const color = this.colors[Math.floor(Math.random() * this.colors.length)];
            const size = 6 + Math.random() * 8;
            const isRibbon = Math.random() > 0.35;

            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (Math.random() * 5 + 3),
                rot: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 15,
                color: color,
                size: size,
                isRibbon: isRibbon,
                alpha: 1,
                decay: 0.008 + Math.random() * 0.012,
                gravity: 0.35
            });
        }

        if (!this.animId) {
            this.animate();
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.985;
            p.rot += p.rotSpeed;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.y > this.height + 40) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rot * Math.PI) / 180);
            this.ctx.fillStyle = p.color;

            if (p.isRibbon) {
                this.ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        if (this.particles.length > 0) {
            this.animId = requestAnimationFrame(() => this.animate());
        } else {
            this.animId = null;
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }
}
