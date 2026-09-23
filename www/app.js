// app.js - Single-Page Real-World Height Calculator Orchestrator
// Handles WASM integration, JS math fallback, unit conversion, sound cues,
// DOM binding, visualizer coordination, and celebratory confetti.

import { ClinometerVisualizer } from './visualizer.js';
import { ConfettiCelebration } from './confetti.js';
import { sound } from './sound.js';

// Application state
const state = {
    unit: 'm', // 'm' or 'ft'
    target: 'tree', // 'tree', 'building', 'flagpole'
    distance: 15.0,
    angle: 35.0,
    eyeHeight: 1.20,
    wasmLoaded: false
};

// Pure JavaScript Fallback Math Engine
const MathEngine = {
    calculateDirect(distance, angleDeg, eyeHeight) {
        const rad = (angleDeg * Math.PI) / 180;
        const tanVal = Math.tan(rad);
        const cosVal = Math.cos(rad);

        const h = distance * tanVal;
        const totalHeight = h + eyeHeight;
        const hypotenuse = cosVal !== 0 ? distance / cosVal : 0;
        const eyeRatio = totalHeight > 0 ? (eyeHeight / totalHeight) * 100 : 0;

        return {
            distance,
            angle_deg: angleDeg,
            eye_height: eyeHeight,
            tan_val: tanVal,
            cos_val: cosVal,
            h,
            total_height: totalHeight,
            hypotenuse,
            eye_ratio: eyeRatio
        };
    },

    mToFt(m) {
        return m * 3.28084;
    },

    ftToM(ft) {
        return ft * 0.3048;
    }
};

class HeightFinderApp {
    constructor() {
        this.visualizer = null;
        this.confetti = null;
        this.wasm = null;
        this.lastSoundTick = 0;
    }

    async init() {
        // 1. Initialize Confetti celebration canvas
        try {
            this.confetti = new ConfettiCelebration();
        } catch (e) {
            console.warn('Confetti engine init note:', e);
        }

        // 2. Load Rust WASM module
        await this.loadWasm();

        // 3. Initialize Visualizer Canvas
        this.initVisualizer();

        // 4. Bind DOM controls and listeners
        this.bindDOM();

        // 5. Initial calculation
        this.recalculate();
    }

    async loadWasm() {
        const badge = document.getElementById('engineBadge');
        try {
            const wasmModule = await import('./pkg/clinometer_calculator.js');
            if (wasmModule && wasmModule.default) {
                await wasmModule.default();
                this.wasm = wasmModule;
                state.wasmLoaded = true;
                if (badge) {
                    badge.innerHTML = '⚡ Rust + WASM';
                    badge.style.background = 'var(--color-sage-soft)';
                    badge.style.color = 'var(--color-sage-ink)';
                }
                console.log('Rust WebAssembly module loaded successfully.');
            }
        } catch (e) {
            console.info('Rust WASM fallback active. Using high-precision JS math.', e);
            if (badge) {
                badge.innerHTML = '📐 JS Math';
            }
        }
    }

    initVisualizer() {
        this.visualizer = new ClinometerVisualizer('sceneCanvas', {
            onParamChange: (params) => {
                if (params.distance !== undefined) {
                    state.distance = params.distance;
                    const dInput = document.getElementById('distanceInput');
                    const dRange = document.getElementById('distanceRange');
                    if (dInput) dInput.value = state.distance.toFixed(1);
                    if (dRange) dRange.value = state.distance;
                }
                if (params.angle !== undefined) {
                    state.angle = params.angle;
                    const aInput = document.getElementById('angleInput');
                    const aRange = document.getElementById('angleRange');
                    if (aInput) aInput.value = state.angle.toFixed(1);
                    if (aRange) aRange.value = state.angle;
                    this.updateProtractorStringHelper();
                }
                this.recalculate(false); // don't re-render visualizer during internal drag
            }
        });
        this.visualizer.setTheme(state.target);
        this.visualizer.setUnit(state.unit);
    }

