// protractor.js - Interactive DIY Clinometer & Plumb-Line Physics Simulation
// Demonstrates how a drinking straw + 180° protractor + hanging plumb bob
// converts gravity deflection into accurate angle of elevation: theta = |90° - alpha|

import { sound } from './sound.js';

export class ProtractorSimulator {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.options = options;

        // Current tilt angle of sightline in degrees (0° = horizontal, positive = elevation, negative = depression)
        this.elevationAngle = 35.0; // theta
        this.targetElevationAngle = 35.0;

        // Plumb bob pendulum physics
        this.stringAngle = 0; // relative to true vertical (0 = plumb)
        this.stringAngularVel = 0;

        // Dragging / rotating state
        this.isDragging = false;
        this.lastPointerAngle = 0;

        // Visual toggles
        this.showProof = true;
        this.showSightRay = true;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindEvents();
        this.startPhysicsLoop();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(300, rect.width);
        const height = Math.max(320, Math.min(480, window.innerHeight * 0.52));

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.width = width;
        this.height = height;

        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
        this.render();
    }

    setElevation(angle) {
        this.targetElevationAngle = Math.max(-15, Math.min(85, angle));
        this.elevationAngle = this.targetElevationAngle;
        this.render();
    }

    toggleProof() {
        this.showProof = !this.showProof;
        this.render();
        return this.showProof;
    }

    startPhysicsLoop() {
        let lastTime = performance.now();

        const step = (now) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;

            // Physics simulation of plumb string pendulum
            // String naturally wants to point straight down (angle 0 in world coords)
            const k = 45.0; // restoring spring-like gravity constant
            const damping = 0.88;

            const accel = -k * this.stringAngle;
            this.stringAngularVel += accel * dt;
            this.stringAngularVel *= damping;
            this.stringAngle += this.stringAngularVel * dt;

            // Smoothly approach target tilt if changed
            const diff = this.targetElevationAngle - this.elevationAngle;
            if (Math.abs(diff) > 0.05) {
                this.elevationAngle += diff * 0.25;
                // Add minor pendulum disturbance from tilting motion
                this.stringAngularVel += diff * 0.05;
            }

            this.render();
            requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
    }

    render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const { width, height } = this;
        ctx.clearRect(0, 0, width, height);

        // Background atmosphere
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0a1020');
        bgGrad.addColorStop(1, '#0e172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Protractor pivot position (center of rotation)
        const pivotX = width * 0.42;
        const pivotY = height * 0.46;
        const radius = Math.min(width * 0.34, height * 0.38, 160);

        // Calculate protractor raw reading alpha:
        // In standard upside-down DIY clinometer (straw on straight edge, rounded arc hanging down):
        // At 0° elevation, plumb line passes through 90°.
        // At theta elevation, string is tilted by theta relative to the 90° normal!
        const rawAlpha = 90 - this.elevationAngle;
        const elevationTheta = Math.abs(90 - rawAlpha);

        // 1. Draw Horizontal True Horizon Reference Line
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, pivotY);
        ctx.lineTo(width - 20, pivotY);
        ctx.stroke();

        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('0° Horizon Level', 25, pivotY - 8);
        ctx.restore();

        // 2. Draw Protractor & Drinking Straw tilted at elevationAngle
        ctx.save();
        ctx.translate(pivotX, pivotY);
        // Rotate protractor by -elevationAngle (tilting sightline up to the right)
        const tiltRad = -(this.elevationAngle * Math.PI) / 180;
        ctx.rotate(tiltRad);

        this.drawProtractorBody(radius);
        this.drawDrinkingStraw(radius);

        ctx.restore();

        // 3. Draw Hanging Plumb Bob (Gravity Plumb Line)
        // Note: Plumb line hangs straight down from pivot in world space!
        this.drawPlumbLine(pivotX, pivotY, radius * 1.25);

        // 4. Draw Angle of Elevation Sight Ray & Indicator
        if (this.showSightRay) {
            this.drawSightlineAnnotation(pivotX, pivotY, radius, tiltRad);
        }

        // 5. Draw Mathematical Readout Cards
        this.drawReadoutCard(rawAlpha, elevationTheta);

        // 6. Geometric proof overlay (if enabled)
        if (this.showProof) {
            this.drawProofDiagram(pivotX, pivotY, radius, rawAlpha, elevationTheta);
        }
    }

    drawProtractorBody(radius) {
        const ctx = this.ctx;

        // Protractor acrylic body gradient (hanging arc downward)
        // Straight edge is along horizontal line from -radius to +radius at y=0.
        // Arc goes from angle 0 to PI (clockwise downward)
        const acrylicGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
        acrylicGrad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
        acrylicGrad.addColorStop(0.85, 'rgba(15, 23, 42, 0.9)');
        acrylicGrad.addColorStop(1, 'rgba(56, 189, 248, 0.25)');

        ctx.fillStyle = acrylicGrad;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner decorative groove
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.72, 0, Math.PI, false);
        ctx.stroke();

        // Center origin pin & crosshair
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 10);
        ctx.stroke();

        // Degree Tick Marks (0° to 180° around the bottom rim)
        // 0° is at angle 0 (right tip, +X), 90° is at angle PI/2 (straight down, +Y), 180° is at angle PI (left tip, -X)
        for (let deg = 0; deg <= 180; deg++) {
            const rad = (deg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            let tickLen = 5;
            let isMajor = false;
            let isMid = false;

            if (deg % 10 === 0) {
                tickLen = 14;
                isMajor = true;
            } else if (deg % 5 === 0) {
                tickLen = 9;
                isMid = true;
            }

            const x1 = cos * (radius - tickLen);
            const y1 = sin * (radius - tickLen);
            const x2 = cos * radius;
            const y2 = sin * radius;

            ctx.strokeStyle = isMajor ? '#38bdf8' : (isMid ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.35)');
            ctx.lineWidth = isMajor ? 1.8 : 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Numbers for every 10 degrees
            if (isMajor && deg % 10 === 0) {
                const textR = radius - 24;
                const tx = cos * textR;
                const ty = sin * textR;

                ctx.save();
                ctx.translate(tx, ty);
                ctx.rotate(rad - Math.PI / 2);
                ctx.font = deg === 90 ? 'bold 11px Inter, sans-serif' : '9px Inter, sans-serif';
                ctx.fillStyle = deg === 90 ? '#fbbf24' : '#94a3b8';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${deg}°`, 0, 0);
                ctx.restore();
            }
        }
    }

    drawDrinkingStraw(radius) {
        const ctx = this.ctx;
        const strawW = radius * 2 + 50;
        const strawH = 12;
        const strawX = -radius - 25;
        const strawY = -strawH;

        // Straw gradient (fluorescent lime/green tube)
        const strawGrad = ctx.createLinearGradient(0, strawY, 0, strawY + strawH);
        strawGrad.addColorStop(0, '#a3e635');
        strawGrad.addColorStop(0.5, '#facc15');
        strawGrad.addColorStop(1, '#84cc16');

        ctx.fillStyle = strawGrad;
        ctx.strokeStyle = '#4d7c0f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(strawX, strawY, strawW, strawH, 3);
        ctx.fill();
        ctx.stroke();

        // Straw tape bindings
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(-radius * 0.6, strawY - 2, 14, strawH + 4);
        ctx.fillRect(radius * 0.6 - 14, strawY - 2, 14, strawH + 4);

        // Eyepiece / Objective labels
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText('STRAW SIGHTING TUBE', 0, strawY + strawH * 0.7);

        // Observer Eye icon on the left (peering through straw)
        ctx.fillStyle = '#38bdf8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText('👁️ SIGHT HERE', strawX - 16, strawY + 8);
    }

    drawPlumbLine(pivotX, pivotY, stringLength) {
        const ctx = this.ctx;
        // String hangs straight down (PI/2) with physics disturbance
        const plumbAngle = Math.PI / 2 + this.stringAngle;
        const bobX = pivotX + Math.cos(plumbAngle) * stringLength;
        const bobY = pivotY + Math.sin(plumbAngle) * stringLength;

        // Hanging string
        ctx.save();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();
        ctx.restore();

        // Metallic Plumb Bob / Heavy Nut Weight
        ctx.save();
        ctx.translate(bobX, bobY);
        ctx.rotate(this.stringAngle);

        // Hexagon brass plumb bob
        const bobGrad = ctx.createLinearGradient(-10, -10, 10, 14);
        bobGrad.addColorStop(0, '#fef08a');
        bobGrad.addColorStop(0.5, '#eab308');
        bobGrad.addColorStop(1, '#a16207');

        ctx.fillStyle = bobGrad;
        ctx.strokeStyle = '#713f12';
        ctx.lineWidth = 1.5;

        // Plumb weight shape
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(9, 2);
        ctx.lineTo(7, 16);
        ctx.lineTo(0, 24); // pointed tip
        ctx.lineTo(-7, 16);
        ctx.lineTo(-9, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Plumb line label
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('⚖️ Plumb Bob (Gravity)', 0, 38);

        ctx.restore();
    }

    drawSightlineAnnotation(pivotX, pivotY, radius, tiltRad) {
        const ctx = this.ctx;
        const rayLen = radius * 1.8;
        const targetX = pivotX + Math.cos(tiltRad) * rayLen;
        const targetY = pivotY + Math.sin(tiltRad) * rayLen;

        ctx.save();
        // Dashed glowing sight ray extending into the sky
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target sighting crosshair
        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillText('🔭 Sightline to Summit', targetX + 12, targetY - 4);
        ctx.restore();
    }

    drawReadoutCard(rawAlpha, elevationTheta) {
        const ctx = this.ctx;
        const cardW = 210;
        const cardH = 145;
        const cardX = this.width - cardW - 16;
        const cardY = 16;

        ctx.save();
        // Glassmorphic card container
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 10);
        ctx.fill();
        ctx.stroke();

        // Card header
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('📐 Live Clinometer Scale', cardX + 14, cardY + 24);

        // String intersection reading (alpha)
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Plumb String Reading (α):', cardX + 14, cardY + 50);
        ctx.font = 'bold 15px ui-monospace, monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${rawAlpha.toFixed(1)}°`, cardX + 14, cardY + 70);

        // Elevation angle (theta)
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('True Elevation Angle (θ):', cardX + 14, cardY + 96);
        ctx.font = 'bold 17px ui-monospace, monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText(`θ = |90° - ${rawAlpha.toFixed(1)}°| = ${elevationTheta.toFixed(1)}°`, cardX + 14, cardY + 118);

        // Subtle footnote
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Complementary angle to normal', cardX + 14, cardY + 135);
        ctx.restore();
    }

    drawProofDiagram(pivotX, pivotY, radius, rawAlpha, elevationTheta) {
        const ctx = this.ctx;
        // Bottom left explanation badge
        const badgeX = 18;
        const badgeY = this.height - 75;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 320, 60, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('💡 Why θ = |90° - α|?', badgeX + 12, badgeY + 20);

        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('At level horizon, plumb hangs straight down at 90°.', badgeX + 12, badgeY + 36);
        ctx.fillText(`Tilting sight up by ${elevationTheta.toFixed(1)}° shifts scale reading by ${elevationTheta.toFixed(1)}°.`, badgeX + 12, badgeY + 50);
        ctx.restore();
    }

    bindEvents() {
        const getAngleFromPivot = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = (clientX - rect.left);
            const py = (clientY - rect.top);
            const pivotX = this.width * 0.42;
            const pivotY = this.height * 0.46;

            const dx = px - pivotX;
            const dy = py - pivotY;
            // Angle in degrees from horizontal
            const rad = Math.atan2(-dy, dx);
            return (rad * 180) / Math.PI;
        };

        const onDown = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.isDragging = true;
            this.lastPointerAngle = getAngleFromPivot(clientX, clientY);
            sound.playClick();
        };

        const onMove = (e) => {
            if (!this.isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const curAngle = getAngleFromPivot(clientX, clientY);
            const delta = curAngle - this.lastPointerAngle;
            this.lastPointerAngle = curAngle;

            const newElev = Math.max(-10, Math.min(85, this.targetElevationAngle + delta));
            this.setElevation(newElev);

            if (this.options.onAngleChange) {
                this.options.onAngleChange(Number(newElev.toFixed(1)));
            }
            sound.playPlumbSwing(newElev);
        };

        const onUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                sound.playSnap();
            }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        this.canvas.addEventListener('touchstart', onDown, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    }
}
