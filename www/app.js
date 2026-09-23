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

// Load saved pillar height if available
const savedPillar = parseFloat(localStorage.getItem('cli_pillar_h'));
if (!isNaN(savedPillar) && savedPillar > 0) {
    state.eyeHeight = savedPillar;
}

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
        this.bindPillarModal();
        this.updatePillarBadge();

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
                    this.recalculate();
                }
            };

            distanceRange.addEventListener('input', (e) => onDistChange(e.target.value));
            distanceInput.addEventListener('change', (e) => onDistChange(e.target.value));
        }

        // Inline Paces Helper
        const pacesInput = document.getElementById('pacesInput');
        const pacesApplyBtn = document.getElementById('pacesApplyBtn');
        const pacesPreview = document.getElementById('pacesPreviewText');

        const updatePacesPreview = () => {
            if (!pacesInput || !pacesPreview) return;
            const paces = parseInt(pacesInput.value, 10);
            if (!isNaN(paces) && paces > 0) {
                const paceDist = state.unit === 'm' ? paces * 0.75 : paces * 2.46;
                pacesPreview.textContent = `≈ ${paceDist.toFixed(1)} ${state.unit}`;
            }
        };

        if (pacesInput) {
            pacesInput.addEventListener('input', updatePacesPreview);
            updatePacesPreview();
        }

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

        // --- Visualizer Accordion Resize Hook ---
        const visAccordion = document.getElementById('visualizerAccordion');
        if (visAccordion) {
            visAccordion.addEventListener('toggle', () => {
                if (visAccordion.open && this.visualizer) {
                    setTimeout(() => this.visualizer.resize(), 60);
                }
            });
        }

        // --- Copy Result Action ---
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

    updatePillarBadge() {
        const btn = document.getElementById('pillarSettingsBtn');
        if (btn) {
            btn.innerHTML = `⚙ Pillar <span class="pillar-val">${state.eyeHeight.toFixed(2)} ${state.unit}</span>`;
        }
    }

    bindPillarModal() {
        const btn = document.getElementById('pillarSettingsBtn');
        const modal = document.getElementById('pillarModal');
        const closeBtn = document.getElementById('closePillarBtn');
        const saveBtn = document.getElementById('pillarSaveBtn');
        const input = document.getElementById('pillarModalInput');
        const range = document.getElementById('pillarModalRange');

        if (!btn || !modal) return;

        const syncModalUI = () => {
            if (input) input.value = state.eyeHeight.toFixed(2);
            if (range) range.value = state.eyeHeight;
            const presets = document.querySelectorAll('#pillarPresets .preset-btn');
            presets.forEach(p => {
                const val = state.unit === 'm'
                    ? parseFloat(p.getAttribute('data-eye-m'))
                    : parseFloat(p.getAttribute('data-eye-ft'));
                p.classList.toggle('active', Math.abs(val - state.eyeHeight) < 0.04);
            });
        };

        const openModal = () => {
            syncModalUI();
            modal.classList.add('open');
            sound.playClick();
        };

        const closeModal = (save = false) => {
            if (save && input) {
                const num = parseFloat(input.value);
                if (!isNaN(num) && num > 0) {
                    state.eyeHeight = num;
                    localStorage.setItem('cli_pillar_h', num.toString());
                    this.updatePillarBadge();
                    this.recalculate();
                }
            }
            modal.classList.remove('open');
            sound.playSnap();
        };

        btn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(false));
        if (saveBtn) saveBtn.addEventListener('click', () => closeModal(true));

        if (input && range) {
            input.addEventListener('change', (e) => {
                const num = parseFloat(e.target.value);
                if (!isNaN(num) && num > 0) {
                    range.value = num;
                    this.playThrottledTick();
                }
            });
            range.addEventListener('input', (e) => {
                const num = parseFloat(e.target.value);
                input.value = num.toFixed(2);
                this.playThrottledTick();
            });
        }

        const presets = document.querySelectorAll('#pillarPresets .preset-btn');
        presets.forEach(p => {
            p.addEventListener('click', () => {
                presets.forEach(x => x.classList.remove('active'));
                p.classList.add('active');
                const val = state.unit === 'm'
                    ? parseFloat(p.getAttribute('data-eye-m'))
                    : parseFloat(p.getAttribute('data-eye-ft'));
                if (input) input.value = val.toFixed(2);
                if (range) range.value = val;
                sound.playClick();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(true);
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                closeModal(false);
            }
        });
    }

    setUnit(newUnit) {
        if (state.unit === newUnit) return;
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

        localStorage.setItem('cli_pillar_h', state.eyeHeight.toString());
        this.updatePillarBadge();

        // Update slider bounds & unit labels
        this.updateSliderBoundsForUnit(newUnit);

        // Update inputs
        const dInput = document.getElementById('distanceInput');
        const dRange = document.getElementById('distanceRange');
        if (dInput) dInput.value = state.distance.toFixed(1);
        if (dRange) dRange.value = state.distance;

        const pInput = document.getElementById('pillarModalInput');
        const pRange = document.getElementById('pillarModalRange');
        if (pInput) pInput.value = state.eyeHeight.toFixed(2);
        if (pRange) pRange.value = state.eyeHeight;

        // Update unit labels on UI
        document.querySelectorAll('.unit-label').forEach(el => {
            el.textContent = newUnit;
        });

        // Update Preset button texts
        this.updatePresetLabels(newUnit);

        // Update inline paces preview
        const pacesInput = document.getElementById('pacesInput');
        const pacesPreview = document.getElementById('pacesPreviewText');
        if (pacesInput && pacesPreview) {
            const paces = parseInt(pacesInput.value, 10);
            if (!isNaN(paces) && paces > 0) {
                const paceDist = state.unit === 'm' ? paces * 0.75 : paces * 2.46;
                pacesPreview.textContent = `≈ ${paceDist.toFixed(1)} ${state.unit}`;
            }
        }

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
        const pRange = document.getElementById('pillarModalRange');
        const pInput = document.getElementById('pillarModalInput');

        if (unit === 'ft') {
            if (dRange) { dRange.min = '3'; dRange.max = '160'; dRange.step = '1'; }
            if (dInput) { dInput.min = '3'; dInput.max = '500'; dInput.step = '1'; }
            if (pRange) { pRange.min = '1.0'; pRange.max = '10.0'; pRange.step = '0.1'; }
            if (pInput) { pInput.min = '0.5'; pInput.max = '12.0'; pInput.step = '0.1'; }
        } else {
            if (dRange) { dRange.min = '1.5'; dRange.max = '50'; dRange.step = '0.5'; }
            if (dInput) { dInput.min = '1.0'; dInput.max = '500'; dInput.step = '0.5'; }
            if (pRange) { pRange.min = '0.4'; pRange.max = '3.0'; pRange.step = '0.05'; }
            if (pInput) { pInput.min = '0.2'; pInput.max = '3.5'; pInput.step = '0.05'; }
        }
    }

    updatePresetLabels(unit) {
        const pillarPresets = document.querySelectorAll('#pillarPresets .preset-btn');
        pillarPresets.forEach(btn => {
            const mVal = btn.getAttribute('data-eye-m');
            const ftVal = btn.getAttribute('data-eye-ft');
            if (mVal === '0.80') btn.textContent = unit === 'm' ? 'Low (0.8 m)' : 'Low (2.6 ft)';
            if (mVal === '1.20') btn.textContent = unit === 'm' ? 'Standard (1.2 m)' : 'Standard (3.9 ft)';
            if (mVal === '1.50') btn.textContent = unit === 'm' ? 'High (1.5 m)' : 'High (4.9 ft)';
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

        // 2. Update Result Card DOM
        const resultTitle = document.getElementById('resultTitle');
        if (resultTitle) {
            resultTitle.textContent = totalH.toFixed(1);
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
