pub mod calculator;
pub mod missions;

use wasm_bindgen::prelude::*;
pub use calculator::{DirectResult, InaccessibleResult, ProtractorResult};

/// Calculate direct height from horizontal distance, angle of elevation (degrees), and observer eye height.
/// Returns a JSON-serializable DirectResult object.
#[wasm_bindgen]
pub fn calculate_direct(distance: f64, angle_deg: f64, eye_height: f64) -> Result<JsValue, JsValue> {
    let res = calculator::calculate_direct(distance, angle_deg, eye_height);
    serde_wasm_bindgen::to_value(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Convert protractor plumb-line angle α to true elevation tilt angle θ (|90.0 - α|).
/// Returns a JSON-serializable ProtractorResult object containing alpha and theta.
#[wasm_bindgen]
pub fn calculate_protractor(alpha: f64) -> Result<JsValue, JsValue> {
    let res = calculator::calculate_protractor(alpha);
    serde_wasm_bindgen::to_value(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Helper to get true elevation tilt angle θ directly as f64 from protractor string angle α.
#[wasm_bindgen]
pub fn calculate_protractor_tilt(alpha: f64) -> f64 {
    calculator::protractor_alpha_to_theta(alpha)
}

/// Convert measurement values between supported units: "m", "cm", "ft", "in".
#[wasm_bindgen]
pub fn convert_units(val: f64, from_unit: &str, to_unit: &str) -> Result<f64, JsValue> {
    calculator::convert_units(val, from_unit, to_unit)
        .map_err(|e| JsValue::from_str(&e))
}

/// Two-point triangulation calculation for inaccessible base.
#[wasm_bindgen]
pub fn calculate_inaccessible(
    theta1_deg: f64,
    theta2_deg: f64,
    setback: f64,
    eye_height: f64,
) -> Result<JsValue, JsValue> {
    let res = calculator::calculate_inaccessible(theta1_deg, theta2_deg, setback, eye_height);
    serde_wasm_bindgen::to_value(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Angle of depression calculation from observer altitude looking downward.
#[wasm_bindgen]
pub fn calculate_depression(altitude: f64, depression_angle_deg: f64) -> f64 {
    let rad = depression_angle_deg.to_radians();
    let tan_val = rad.tan();
    if tan_val != 0.0 {
        altitude / tan_val
    } else {
        0.0
    }
}