    bindDOM() {
        // --- Unit Toggle Switcher ---
        const unitBtnM = document.getElementById('unitBtnM');
        const unitBtnFt = document.getElementById('unitBtnFt');

        if (unitBtnM && unitBtnFt) {
            unitBtnM.addEventListener('click', () => this.setUnit('m'));
            unitBtnFt.addEventListener('click', () => this.setUnit('ft'));
        }

        // --- Sound Toggle ---
        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const muted = sound.toggleMute();
                soundBtn.textContent = muted ? '🔇 Muted' : '🔊 Audio';
                if (!muted) sound.playClick();
            });
        }

        // --- Target Object Selector ---
        const targetBtns = document.querySelectorAll('.target-btn');
        targetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                targetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.target = btn.getAttribute('data-theme');
                if (this.visualizer) {
                    this.visualizer.setTheme(state.target);
                }
                sound.playClick();
                this.recalculate();
            });
        });

        // --- Step 1: Distance Inputs ---
        const distanceInput = document.getElementById('distanceInput');
        const distanceRange = document.getElementById('distanceRange');

        if (distanceInput && distanceRange) {
            const onDistChange = (val) => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                    state.distance = num;
                    distanceInput.value = num.toFixed(1);
                    distanceRange.value = num;
                    this.playThrottledTick();
                    this.highlightActivePreset('distancePresets', num);
                    this.recalculate();
                }
            };

            distanceRange.addEventListener('input', (e) => onDistChange(e.target.value));
            distanceInput.addEventListener('change', (e) => onDistChange(e.target.value));
        }

        // Distance Presets
        const distPresets = document.querySelectorAll('#distancePresets .preset-btn');
        distPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                distPresets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = state.unit === 'm'
                    ? parseFloat(btn.getAttribute('data-m'))
                    : parseFloat(btn.getAttribute('data-ft'));
                state.distance = val;
                if (distanceInput) distanceInput.value = val.toFixed(1);
                if (distanceRange) distanceRange.value = val;
                sound.playClick();
                this.recalculate();
            });
        });

        // Paces Calculator
        const pacesInput = document.getElementById('pacesInput');
        const pacesApplyBtn = document.getElementById('pacesApplyBtn');
        if (pacesApplyBtn && pacesInput) {
            pacesApplyBtn.addEventListener('click', () => {
                const paces = parseInt(pacesInput.value, 10);
                if (!isNaN(paces) && paces > 0) {
                    const paceDist = state.unit === 'm' ? paces * 0.75 : paces * 2.46;
                    state.distance = parseFloat(paceDist.toFixed(1));
                    if (distanceInput) distanceInput.value = state.distance.toFixed(1);
                    if (distanceRange) distanceRange.value = state.distance;
                    sound.playClick();
                    this.recalculate();
                }
            });
        }

        // --- Step 2: Tilt Angle Inputs ---
        const angleInput = document.getElementById('angleInput');
        const angleRange = document.getElementById('angleRange');

        if (angleInput && angleRange) {
            const onAngleChange = (val) => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0 && num < 89) {
                    state.angle = num;
                    angleInput.value = num.toFixed(1);
                    angleRange.value = num;
                    this.playThrottledTick();
                    this.updateProtractorStringHelper();
                    this.recalculate();
                }
            };

            angleRange.addEventListener('input', (e) => onAngleChange(e.target.value));
            angleInput.addEventListener('change', (e) => onAngleChange(e.target.value));
        }

        // Angle Presets
        const anglePresets = document.querySelectorAll('.step-card:nth-of-type(2) .preset-btn');
        anglePresets.forEach(btn => {
            btn.addEventListener('click', () => {
                anglePresets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const deg = parseFloat(btn.getAttribute('data-angle'));
                state.angle = deg;
                if (angleInput) angleInput.value = deg.toFixed(1);
                if (angleRange) angleRange.value = deg;
                this.updateProtractorStringHelper();
                sound.playClick();
                this.recalculate();
            });
        });

        // Protractor String Helper Input
        const stringAngleInput = document.getElementById('stringAngleInput');
        if (stringAngleInput) {
            stringAngleInput.addEventListener('input', (e) => {
                const stringVal = parseFloat(e.target.value);
                if (!isNaN(stringVal) && stringVal >= 0 && stringVal <= 90) {
                    const calculatedTilt = Math.abs(90 - stringVal);
                    state.angle = calculatedTilt;
                    if (angleInput) angleInput.value = calculatedTilt.toFixed(1);
                    if (angleRange) angleRange.value = calculatedTilt;
                    const convText = document.getElementById('stringConversionText');
                    if (convText) {
                        convText.textContent = `➔ Tilt is 90° − ${stringVal}° = ${calculatedTilt.toFixed(1)}°`;
                    }
                    this.recalculate();
                }
            });
        }

        // --- Step 3: Eye Height Inputs ---
        const eyeInput = document.getElementById('eyeHeightInput');
        const eyeRange = document.getElementById('eyeHeightRange');

        if (eyeInput && eyeRange) {
            const onEyeChange = (val) => {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                    state.eyeHeight = num;
                    eyeInput.value = num.toFixed(2);
                    eyeRange.value = num;
                    this.playThrottledTick();
                    this.recalculate();
                }
            };

            eyeRange.addEventListener('input', (e) => onEyeChange(e.target.value));
            eyeInput.addEventListener('change', (e) => onEyeChange(e.target.value));
        }

        // Eye Presets
        const eyePresets = document.querySelectorAll('#eyePresets .preset-btn');
        eyePresets.forEach(btn => {
            btn.addEventListener('click', () => {
                eyePresets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = state.unit === 'm'
                    ? parseFloat(btn.getAttribute('data-eye-m'))
                    : parseFloat(btn.getAttribute('data-eye-ft'));
                state.eyeHeight = val;
                if (eyeInput) eyeInput.value = val.toFixed(2);
                if (eyeRange) eyeRange.value = val;
                sound.playClick();
                this.recalculate();
            });
        });

        // --- Result Actions ---
        const celebrateBtn = document.getElementById('celebrateBtn');
        if (celebrateBtn) {
            celebrateBtn.addEventListener('click', () => {
                if (this.confetti) {
                    const rect = celebrateBtn.getBoundingClientRect();
                    this.confetti.burst(rect.left + rect.width / 2, rect.top);
                }
                sound.playSuccess();
            });
        }

        const copyBtn = document.getElementById('copyResultBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyResult());
        }

        // --- Educational Guide Modal ---
        const guideModal = document.getElementById('guideModal');
        const guideModalBtn = document.getElementById('guideModalBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const modalGotItBtn = document.getElementById('modalGotItBtn');

        if (guideModal && guideModalBtn && closeModalBtn) {
            const openModal = () => {
                guideModal.classList.add('open');
                sound.playClick();
            };
            const closeModal = () => {
                guideModal.classList.remove('open');
                sound.playClick();
            };

            guideModalBtn.addEventListener('click', openModal);
            closeModalBtn.addEventListener('click', closeModal);
            if (modalGotItBtn) modalGotItBtn.addEventListener('click', closeModal);

            guideModal.addEventListener('click', (e) => {
                if (e.target === guideModal) {
                    closeModal();
                }
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && guideModal.classList.contains('open')) {
                    closeModal();
                }
            });
        }
    }

    setUnit(newUnit) {
        if (state.unit === newUnit) return;
        const oldUnit = state.unit;
        state.unit = newUnit;

        // Toggle button states
        const btnM = document.getElementById('unitBtnM');
        const btnFt = document.getElementById('unitBtnFt');
        if (btnM && btnFt) {
            btnM.classList.toggle('active', newUnit === 'm');
            btnFt.classList.toggle('active', newUnit === 'ft');
        }

        // Convert values
        if (newUnit === 'ft') {
            state.distance = parseFloat(MathEngine.mToFt(state.distance).toFixed(1));
            state.eyeHeight = parseFloat(MathEngine.mToFt(state.eyeHeight).toFixed(2));
        } else {
            state.distance = parseFloat(MathEngine.ftToM(state.distance).toFixed(1));
            state.eyeHeight = parseFloat(MathEngine.ftToM(state.eyeHeight).toFixed(2));
        }

        // Update slider bounds & unit labels
        this.updateSliderBoundsForUnit(newUnit);

        // Update inputs
        const dInput = document.getElementById('distanceInput');
        const dRange = document.getElementById('distanceRange');
        if (dInput) dInput.value = state.distance.toFixed(1);
        if (dRange) dRange.value = state.distance;

        const eyeInput = document.getElementById('eyeHeightInput');
        const eyeRange = document.getElementById('eyeHeightRange');
        if (eyeInput) eyeInput.value = state.eyeHeight.toFixed(2);
        if (eyeRange) eyeRange.value = state.eyeHeight;

        // Update unit labels on UI
        document.querySelectorAll('.unit-label').forEach(el => {
            el.textContent = newUnit;
        });

        // Update Preset button texts
        this.updatePresetLabels(newUnit);

        // Update visualizer unit
        if (this.visualizer) {
            this.visualizer.setUnit(newUnit);
        }

        sound.playSnap();
        this.recalculate();
    }

    updateSliderBoundsForUnit(unit) {
        const dRange = document.getElementById('distanceRange');
        const dInput = document.getElementById('distanceInput');
        const eyeRange = document.getElementById('eyeHeightRange');
        const eyeInput = document.getElementById('eyeHeightInput');

        if (unit === 'ft') {
            if (dRange) { dRange.min = '3'; dRange.max = '160'; dRange.step = '1'; }
            if (dInput) { dInput.min = '3'; dInput.max = '300'; dInput.step = '1'; }
            if (eyeRange) { eyeRange.min = '2.5'; eyeRange.max = '7.5'; eyeRange.step = '0.1'; }
            if (eyeInput) { eyeInput.min = '1.5'; eyeInput.max = '9.0'; eyeInput.step = '0.1'; }
        } else {
            if (dRange) { dRange.min = '1.5'; dRange.max = '50'; dRange.step = '0.5'; }
            if (dInput) { dInput.min = '1.0'; dInput.max = '100'; dInput.step = '0.5'; }
            if (eyeRange) { eyeRange.min = '0.8'; eyeRange.max = '2.4'; eyeRange.step = '0.05'; }
            if (eyeInput) { eyeInput.min = '0.5'; eyeInput.max = '3.0'; eyeInput.step = '0.05'; }
        }
    }

    updatePresetLabels(unit) {
        const distPresets = document.querySelectorAll('#distancePresets .preset-btn');
        distPresets.forEach(btn => {
            const mVal = btn.getAttribute('data-m');
            const ftVal = btn.getAttribute('data-ft');
            btn.textContent = unit === 'm' ? `${mVal} m` : `${ftVal} ft`;
        });

        const eyePresets = document.querySelectorAll('#eyePresets .preset-btn');
        eyePresets.forEach(btn => {
            const mVal = btn.getAttribute('data-eye-m');
            const ftVal = btn.getAttribute('data-eye-ft');
            if (mVal === '0.80') btn.textContent = unit === 'm' ? 'Low (0.8m)' : 'Low (2.6ft)';
            if (mVal === '1.20') btn.textContent = unit === 'm' ? 'Standard (1.2m)' : 'Standard (3.9ft)';
            if (mVal === '1.50') btn.textContent = unit === 'm' ? 'High (1.5m)' : 'High (4.9ft)';
        });
    }

    highlightActivePreset(containerId, value) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const btns = container.querySelectorAll('.preset-btn');
        btns.forEach(btn => {
            const targetVal = state.unit === 'm'
                ? parseFloat(btn.getAttribute('data-m'))
                : parseFloat(btn.getAttribute('data-ft'));
            btn.classList.toggle('active', Math.abs(targetVal - value) < 0.2);
        });
    }

    updateProtractorStringHelper() {
        const stringVal = Math.round(90 - state.angle);
        const stringInput = document.getElementById('stringAngleInput');
        const convText = document.getElementById('stringConversionText');

        if (stringInput && document.activeElement !== stringInput) {
            stringInput.value = stringVal;
        }
        if (convText) {
            convText.textContent = `➔ Tilt: 90° − ${stringVal}° = ${state.angle.toFixed(1)}°`;
        }
    }

    playThrottledTick() {
        const now = performance.now();
        if (now - this.lastSoundTick > 70) {
            sound.playTick(520);
            this.lastSoundTick = now;
        }
    }

    recalculate(renderVisualizer = true) {
        let calcResult = null;

        // 1. Calculate via Rust WASM if available, else JS math
        if (this.wasm && state.wasmLoaded) {
            try {
                calcResult = this.wasm.calculate_direct(state.distance, state.angle, state.eyeHeight);
            } catch (e) {
                console.warn('WASM calculation fallback:', e);
                calcResult = MathEngine.calculateDirect(state.distance, state.angle, state.eyeHeight);
            }
        } else {
            calcResult = MathEngine.calculateDirect(state.distance, state.angle, state.eyeHeight);
        }

        const d = calcResult.distance;
        const theta = calcResult.angle_deg;
        const hEye = calcResult.eye_height;
        const h = calcResult.h;
        const totalH = calcResult.total_height;
        const hyp = calcResult.hypotenuse;
        const eyeRatio = calcResult.eye_ratio;
        const riseRatio = Math.max(0, 100 - eyeRatio);

        const u = state.unit;
        const altUnit = u === 'm' ? 'ft' : 'm';
        const altTotal = u === 'm' ? MathEngine.mToFt(totalH).toFixed(1) : MathEngine.ftToM(totalH).toFixed(1);

        // Friendly target nouns & icons
        const targetNames = {
            tree: { icon: '🌲', noun: 'tree', fullNoun: 'tree' },
            building: { icon: '🏢', noun: 'building', fullNoun: 'building' },
            flagpole: { icon: '🚩', noun: 'flagpole', fullNoun: 'flagpole' }
        };
        const targetInfo = targetNames[state.target] || targetNames.tree;

        // 2. Update Result Card DOM
        const resultTitle = document.getElementById('resultTitle');
        if (resultTitle) {
            resultTitle.innerHTML = `${targetInfo.icon} Height: <strong>${totalH.toFixed(1)} ${u}</strong>`;
        }

        const resultAlt = document.getElementById('resultAltUnit');
        if (resultAlt) {
            resultAlt.textContent = `(${altTotal} ${altUnit})`;
        }

        // Stacked Bar breakdown
        const barRise = document.getElementById('barRise');
        const barEye = document.getElementById('barEye');
        if (barRise && barEye) {
            barRise.style.width = `${riseRatio.toFixed(1)}%`;
            barEye.style.width = `${eyeRatio.toFixed(1)}%`;
        }

        const riseText = document.getElementById('riseValueText');
        const eyeText = document.getElementById('eyeValueText');
        if (riseText) riseText.textContent = `${h.toFixed(1)} ${u} (${riseRatio.toFixed(0)}%)`;
        if (eyeText) eyeText.textContent = `${hEye.toFixed(1)} ${u} (${eyeRatio.toFixed(0)}%)`;

        // Equation Box
        const eqBox = document.getElementById('equationBox');
        if (eqBox) {
            eqBox.textContent = `${h.toFixed(1)} ${u} (rise) + ${hEye.toFixed(1)} ${u} (pillar) = ${totalH.toFixed(1)} ${u} total`;
        }

        // Sightline note
        const sightlineNote = document.getElementById('sightlineNote');
        if (sightlineNote) {
            sightlineNote.textContent = `Sightline (hypotenuse): ${hyp.toFixed(1)} ${u}`;
        }

        // 3. Update Visualizer Mini Status Bar
        const statusD = document.getElementById('statusDistance');
        const statusA = document.getElementById('statusAngle');
        const statusH = document.getElementById('statusHeight');
        if (statusD) statusD.textContent = `${d.toFixed(1)} ${u}`;
        if (statusA) statusA.textContent = `${theta.toFixed(1)}°`;
        if (statusH) statusH.textContent = `${totalH.toFixed(1)} ${u}`;

        // 4. Update Visualizer Canvas
        if (this.visualizer && renderVisualizer) {
            this.visualizer.updateData({
                distance: d,
                angle: theta,
                eyeHeight: hEye,
                h: h,
                totalHeight: totalH,
                hypotenuse: hyp
            });
        }
    }

    copyResult() {
        const u = state.unit;
        const calc = MathEngine.calculateDirect(state.distance, state.angle, state.eyeHeight);
        const text = `Height Explorer:\nTarget: ${state.target}\nDistance (d): ${calc.distance.toFixed(1)} ${u}\nAngle (θ): ${calc.angle_deg.toFixed(1)}°\nRise (h): ${calc.h.toFixed(1)} ${u}\nPillar (h_pillar): ${calc.eye_height.toFixed(1)} ${u}\nTotal Height: ${calc.total_height.toFixed(1)} ${u}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => this.showToast());
        } else {
            this.showToast();
        }
        sound.playClick();
    }

    showToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2600);
        }
    }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    const app = new HeightFinderApp();
    app.init();
});
