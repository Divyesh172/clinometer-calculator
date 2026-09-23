// visualizer.js - Friendly, warm canvas illustration for Tree & Height Explorer
// Displays a friendly surveyor, switchable target (Tree, Building, Flagpole),
// clear trigonometry sightlines, height brackets, and supports direct canvas dragging.

import { sound } from './sound.js';

export class ClinometerVisualizer {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id '${canvasId}' not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.options = options;
        this.onParamChange = options.onParamChange || null;

        // Current target theme: 'tree', 'building', 'flagpole'
        this.theme = 'tree';

        // Units: 'm' or 'ft'
        this.unit = 'm';

        // Geometric state
        this.state = {
            distance: 15.0,    // d
            angle: 35.0,       // theta (deg)
            eyeHeight: 1.2,    // h_pillar (pillar height)
            h: 10.5,           // h = d * tan(angle)
            totalHeight: 11.7, // H = h + h_pillar
            hypotenuse: 18.31  // L = d / cos(angle)
        };

        // Dragging interaction state
        this.isDragging = false;
        this.dragTarget = null; // 'observer' | 'angleHandle'
        this.hoverHandle = null;

        // Cloud animation
        this.clouds = [
            { x: 30, y: 35, scale: 0.9, speed: 0.12 },
            { x: 180, y: 55, scale: 0.65, speed: 0.08 },
            { x: 340, y: 25, scale: 0.8, speed: 0.15 },
            { x: 500, y: 45, scale: 0.7, speed: 0.1 }
        ];
        this.lastFrameTime = performance.now();
        this.animId = null;

