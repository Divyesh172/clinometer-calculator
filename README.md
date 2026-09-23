# 🌲 Clinometer Real-World Height Finder

A warm, friendly, single-page real-world height finder and trigonometric math tool that answers the timeless outdoor question:
> **"How tall is that tree, building, or flagpole without climbing it?"**

Powered by high-precision **Rust + WebAssembly** with an instant JavaScript mathematical fallback, dynamic interactive 2D canvas visualization, and celebratory tactile feedback.

[![Netlify Status](https://img.shields.io/badge/Live%20Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://clinometer-height-finder.netlify.app)

**🌐 Live on Netlify:** [https://clinometer-height-finder.netlify.app](https://clinometer-height-finder.netlify.app)

---

## 🌟 Features

- **Single-Page Real-World Height Finder**:
  - Direct calculation of height above eye level: $h = d \cdot \tan(\theta)$
  - Total ground height including observer eye height: $H = h + h_{\text{eye}}$
  - Direct line-of-sight distance (hypotenuse): $L = \frac{d}{\cos(\theta)} = \sqrt{d^2 + h^2}$
- **Unit Toggle (Meters & Feet)**:
  - Instant live switching between Metric (`m`) and Imperial (`ft`) with automatic conversion of distances and eye heights.
- **Convenient Real-World Presets**:
  - Distance quick presets: `10 m`, `15 m`, `20 m`, `30 m` (or `30 ft`, `50 ft`, `65 ft`, `100 ft`).
  - Eye-height presets: 🧒 Kid (`1.20 m` / `3.9 ft`), 👤 Adult (`1.60 m` / `5.2 ft`), 🦒 Tall (`1.80 m` / `5.9 ft`).
- **Interactive 2D Scene Visualizer**:
  - Visualizes the surveyor, sightline, right triangle, ground distance, and eye-level horizon plane.
  - Three target themes: 🌲 **Tall Tree**, 🏢 **Building / Tower**, and 🚩 **School Flagpole**.
  - Interactive canvas drag handles to adjust distance and elevation angle directly on the canvas.
- **DIY Protractor Plumb-Line Helper**:
  - Convert readings from a homemade protractor clinometer (drinking straw + washer on a string).
  - Automatically computes the true tilt angle: $\theta = |90^\circ - \alpha|$.
- **Visual Breakdown & Celebrations**:
  - Proportional stacked bar illustrating the triangle rise vs. observer eye level.
  - Confetti burst celebration and procedural Web Audio acoustic cues.
- **Facilitator & Field Guide**:
  - Embedded guide modal explaining the right-triangle math, common surveying mistakes (e.g. forgetting eye height), and step-by-step instructions for building a DIY clinometer.

---

## 📐 The Trigonometric Math

When looking at the top of an object from horizontal distance $d$ at elevation angle $\theta$:

1. **Triangle Opposite Leg (Rise above eyes)**:
   $$h = d \cdot \tan(\theta)$$

2. **Total Ground Height**:
   $$H_{\text{total}} = h + h_{\text{eye}} = d \cdot \tan(\theta) + h_{\text{eye}}$$

3. **Line of Sight (Hypotenuse)**:
   $$L = \frac{d}{\cos(\theta)} = \sqrt{d^2 + h^2}$$

4. **DIY Protractor Plumb Line Conversion**:
   When held horizontal, a plumb line hangs straight down at $90^\circ$. As the sightline tilts upward by $\theta$, the string reading $\alpha$ shifts:
   $$\theta = |90^\circ - \alpha|$$

---

## ⚡ Rust & WebAssembly Architecture

The core trigonometric calculations are implemented in Rust for high numerical precision and compiled to WebAssembly via `wasm-pack`:

- `calculate_direct(distance, angle_deg, eye_height)`: Computes elevation height, ground height, hypotenuse line of sight, and eye ratio.
- `calculate_protractor(alpha)`: Converts protractor plumb-line angle $\alpha$ to true elevation tilt angle $\theta$.
- `calculate_protractor_tilt(alpha)`: Float helper returning $\theta = |90^\circ - \alpha|$.
- `convert_units(val, from_unit, to_unit)`: Performs unit conversions between `m`, `cm`, `ft`, and `in`.
- `calculate_inaccessible(theta1, theta2, setback, eye_height)`: Two-point triangulation solver.
- `calculate_depression(altitude, angle_dep)`: Clifftop depression angle solver.

### Running Cargo Tests
```powershell
cargo test
```
All unit and integration tests run under `tests/clinometer_tests.rs`.

### Compiling WebAssembly
```powershell
wasm-pack build --target web --out-dir www/pkg
```
The output `www/pkg` files are loaded by `www/app.js` using standard ES module dynamic imports.

---

## 🚀 Quick Start & Local Server

### 1. Launch the Local Server
Run `serve.py` from the project directory:
```powershell
python serve.py
```
This starts an HTTP server on port **8082** with WebAssembly MIME type support (`application/wasm`) and opens `http://localhost:8082` in your default web browser.

---

## 📁 Project Structure

```
clinometer-calculator/
├── Cargo.toml               # Rust package definition & wasm-bindgen dependencies
├── src/
│   ├── lib.rs               # WebAssembly entrypoint & exposed wasm-bindgen API
│   ├── calculator.rs        # Trigonometric core, unit conversions & solvers
│   └── missions.rs          # Challenge & triangulation evaluation structures
├── tests/
│   └── clinometer_tests.rs  # Automated cargo test suite (13 passing tests)
├── serve.py                 # Local Python HTTP server (Port 8082, UTF-8, no-cache)
├── README.md                # Project documentation & mathematical principles
└── www/
    ├── index.html           # Warm, accessible single-page height calculator UI
    ├── styles.css           # Clean modern theme with responsive layouts
    ├── app.js               # Application orchestrator, WASM bridge & state
    ├── visualizer.js        # HTML5 canvas scene visualizer
    ├── protractor.js        # DIY protractor simulation & angle graphics
    ├── sound.js             # Web Audio API sound synthesizer
    ├── confetti.js          # Particle celebration engine
    └── pkg/                 # Compiled WebAssembly package (WASM + JS glue)
```