        // Layout padding (CSS pixels)
        this.padding = { left: 75, right: 85, top: 55, bottom: 65 };
        this.scale = 1; // pixels per unit (meter or foot)

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindEvents();
        this.startAnimation();
    }

    setTheme(theme) {
        this.theme = theme;
        this.render();
    }

    setUnit(unit) {
        this.unit = unit;
        this.render();
    }

    updateData(data) {
        this.state = { ...this.state, ...data };
        this.render();
    }

    resize() {
        const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 500, height: 380 };
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(300, rect.width);
        const height = Math.max(280, Math.min(480, window.innerHeight * 0.45));

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

    startAnimation() {
        const loop = (time) => {
            const dt = (time - this.lastFrameTime) / 1000;
            this.lastFrameTime = time;

            // Move clouds gently
            this.clouds.forEach(c => {
                c.x += c.speed * (dt * 60);
                if (c.x > this.width + 100) {
                    c.x = -100;
                }
            });

            this.render();
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    computeTransform() {
        const groundY = this.height - this.padding.bottom;
        const targetX = this.width - this.padding.right;

        // Determine view bounds based on distance and totalHeight
        const maxDist = Math.max(6, this.state.distance * 1.25);
        const maxHeight = Math.max(5, this.state.totalHeight * 1.3);

        const availW = targetX - this.padding.left;
        const availH = groundY - this.padding.top;

        const scaleX = availW / maxDist;
        const scaleY = availH / maxHeight;
        this.scale = Math.min(scaleX, scaleY);

        return { groundY, targetX, scale: this.scale };
    }

    render() {
        if (!this.ctx) return;
        const { width, height } = this;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        const { groundY, targetX, scale } = this.computeTransform();

        // 1. Draw warm sky & sun & gentle clouds
        this.drawSky(groundY);

        // 2. Draw rolling grassy meadow
        this.drawGround(groundY, targetX);

        // 3. Render scene elements: Surveyor, Target, and Geometry
        this.renderScene(groundY, targetX, scale);
    }

    drawSky(groundY) {
        const ctx = this.ctx;

        // Warm Mind Reader canvas sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, '#EAE6DC'); // Oyster canvas top
        skyGrad.addColorStop(0.7, '#F1EFE8');
        skyGrad.addColorStop(1, '#FBFAF6'); // Warm cream horizon

        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, groundY);

        // Soft warm ochre sun glow
        const sunGrad = ctx.createRadialGradient(50, 45, 8, 50, 45, 65);
        sunGrad.addColorStop(0, 'rgba(245, 200, 66, 0.4)');
        sunGrad.addColorStop(0.6, 'rgba(245, 200, 66, 0.1)');
        sunGrad.addColorStop(1, 'rgba(245, 200, 66, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(50, 45, 65, 0, Math.PI * 2);
        ctx.fill();

        // Sun disc (Warm Ochre #F5C842)
        ctx.fillStyle = '#F5C842';
        ctx.beginPath();
        ctx.arc(50, 45, 16, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy friendly clouds
        this.clouds.forEach(c => {
            this.drawCloud(c.x, c.y, c.scale);
        });
    }

    drawCloud(x, y, s) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.arc(16, -8, 22, 0, Math.PI * 2);
        ctx.arc(36, -6, 17, 0, Math.PI * 2);
        ctx.arc(48, 2, 14, 0, Math.PI * 2);
        ctx.arc(22, 6, 16, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawGround(groundY, targetX) {
        const ctx = this.ctx;
        const groundH = this.height - groundY;

        // Background gentle rolling hill (Sage #8FB78F)
        ctx.fillStyle = '#8FB78F';
        ctx.beginPath();
        ctx.moveTo(0, groundY + 2);
        ctx.quadraticCurveTo(this.width * 0.45, groundY - 14, this.width, groundY + 4);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        // Main warm grass foreground (Sage dark to ink gradient)
        const grassGrad = ctx.createLinearGradient(0, groundY, 0, this.height);
        grassGrad.addColorStop(0, '#7AA27A');
        grassGrad.addColorStop(0.4, '#4D7850');
        grassGrad.addColorStop(1, '#2F4A34');

        ctx.fillStyle = grassGrad;
        ctx.fillRect(0, groundY, this.width, groundH);

        // Ground top edge line
        ctx.strokeStyle = '#7AA27A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(this.width, groundY);
        ctx.stroke();

        // Decorative cute grass blades & small daisy flowers
        this.drawGrassDetails(groundY);
    }

    drawGrassDetails(groundY) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#6FA27B';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let x = 15; x < this.width; x += 36) {
            ctx.beginPath();
            ctx.moveTo(x, groundY + 1);
            ctx.lineTo(x - 3, groundY - 6);
            ctx.moveTo(x + 3, groundY + 1);
            ctx.lineTo(x + 5, groundY - 8);
            ctx.stroke();
        }

        // A couple of sweet little field flowers
        const flowerXs = [60, 140, 220, 310, 420];
        flowerXs.forEach((fx, idx) => {
            if (fx < this.width - 20) {
                const petalColor = idx % 2 === 0 ? '#FFFFFF' : '#FFD166';
                ctx.fillStyle = petalColor;
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
                    ctx.beginPath();
                    ctx.arc(fx + Math.cos(a) * 3, groundY - 5 + Math.sin(a) * 3, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#E08A1E';
                ctx.beginPath();
                ctx.arc(fx, groundY - 5, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    renderScene(groundY, targetX, scale) {
        const ctx = this.ctx;
        const d = this.state.distance;
        const hEye = this.state.eyeHeight;
        const h = this.state.h;
        const totalH = this.state.totalHeight;
        const theta = this.state.angle;

        const obsX = targetX - d * scale;
        const eyeY = groundY - hEye * scale;
        const topY = groundY - totalH * scale;

        // Keep drag handle positions for hit testing
        this.handles = {
            observer: { x: obsX, y: groundY - (hEye * scale) / 2, radius: 26 },
            angleHandle: { x: targetX, y: topY, radius: 22 }
        };

        // 1. Draw Target Object at targetX
        this.drawTargetObject(targetX, groundY, totalH * scale);

        // 2. Draw Observer Figure at obsX
        this.drawFriendlySurveyor(obsX, groundY, hEye * scale, eyeY, targetX, topY, theta);

        // 3. Draw Trigonometric Reference Area & Lines
        // Light warm highlight under the triangle
        ctx.fillStyle = 'rgba(224, 90, 71, 0.06)';
        ctx.beginPath();
        ctx.moveTo(obsX, eyeY);
        ctx.lineTo(targetX, eyeY);
        ctx.lineTo(targetX, topY);
        ctx.closePath();
        ctx.fill();

        // Horizontal eye-level line (Adjacent d)
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#28536B'; // Petrol Slate
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obsX, eyeY);
        ctx.lineTo(targetX, eyeY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right-angle symbol at (targetX, eyeY)
        const sq = Math.min(14, Math.max(8, scale * 0.8));
        ctx.strokeStyle = '#28536B';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(targetX - sq, eyeY - sq, sq, sq);

        // Dotted rise line above eye level (Opposite h)
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#E05A47'; // Terracotta
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(targetX, eyeY);
        ctx.lineTo(targetX, topY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Line of Sight (Hypotenuse) from eye to top
        ctx.strokeStyle = '#E05A47'; // Terracotta
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(obsX, eyeY);
        ctx.lineTo(targetX, topY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Draw Angle Arc at Surveyor's Eye
        this.drawAngleArc(obsX, eyeY, theta, scale);

        // 5. Dimension bracket along ground: Distance d
        this.drawDistanceBracket(obsX, targetX, groundY, d);

        // 6. Dimension bracket on right: Total Height H with h and h_eye split
        this.drawHeightBracket(targetX, groundY, eyeY, topY, h, hEye, totalH);

        // 7. Interactive handles (observer drag pill and top target drag halo)
        this.drawDragHandles(obsX, eyeY, targetX, topY, groundY);
    }

    drawFriendlySurveyor(obsX, groundY, figureH, eyeY, targetX, topY, theta) {
        const ctx = this.ctx;
        ctx.save();

        // ----------------------------------------------------
        // A. Fixed Observation Pillar at obsX (from groundY up to eyeY)
        // figureH is the pillar height in canvas pixels (hPillar * scale)
        // ----------------------------------------------------
        const pillarTopY = eyeY;
        const pillarW = 16;

        // 1. Pillar Ground Shadow
        ctx.fillStyle = 'rgba(38, 36, 32, 0.2)';
        ctx.beginPath();
        ctx.ellipse(obsX, groundY, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Pillar Base Plinth (stepped architectural stone)
        ctx.fillStyle = '#DBD5C6';
        ctx.strokeStyle = '#B0A898';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(obsX - 16, groundY - 4, 32, 5, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#E7E0D0';
        ctx.beginPath();
        ctx.roundRect(obsX - 12, groundY - 8, 24, 5, 1.5);
        ctx.fill();
        ctx.stroke();

        // 3. Pillar Column Shaft
        const shaftTop = Math.min(groundY - 10, pillarTopY + 4);
        const shaftH = groundY - 8 - shaftTop;
        if (shaftH > 2) {
            // Main stone column
            const shaftGrad = ctx.createLinearGradient(obsX - pillarW / 2, 0, obsX + pillarW / 2, 0);
            shaftGrad.addColorStop(0, '#DBD5C6');
            shaftGrad.addColorStop(0.25, '#F1EFE8');
            shaftGrad.addColorStop(0.75, '#E7E0D0');
            shaftGrad.addColorStop(1, '#C8C0B0');

            ctx.fillStyle = shaftGrad;
            ctx.strokeStyle = '#9E9686';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(obsX - pillarW / 2, shaftTop, pillarW, shaftH);
            ctx.fill();
            ctx.stroke();

            // Vertical architectural fluting
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(obsX - 3, shaftTop + 2);
            ctx.lineTo(obsX - 3, shaftTop + shaftH - 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(150, 140, 125, 0.4)';
            ctx.beginPath();
            ctx.moveTo(obsX + 3, shaftTop + 2);
            ctx.lineTo(obsX + 3, shaftTop + shaftH - 2);
            ctx.stroke();

            // Survey datum benchmark brass plaque on the pillar
            if (shaftH > 20) {
                const plaqueY = shaftTop + shaftH * 0.45;
                ctx.fillStyle = '#F5C842';
                ctx.strokeStyle = '#B38600';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.roundRect(obsX - 5, plaqueY - 5, 10, 10, 1.5);
                ctx.fill();
                ctx.stroke();
                // Crosshair on benchmark
                ctx.strokeStyle = '#262420';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(obsX - 3, plaqueY);
                ctx.lineTo(obsX + 3, plaqueY);
                ctx.moveTo(obsX, plaqueY - 3);
                ctx.lineTo(obsX, plaqueY + 3);
                ctx.stroke();
            }
        }

        // 4. Pillar Capital / Dark Metal Mounting Plate at eyeY
        ctx.fillStyle = '#262420';
        ctx.beginPath();
        ctx.roundRect(obsX - 14, pillarTopY - 1, 28, 4, 1.5);
        ctx.fill();

        // Brass swivel mount / leveling base
        ctx.fillStyle = '#DDAE27';
        ctx.strokeStyle = '#A37F15';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(obsX - 7, pillarTopY - 5, 14, 4, 1);
        ctx.fill();
        ctx.stroke();

        // ----------------------------------------------------
        // B. Clinometer Instrument Mounted on Top of Pillar
        // ----------------------------------------------------
        const rad = (theta * Math.PI) / 180;
        ctx.save();
        ctx.translate(obsX, pillarTopY); // Pivot center is exactly at pillar top (obsX, eyeY)

        // Pivot brass pin
        ctx.fillStyle = '#F5C842';
        ctx.strokeStyle = '#262420';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotate for sighting tube
        ctx.save();
        ctx.rotate(-rad);

        // Sighting tube straw (warm ochre #F5C842)
        ctx.fillStyle = '#F5C842';
        ctx.strokeStyle = '#DDAE27';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-8, -3, 34, 6, 2);
        ctx.fill();
        ctx.stroke();

        // Eyepiece ring on left
        ctx.fillStyle = '#262420';
        ctx.beginPath();
        ctx.roundRect(-9.5, -4.5, 3, 9, 1);
        ctx.fill();

        // Objective lens collar on right
        ctx.fillStyle = '#262420';
        ctx.beginPath();
        ctx.roundRect(24, -4, 2.5, 8, 1);
        ctx.fill();

        // Protractor dial hanging below straw
        ctx.fillStyle = 'rgba(251, 250, 246, 0.95)';
        ctx.strokeStyle = '#DBD5C6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(10, 3, 11, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little angle tick marks
        ctx.strokeStyle = '#8A8275';
        ctx.lineWidth = 0.8;
        for (let a = 0.3; a < Math.PI; a += 0.5) {
            ctx.beginPath();
            ctx.moveTo(10 + Math.cos(a) * 8, 3 + Math.sin(a) * 8);
            ctx.lineTo(10 + Math.cos(a) * 11, 3 + Math.sin(a) * 11);
            ctx.stroke();
        }

        // Gravity Plumb Line hanging straight down
        ctx.save();
        ctx.translate(10, 3);
        ctx.rotate(rad); // counter-rotate so plumb string stays strictly vertical
        ctx.strokeStyle = '#262420';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // Plumb bob / brass weight
        ctx.fillStyle = '#28536B';
        ctx.strokeStyle = '#1F4256';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(21, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore(); // Restore sighting tube rotation
        ctx.restore(); // Restore pillar top translation

        // ----------------------------------------------------
        // C. Friendly Surveyor standing beside the pillar
        // Height is natural & fixed, decoupled from pillar height!
        // ----------------------------------------------------
        const surveyorX = obsX - 28;
        ctx.save();
        ctx.translate(surveyorX, groundY);

        const headR = 10;
        const bodyW = 16;
        const bodyH = 28;

        // Shadow under surveyor's feet
        ctx.fillStyle = 'rgba(38, 36, 32, 0.16)';
        ctx.beginPath();
        ctx.ellipse(0, 0, headR * 1.4, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs / Pants (deep espresso #262420)
        ctx.strokeStyle = '#262420';
        ctx.lineWidth = 5.5;
        ctx.lineCap = 'round';
        // Back leg
        ctx.beginPath();
        ctx.moveTo(-4, -bodyH * 0.6);
        ctx.lineTo(-4, 0);
        ctx.stroke();
        // Front leg
        ctx.beginPath();
        ctx.moveTo(4, -bodyH * 0.6);
        ctx.lineTo(4, 0);
        ctx.stroke();

        // Shoes (dark charcoal)
        ctx.fillStyle = '#3D3A34';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(5, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Torso / Shirt (crisp warm cream #FBFAF6)
        ctx.fillStyle = '#FBFAF6';
        ctx.beginPath();
        ctx.roundRect(-bodyW / 2, -bodyH - 9, bodyW, bodyH, 5);
        ctx.fill();

        // Vest over shirt (terracotta #E05A47)
        ctx.fillStyle = '#E05A47';
        ctx.beginPath();
        ctx.roundRect(-bodyW / 2, -bodyH - 9, bodyW * 0.38, bodyH * 0.9, 3);
        ctx.roundRect(bodyW * 0.12, -bodyH - 9, bodyW * 0.38, bodyH * 0.9, 3);
        ctx.fill();

        // Head
        const headY = -bodyH - 9 - headR;
        ctx.fillStyle = '#F7D0B2';
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // Friendly smiling face (facing right towards clinometer)
        ctx.fillStyle = '#262420';
        ctx.beginPath();
        ctx.arc(headR * 0.35, headY - headR * 0.15, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#8B5A3E';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(headR * 0.3, headY + headR * 0.15, headR * 0.35, 0.1, Math.PI * 0.6);
        ctx.stroke();

        // Rosy cheek
        ctx.fillStyle = 'rgba(224, 90, 71, 0.35)';
        ctx.beginPath();
        ctx.arc(headR * 0.25, headY + headR * 0.15, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Surveyor cap (petrol slate with visor)
        ctx.fillStyle = '#28536B';
        ctx.beginPath();
        ctx.arc(0, headY - headR * 0.2, headR * 1.05, Math.PI, Math.PI * 2);
        ctx.fill();

        // Cap visor
        ctx.fillStyle = '#1F4256';
        ctx.beginPath();
        ctx.moveTo(headR * 0.3, headY - headR * 0.2);
        ctx.lineTo(headR * 1.35, headY - headR * 0.05);
        ctx.lineTo(headR * 0.5, headY);
        ctx.closePath();
        ctx.fill();

        // Left arm holding clipboard / field notebook
        ctx.strokeStyle = '#E05A47';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-headR * 0.4, -bodyH * 0.75);
        ctx.lineTo(-headR * 0.8, -bodyH * 0.35);
        ctx.stroke();

        // Clipboard
        ctx.fillStyle = '#FBFAF6';
        ctx.strokeStyle = '#9E9686';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-headR * 1.4, -bodyH * 0.45, 9, 12, 1);
        ctx.fill();
        ctx.stroke();

        // Right arm reaching forward towards the pillar instrument
        const armTargetX = obsX - surveyorX - 5; // near the pillar mount
        const armTargetY = pillarTopY - groundY;
        ctx.strokeStyle = '#E05A47';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(headR * 0.3, -bodyH * 0.75);
        ctx.quadraticCurveTo(headR * 1.0, -bodyH * 0.5, armTargetX, Math.min(-15, armTargetY + 5));
        ctx.stroke();

        // Surveyor hand at knob
        ctx.fillStyle = '#F7D0B2';
        ctx.beginPath();
        ctx.arc(armTargetX, Math.min(-15, armTargetY + 5), 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Restore surveyor translation

        ctx.restore(); // Final restore
    }

    drawTargetObject(targetX, groundY, objectH) {
        const ctx = this.ctx;
        ctx.save();

        if (this.theme === 'building') {
            this.drawCozyBuilding(targetX, groundY, objectH);
        } else if (this.theme === 'flagpole') {
            this.drawSchoolFlagpole(targetX, groundY, objectH);
        } else {
            this.drawFriendlyTree(targetX, groundY, objectH);
        }

        ctx.restore();
    }

    drawFriendlyTree(targetX, groundY, h) {
        const ctx = this.ctx;
        const trunkW = Math.max(16, h * 0.12);
        const trunkH = Math.max(24, h * 0.38);
        const canopyR = Math.max(28, h * 0.48);

        // Ground shadow under tree
        ctx.fillStyle = 'rgba(38, 36, 32, 0.16)';
        ctx.beginPath();
        ctx.ellipse(targetX, groundY, canopyR * 0.9, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tree trunk (warm wood tones)
        const trunkGrad = ctx.createLinearGradient(targetX - trunkW, groundY, targetX + trunkW, groundY);
        trunkGrad.addColorStop(0, '#5C3826');
        trunkGrad.addColorStop(0.5, '#7A4D33');
        trunkGrad.addColorStop(1, '#4A2D1E');

        ctx.fillStyle = trunkGrad;
        ctx.beginPath();
        ctx.moveTo(targetX - trunkW * 0.7, groundY);
        ctx.lineTo(targetX - trunkW * 0.45, groundY - trunkH);
        ctx.lineTo(targetX + trunkW * 0.45, groundY - trunkH);
        ctx.lineTo(targetX + trunkW * 0.7, groundY);
        ctx.closePath();
        ctx.fill();

        // Trunk roots
        ctx.strokeStyle = '#4A2D1E';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(targetX - trunkW * 0.6, groundY - 4);
        ctx.lineTo(targetX - trunkW * 0.95, groundY);
        ctx.moveTo(targetX + trunkW * 0.6, groundY - 4);
        ctx.lineTo(targetX + trunkW * 0.95, groundY);
        ctx.stroke();

        // Lush tree canopy with Monty Hall sage palette
        const canopyCenterY = groundY - h + canopyR * 0.85;

        // Canopy shadow back layer (sage ink)
        ctx.fillStyle = '#2F4A34';
        ctx.beginPath();
        ctx.arc(targetX - canopyR * 0.35, canopyCenterY + canopyR * 0.2, canopyR * 0.55, 0, Math.PI * 2);
        ctx.arc(targetX + canopyR * 0.35, canopyCenterY + canopyR * 0.2, canopyR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Canopy main mid layer (sage olive #8FB78F)
        ctx.fillStyle = '#8FB78F';
        ctx.beginPath();
        ctx.arc(targetX, canopyCenterY, canopyR * 0.75, 0, Math.PI * 2);
        ctx.arc(targetX - canopyR * 0.4, canopyCenterY - canopyR * 0.1, canopyR * 0.5, 0, Math.PI * 2);
        ctx.arc(targetX + canopyR * 0.4, canopyCenterY - canopyR * 0.1, canopyR * 0.5, 0, Math.PI * 2);
        ctx.arc(targetX, groundY - h + canopyR * 0.5, canopyR * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Canopy highlight top layer
        ctx.fillStyle = '#A8CCA8';
        ctx.beginPath();
        ctx.arc(targetX - canopyR * 0.18, canopyCenterY - canopyR * 0.25, canopyR * 0.45, 0, Math.PI * 2);
        ctx.arc(targetX + canopyR * 0.18, canopyCenterY - canopyR * 0.3, canopyR * 0.4, 0, Math.PI * 2);
        ctx.arc(targetX, groundY - h + canopyR * 0.4, canopyR * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Sweet red apples in tree (terracotta #E05A47)
        const apples = [
            { x: -canopyR * 0.3, y: -canopyR * 0.1 },
            { x: canopyR * 0.35, y: -canopyR * 0.2 },
            { x: -canopyR * 0.05, y: canopyR * 0.15 },
            { x: canopyR * 0.2, y: canopyR * 0.25 },
            { x: -canopyR * 0.35, y: canopyR * 0.3 }
        ];
        apples.forEach(app => {
            const ax = targetX + app.x;
            const ay = canopyCenterY + app.y;
            ctx.fillStyle = '#E05A47';
            ctx.beginPath();
            ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
            ctx.fill();
            // Glint
            ctx.fillStyle = '#FBFAF6';
            ctx.beginPath();
            ctx.arc(ax - 1, ay - 1, 1, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawCozyBuilding(targetX, groundY, h) {
        const ctx = this.ctx;
        const bW = Math.max(34, h * 0.48);
        const roofH = Math.max(16, h * 0.22);
        const wallH = h - roofH;

        // Ground shadow
        ctx.fillStyle = 'rgba(38, 36, 32, 0.18)';
        ctx.fillRect(targetX - bW / 2 - 4, groundY - 2, bW + 8, 5);

        // Warm terracotta brick walls
        const brickGrad = ctx.createLinearGradient(targetX - bW / 2, 0, targetX + bW / 2, 0);
        brickGrad.addColorStop(0, '#C94A38');
        brickGrad.addColorStop(0.5, '#E05A47');
        brickGrad.addColorStop(1, '#B8492C');

        ctx.fillStyle = brickGrad;
        ctx.fillRect(targetX - bW / 2, groundY - wallH, bW, wallH);

        // Brick texture lines
        ctx.strokeStyle = 'rgba(251, 250, 246, 0.3)';
        ctx.lineWidth = 1;
        const rowH = 10;
        for (let y = groundY - wallH + rowH; y < groundY; y += rowH) {
            ctx.beginPath();
            ctx.moveTo(targetX - bW / 2, y);
            ctx.lineTo(targetX + bW / 2, y);
            ctx.stroke();
        }

        // Pitched roof (petrol slate #28536B)
        ctx.fillStyle = '#28536B';
        ctx.beginPath();
        ctx.moveTo(targetX - bW / 2 - 6, groundY - wallH);
        ctx.lineTo(targetX, groundY - h);
        ctx.lineTo(targetX + bW / 2 + 6, groundY - wallH);
        ctx.closePath();
        ctx.fill();

        // Roof trim (ochre gold #F5C842)
        ctx.strokeStyle = '#F5C842';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Little chimney
        ctx.fillStyle = '#C94A38';
        ctx.fillRect(targetX + bW * 0.18, groundY - h + roofH * 0.2, 10, roofH * 0.7);
        // Smoke puffs
        ctx.fillStyle = 'rgba(251, 250, 246, 0.65)';
        ctx.beginPath();
        ctx.arc(targetX + bW * 0.18 + 5, groundY - h - 4, 4, 0, Math.PI * 2);
        ctx.arc(targetX + bW * 0.18 + 9, groundY - h - 12, 6, 0, Math.PI * 2);
        ctx.fill();

        // Arched window (ochre glow #F5C842)
        const winW = Math.min(18, bW * 0.32);
        const winH = Math.min(26, wallH * 0.35);
        const winX = targetX - winW / 2;
        const winY = groundY - wallH * 0.7;

        ctx.fillStyle = '#FFF2B2';
        ctx.beginPath();
        ctx.roundRect(winX, winY, winW, winH, [8, 8, 2, 2]);
        ctx.fill();

        // Window pane grid
        ctx.strokeStyle = '#262420';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(winX + winW / 2, winY);
        ctx.lineTo(winX + winW / 2, winY + winH);
        ctx.moveTo(winX, winY + winH / 2);
        ctx.lineTo(winX + winW, winY + winH / 2);
        ctx.stroke();

        // Front door (deep espresso ink)
        const doorW = Math.min(16, bW * 0.28);
        const doorH = Math.min(28, wallH * 0.38);
        ctx.fillStyle = '#262420';
        ctx.beginPath();
        ctx.roundRect(targetX - doorW / 2, groundY - doorH, doorW, doorH, [4, 4, 0, 0]);
        ctx.fill();
        // Door knob (ochre)
        ctx.fillStyle = '#F5C842';
        ctx.beginPath();
        ctx.arc(targetX + doorW * 0.25, groundY - doorH * 0.5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSchoolFlagpole(targetX, groundY, h) {
        const ctx = this.ctx;

        // Ground architectural pedestal
        ctx.fillStyle = '#DBD5C6';
        ctx.beginPath();
        ctx.roundRect(targetX - 14, groundY - 8, 28, 8, 3);
        ctx.fill();

        // Shiny metal pole
        const poleGrad = ctx.createLinearGradient(targetX - 3, 0, targetX + 3, 0);
        poleGrad.addColorStop(0, '#DBD5C6');
        poleGrad.addColorStop(0.5, '#FBFAF6');
        poleGrad.addColorStop(1, '#DBD5C6');

        ctx.fillStyle = poleGrad;
        ctx.fillRect(targetX - 2.5, groundY - h, 5, h - 8);

        // Golden top sphere (ochre)
        ctx.fillStyle = '#F5C842';
        ctx.beginPath();
        ctx.arc(targetX, groundY - h, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#DDAE27';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fluttering flag (terracotta)
        const flagW = Math.min(48, Math.max(28, h * 0.28));
        const flagH = flagW * 0.65;
        const flagY = groundY - h + 10;

        ctx.fillStyle = '#E05A47';
        ctx.beginPath();
        ctx.moveTo(targetX + 2.5, flagY);
        ctx.quadraticCurveTo(targetX + 2.5 + flagW * 0.5, flagY - 5, targetX + 2.5 + flagW, flagY + 4);
        ctx.lineTo(targetX + 2.5 + flagW, flagY + flagH + 4);
        ctx.quadraticCurveTo(targetX + 2.5 + flagW * 0.5, flagY + flagH - 5, targetX + 2.5, flagY + flagH);
        ctx.closePath();
        ctx.fill();

        // Flag emblem
        ctx.fillStyle = '#FBFAF6';
        ctx.beginPath();
        ctx.arc(targetX + 2.5 + flagW * 0.45, flagY + flagH * 0.5, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawAngleArc(obsX, eyeY, theta, scale) {
        const ctx = this.ctx;
        const arcR = Math.max(30, Math.min(55, scale * 1.5));
        const rad = (theta * Math.PI) / 180;

        // Filled wedge with soft amber
        ctx.fillStyle = 'rgba(229, 169, 60, 0.22)';
        ctx.beginPath();
        ctx.moveTo(obsX, eyeY);
        ctx.arc(obsX, eyeY, arcR, -rad, 0, false);
        ctx.closePath();
        ctx.fill();

        // Border arc
        ctx.strokeStyle = '#E08A1E';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(obsX, eyeY, arcR, -rad, 0, false);
        ctx.stroke();

        // Angle badge pill
        const midRad = -rad / 2;
        const labelR = arcR + 24;
        const lx = obsX + Math.cos(midRad) * labelR;
        const ly = eyeY + Math.sin(midRad) * labelR;

        const text = `θ = ${theta.toFixed(1)}°`;
        ctx.font = '700 13px Sora, sans-serif';
        const tw = ctx.measureText(text).width;

        ctx.fillStyle = '#FBFAF6';
        ctx.strokeStyle = '#DDAE27';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(lx - tw / 2 - 6, ly - 10, tw + 12, 20, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#262420';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, lx, ly);
    }

    drawDistanceBracket(obsX, targetX, groundY, d) {
        const ctx = this.ctx;
        const bracketY = groundY + 28;

        ctx.strokeStyle = '#262420';
        ctx.lineWidth = 1.5;

        // Horizontal dimension line
        ctx.beginPath();
        ctx.moveTo(obsX, bracketY);
        ctx.lineTo(targetX, bracketY);
        // Left tick
        ctx.moveTo(obsX, bracketY - 6);
        ctx.lineTo(obsX, bracketY + 6);
        // Right tick
        ctx.moveTo(targetX, bracketY - 6);
        ctx.lineTo(targetX, bracketY + 6);
        ctx.stroke();

        // Dimension Label pill
        const midX = (obsX + targetX) / 2;
        const distText = `d = ${d.toFixed(1)} ${this.unit}`;

        ctx.font = '600 12px Inter, sans-serif';
        const tw = ctx.measureText(distText).width;

        ctx.fillStyle = '#FBFAF6';
        ctx.strokeStyle = '#DBD5C6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(midX - tw / 2 - 8, bracketY - 10, tw + 16, 20, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#262420';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(distText, midX, bracketY);
    }

    drawHeightBracket(targetX, groundY, eyeY, topY, h, hEye, totalH) {
        const ctx = this.ctx;
        const bx = targetX + 32;

        ctx.strokeStyle = '#57534A';
        ctx.lineWidth = 1.5;

        // 1. Pillar height bracket [groundY -> eyeY]
        ctx.beginPath();
        ctx.moveTo(bx, groundY);
        ctx.lineTo(bx, eyeY);
        ctx.moveTo(bx - 5, groundY);
        ctx.lineTo(bx + 5, groundY);
        ctx.moveTo(bx - 5, eyeY);
        ctx.lineTo(bx + 5, eyeY);
        ctx.stroke();

        // Pillar label
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillStyle = '#2F4A34';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Pillar: ${hEye.toFixed(1)} ${this.unit}`, bx + 8, (groundY + eyeY) / 2);

        // 2. Rise bracket [eyeY -> topY]
        ctx.beginPath();
        ctx.moveTo(bx, eyeY);
        ctx.lineTo(bx, topY);
        ctx.moveTo(bx - 5, topY);
        ctx.lineTo(bx + 5, topY);
        ctx.stroke();

        // Rise label
        ctx.fillStyle = '#E05A47';
        ctx.fillText(`Rise: ${h.toFixed(1)} ${this.unit}`, bx + 8, (eyeY + topY) / 2);

        // 3. Outer Total Height Bracket
        const obx = bx + 55;
        ctx.strokeStyle = '#262420';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(obx, groundY);
        ctx.lineTo(obx, topY);
        ctx.moveTo(obx - 6, groundY);
        ctx.lineTo(obx + 6, groundY);
        ctx.moveTo(obx - 6, topY);
        ctx.lineTo(obx + 6, topY);
        ctx.stroke();

        // Total Height Badge Pill
        const totalText = `H = ${totalH.toFixed(1)} ${this.unit}`;
        ctx.font = '700 13px Sora, sans-serif';
        const tw = ctx.measureText(totalText).width;
        const midY = (groundY + topY) / 2;

        ctx.fillStyle = '#262420';
        ctx.beginPath();
        ctx.roundRect(obx + 8, midY - 11, tw + 14, 22, 11);
        ctx.fill();

        ctx.fillStyle = '#FBFAF6';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(totalText, obx + 15, midY);
    }

    drawDragHandles(obsX, eyeY, targetX, topY, groundY) {
        const ctx = this.ctx;

        // 1. Observer Drag Indicator (below surveyor)
        const isObsHover = this.hoverHandle === 'observer' || (this.isDragging && this.dragTarget === 'observer');
        ctx.fillStyle = isObsHover ? '#D95D39' : '#52795D';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(obsX - 22, groundY - 14, 44, 16, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◄ Drag ►', obsX, groundY - 6);

        // 2. Target Tip Angle Drag Handle
        const isTipHover = this.hoverHandle === 'angleHandle' || (this.isDragging && this.dragTarget === 'angleHandle');
        const tipRadius = isTipHover ? 11 : 9;

        // Glowing pulse halo
        ctx.fillStyle = isTipHover ? 'rgba(217, 93, 57, 0.4)' : 'rgba(217, 93, 57, 0.2)';
        ctx.beginPath();
        ctx.arc(targetX, topY, tipRadius + 7, 0, Math.PI * 2);
        ctx.fill();

        // Core handle circle
        ctx.fillStyle = '#D95D39';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, topY, tipRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tiny tooltip next to target tip if hovering
        if (isTipHover) {
            ctx.fillStyle = '#231F1D';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.beginPath();
            ctx.roundRect(targetX - 35, topY - 26, 70, 18, 9);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('▲ Drag tip ▼', targetX, topY - 17);
        }
    }

    // Event Handling & Direct Canvas Dragging
    bindEvents() {
        const canvas = this.canvas;

        canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        window.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup', () => this.onPointerUp());

        // Touch support for outdoor mobile / tablet surveying
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.onPointerDown(touch);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                e.preventDefault(); // prevent scroll during drag
                const touch = e.touches[0];
                this.onPointerMove(touch);
            }
        }, { passive: false });

        window.addEventListener('touchend', () => this.onPointerUp());
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    onPointerDown(e) {
        const pos = this.getPointerPos(e);
        const { groundY, targetX, scale } = this.computeTransform();
        const obsX = targetX - this.state.distance * scale;
        const topY = groundY - this.state.totalHeight * scale;

        // Check if clicked near target top handle (tilt angle)
        const dAngle = Math.hypot(pos.x - targetX, pos.y - topY);
        if (dAngle < 28) {
            this.isDragging = true;
            this.dragTarget = 'angleHandle';
            this.canvas.style.cursor = 'ns-resize';
            sound.playClick();
            return;
        }

        // Check if clicked near observer figure (distance)
        const dObs = Math.hypot(pos.x - obsX, pos.y - (groundY - 30));
        if (dObs < 42 || (pos.x > obsX - 35 && pos.x < obsX + 35 && pos.y > groundY - 70 && pos.y < groundY + 20)) {
            this.isDragging = true;
            this.dragTarget = 'observer';
            this.canvas.style.cursor = 'ew-resize';
            sound.playClick();
            return;
        }
    }

    onPointerMove(e) {
        const pos = this.getPointerPos(e);

        if (!this.isDragging) {
            // Update hover state
            const { groundY, targetX, scale } = this.computeTransform();
            const obsX = targetX - this.state.distance * scale;
            const topY = groundY - this.state.totalHeight * scale;

            const dAngle = Math.hypot(pos.x - targetX, pos.y - topY);
            const dObs = Math.hypot(pos.x - obsX, pos.y - (groundY - 30));

            if (dAngle < 28) {
                this.hoverHandle = 'angleHandle';
                this.canvas.style.cursor = 'ns-resize';
            } else if (dObs < 42 || (pos.x > obsX - 35 && pos.x < obsX + 35 && pos.y > groundY - 70 && pos.y < groundY + 20)) {
                this.hoverHandle = 'observer';
                this.canvas.style.cursor = 'ew-resize';
            } else {
                this.hoverHandle = null;
                this.canvas.style.cursor = 'default';
            }
            return;
        }

        // Handle Active Dragging
        const { groundY, targetX, scale } = this.computeTransform();

        if (this.dragTarget === 'observer') {
            // Dragging observer left/right changes distance d
            const rawDist = (targetX - pos.x) / scale;
            const maxAllowed = this.unit === 'm' ? 50 : 160;
            const minAllowed = this.unit === 'm' ? 1.5 : 5;
            const newDist = Math.max(minAllowed, Math.min(maxAllowed, rawDist));

            if (Math.abs(newDist - this.state.distance) > 0.08) {
                sound.playTick(480);
                if (this.onParamChange) {
                    this.onParamChange({ distance: parseFloat(newDist.toFixed(1)) });
                }
            }
        } else if (this.dragTarget === 'angleHandle') {
            // Dragging target tip up/down changes tilt angle
            const eyeY = groundY - this.state.eyeHeight * scale;
            const dy = eyeY - pos.y; // positive upwards
            const dx = this.state.distance * scale;

            if (dx > 0 && dy > 0) {
                let rad = Math.atan2(dy, dx);
                let deg = (rad * 180) / Math.PI;
                deg = Math.max(2, Math.min(85, deg));

                if (Math.abs(deg - this.state.angle) > 0.3) {
                    sound.playTick(560);
                    if (this.onParamChange) {
                        this.onParamChange({ angle: parseFloat(deg.toFixed(1)) });
                    }
                }
            }
        }
    }

    onPointerUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragTarget = null;
            this.canvas.style.cursor = 'default';
            sound.playSnap();
        }
    }

    destroy() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
        }
    }
}
