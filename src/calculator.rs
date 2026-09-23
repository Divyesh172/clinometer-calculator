use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// Unit of measurement for distances and heights
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Unit {
    Meters,
    Centimeters,
    Feet,
    Inches,
}

impl Unit {
    /// Convert a value from this unit to standard meters
    pub fn to_meters(self, val: f64) -> f64 {
        match self {
            Unit::Meters => val,
            Unit::Centimeters => val * 0.01,
            Unit::Feet => val * 0.3048,
            Unit::Inches => val * 0.0254,
        }
    }

    /// Convert a value in standard meters into this unit
    pub fn from_meters(self, val_meters: f64) -> f64 {
        match self {
            Unit::Meters => val_meters,
            Unit::Centimeters => val_meters / 0.01,
            Unit::Feet => val_meters / 0.3048,
            Unit::Inches => val_meters / 0.0254,
        }
    }

    /// Convert a value from one unit to another
    pub fn convert(val: f64, from: Unit, to: Unit) -> f64 {
        let in_meters = from.to_meters(val);
        to.from_meters(in_meters)
    }

    pub fn symbol(&self) -> &'static str {
        match self {
            Unit::Meters => "m",
            Unit::Centimeters => "cm",
            Unit::Feet => "ft",
            Unit::Inches => "in",
        }
    }

    pub fn parse(s: &str) -> Result<Self, String> {
        match s.trim().to_lowercase().as_str() {
            "m" | "meter" | "meters" => Ok(Unit::Meters),
            "cm" | "centimeter" | "centimeters" => Ok(Unit::Centimeters),
            "ft" | "feet" | "foot" => Ok(Unit::Feet),
            "in" | "inch" | "inches" => Ok(Unit::Inches),
            other => Err(format!("Unknown unit '{}'. Valid: m, cm, ft, in", other)),
        }
    }
}

/// Convert a value between units specified by string code (e.g. "m", "ft", "cm", "in")
pub fn convert_units(val: f64, from_unit: &str, to_unit: &str) -> Result<f64, String> {
    let from = Unit::parse(from_unit)?;
    let to = Unit::parse(to_unit)?;
    Ok(Unit::convert(val, from, to))
}

/// Direct height calculation result formatted for real-world web visualization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DirectResult {
    pub distance: f64,
    pub angle_deg: f64,
    pub eye_height: f64,
    pub tan_val: f64,
    pub cos_val: f64,
    pub h: f64,
    pub total_height: f64,
    pub hypotenuse: f64,
    pub eye_ratio: f64,
}

/// Direct height calculation using horizontal distance, angle of elevation, and observer eye height
/// h = distance * tan(θ)
/// total_height = h + eye_height
/// hypotenuse = distance / cos(θ)
/// eye_ratio = (eye_height / total_height) * 100
pub fn calculate_direct(distance: f64, angle_deg: f64, eye_height: f64) -> DirectResult {
    let rad = angle_deg.to_radians();
    let tan_val = rad.tan();
    let cos_val = rad.cos();

    let h = distance * tan_val;
    let total_height = h + eye_height;
    let hypotenuse = if cos_val != 0.0 { distance / cos_val } else { 0.0 };
    let eye_ratio = if total_height > 0.0 { (eye_height / total_height) * 100.0 } else { 0.0 };

    DirectResult {
        distance,
        angle_deg,
        eye_height,
        tan_val,
        cos_val,
        h,
        total_height,
        hypotenuse,
        eye_ratio,
    }
}

/// Result of protractor plumb-line conversion (alpha string angle -> theta tilt angle)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProtractorResult {
    pub alpha: f64,
    pub theta: f64,
}

/// Convert protractor plumb-line angle α to true elevation tilt angle θ
/// When level, string hangs at 90°. Tilt θ = |90° - α|
pub fn calculate_protractor(alpha: f64) -> ProtractorResult {
    let theta = (90.0 - alpha).abs();
    ProtractorResult { alpha, theta }
}

/// Direct tilt angle calculation from protractor plumb-line reading
pub fn protractor_alpha_to_theta(alpha: f64) -> f64 {
    (90.0 - alpha).abs()
}

/// Inaccessible base triangulation result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InaccessibleResult {
    pub theta1_deg: f64,
    pub theta2_deg: f64,
    pub setback: f64,
    pub eye_height: f64,
    pub tan1: f64,
    pub tan2: f64,
    pub h: f64,
    pub total_height: f64,
    pub d1: f64,
    pub d2: f64,
    pub hyp1: f64,
    pub hyp2: f64,
    pub error: Option<String>,
}

/// Inaccessible base two-angle calculation
pub fn calculate_inaccessible(
    theta1_deg: f64,
    theta2_deg: f64,
    setback: f64,
    eye_height: f64,
) -> InaccessibleResult {
    if theta1_deg <= theta2_deg {
        return InaccessibleResult {
            theta1_deg,
            theta2_deg,
            setback,
            eye_height,
            tan1: 0.0,
            tan2: 0.0,
            h: 0.0,
            total_height: 0.0,
            d1: 0.0,
            d2: 0.0,
            hyp1: 0.0,
            hyp2: 0.0,
            error: Some("Angle at Station A (θ₁) must be greater than Station B (θ₂) because Station A is closer to the target.".into()),
        };
    }

    let rad1 = theta1_deg.to_radians();
    let rad2 = theta2_deg.to_radians();
    let tan1 = rad1.tan();
    let tan2 = rad2.tan();

    let h = (setback * tan1 * tan2) / (tan1 - tan2);
    let total_height = h + eye_height;
    let d1 = if tan1 != 0.0 { h / tan1 } else { 0.0 };
    let d2 = d1 + setback;
    let hyp1 = if rad1.cos() != 0.0 { d1 / rad1.cos() } else { 0.0 };
    let hyp2 = if rad2.cos() != 0.0 { d2 / rad2.cos() } else { 0.0 };

    InaccessibleResult {
        theta1_deg,
        theta2_deg,
        setback,
        eye_height,
        tan1,
        tan2,
        h,
        total_height,
        d1,
        d2,
        hyp1,
        hyp2,
        error: None,
    }
}

/// Result of direct height calculation with step-by-step mathematical derivation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DirectHeightResult {
    pub distance: f64,
    pub angle_deg: f64,
    pub angle_rad: f64,
    pub eye_height: f64,
    pub triangle_height: f64,
    pub total_height: f64,
    pub line_of_sight: f64,
    pub formula: String,
    pub steps: Vec<String>,
}

/// Direct height calculation using horizontal distance, angle of elevation, and observer eye height
/// Formula:
///   h_tri = d * tan(θ)
///   H_total = h_tri + h_eye
///   Line of sight (hypotenuse) L = d / cos(θ) = sqrt(d^2 + h_tri^2)
pub fn calculate_direct_height(
    distance: f64,
    angle_deg: f64,
    eye_height: f64,
) -> Result<DirectHeightResult, String> {
    if distance <= 0.0 {
        return Err("Horizontal distance must be strictly positive (> 0)".to_string());
    }
    if eye_height < 0.0 {
        return Err("Eye height cannot be negative".to_string());
    }
    if angle_deg <= -90.0 || angle_deg >= 90.0 {
        return Err("Angle of elevation must be between -90° and 90° non-inclusive".to_string());
    }

    let angle_rad = angle_deg * (PI / 180.0);
    let tan_theta = angle_rad.tan();
    let triangle_height = distance * tan_theta;
    let total_height = triangle_height + eye_height;
    let cos_theta = angle_rad.cos();
    let line_of_sight = (distance / cos_theta).abs();

    let steps = vec![
        format!(
            "Step 1: Convert angle from degrees to radians: θ = {:.4}° × (π / 180) = {:.6} rad",
            angle_deg, angle_rad
        ),
        format!(
            "Step 2: Calculate right-triangle opposite side: h_tri = d × tan(θ) = {:.4} × tan({:.4}°) = {:.4} × {:.6} = {:.4} m",
            distance, angle_deg, distance, tan_theta, triangle_height
        ),
        format!(
            "Step 3: Add observer eye height: H_total = h_tri + h_eye = {:.4} + {:.4} = {:.4} m",
            triangle_height, eye_height, total_height
        ),
        format!(
            "Step 4: Compute line of sight (hypotenuse): L = d / cos(θ) = {:.4} / cos({:.4}°) = {:.4} / {:.6} = {:.4} m (Check: √(d² + h_tri²) = √({:.2}² + {:.2}²) = {:.4} m)",
            distance, angle_deg, distance, cos_theta, line_of_sight, distance, triangle_height, line_of_sight
        ),
    ];

    Ok(DirectHeightResult {
        distance,
        angle_deg,
        angle_rad,
        eye_height,
        triangle_height,
        total_height,
        line_of_sight,
        formula: "H = d × tan(θ) + h_eye; L = d / cos(θ)".to_string(),
        steps,
    })
}

/// Result of inaccessible base two-angle calculation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InaccessibleBaseResult {
    pub angle1_deg: f64,
    pub angle2_deg: f64,
    pub baseline_distance: f64,
    pub eye_height: f64,
    pub triangle_height: f64,
    pub total_height: f64,
    pub distance1: f64,
    pub distance2: f64,
    pub line_of_sight1: f64,
    pub line_of_sight2: f64,
    pub formula: String,
    pub steps: Vec<String>,
}

/// Inaccessible base two-angle calculation (Two-point triangulation)
/// Station 1 has angle θ1 (closer to object, larger angle)
/// Station 2 has angle θ2 (farther from object, smaller angle)
/// Separation baseline between Station 1 and Station 2 is x.
///
/// Formulas:
///   d1 = (x * tan(θ2)) / (tan(θ1) - tan(θ2))
///   h_tri = d1 * tan(θ1) = (x * tan(θ1) * tan(θ2)) / (tan(θ1) - tan(θ2))
///   d2 = d1 + x
///   H_total = h_tri + h_eye
pub fn calculate_inaccessible_base(
    angle1_deg: f64,
    angle2_deg: f64,
    baseline_distance: f64,
    eye_height: f64,
) -> Result<InaccessibleBaseResult, String> {
    if baseline_distance <= 0.0 {
        return Err("Baseline distance x between stations must be positive (> 0)".to_string());
    }
    if eye_height < 0.0 {
        return Err("Eye height cannot be negative".to_string());
    }
    if angle1_deg <= 0.0 || angle1_deg >= 90.0 || angle2_deg <= 0.0 || angle2_deg >= 90.0 {
        return Err("Both elevation angles must be in the open interval (0°, 90°)".to_string());
    }

    // Identify closer and farther station
    let (theta1, theta2, was_swapped) = if angle1_deg >= angle2_deg {
        (angle1_deg, angle2_deg, false)
    } else {
        (angle2_deg, angle1_deg, true)
    };

    let delta_deg = theta1 - theta2;
    if delta_deg < 1e-4 {
        return Err("The two elevation angles cannot be identical; a non-zero difference is required for triangulation".to_string());
    }

    let rad1 = theta1 * (PI / 180.0);
    let rad2 = theta2 * (PI / 180.0);
    let tan1 = rad1.tan();
    let tan2 = rad2.tan();

    let denom = tan1 - tan2;
    if denom <= 0.0 {
        return Err("Invalid angle configuration: tan(θ1) - tan(θ2) must be positive".to_string());
    }

    let h_tri = (baseline_distance * tan1 * tan2) / denom;
    let d1 = h_tri / tan1;
    let d2 = d1 + baseline_distance;
    let total_height = h_tri + eye_height;

    let los1 = d1 / rad1.cos();
    let los2 = d2 / rad2.cos();

    let mut steps = Vec::new();
    if was_swapped {
        steps.push(format!(
            "Notice: Station angles re-ordered so θ1 is the closer station ({:.2}°) and θ2 is the farther station ({:.2}°).",
            theta1, theta2
        ));
    }
    steps.push(format!(
        "Step 1: Compute tangents: tan(θ1 = {:.2}°) = {:.6}, tan(θ2 = {:.2}°) = {:.6}",
        theta1, tan1, theta2, tan2
    ));
    steps.push(format!(
        "Step 2: Triangulation triangle height: h = (x × tan(θ1) × tan(θ2)) / (tan(θ1) - tan(θ2)) = ({:.4} × {:.6} × {:.6}) / ({:.6} - {:.6}) = {:.4} / {:.6} = {:.4} m",
        baseline_distance, tan1, tan2, tan1, tan2, baseline_distance * tan1 * tan2, denom, h_tri
    ));
    steps.push(format!(
        "Step 3: Distance to closer Station 1: d1 = h / tan(θ1) = {:.4} / {:.6} = {:.4} m",
        h_tri, tan1, d1
    ));
    steps.push(format!(
        "Step 4: Distance to farther Station 2: d2 = d1 + x = {:.4} + {:.4} = {:.4} m",
        d1, baseline_distance, d2
    ));
    steps.push(format!(
        "Step 5: Add eye height: H_total = h + h_eye = {:.4} + {:.4} = {:.4} m",
        h_tri, eye_height, total_height
    ));
    steps.push(format!(
        "Step 6: Line of sight: Station 1 L1 = {:.4} m, Station 2 L2 = {:.4} m",
        los1, los2
    ));

    Ok(InaccessibleBaseResult {
        angle1_deg: theta1,
        angle2_deg: theta2,
        baseline_distance,
        eye_height,
        triangle_height: h_tri,
        total_height,
        distance1: d1,
        distance2: d2,
        line_of_sight1: los1,
        line_of_sight2: los2,
        formula: "h = (x × tan(θ1) × tan(θ2)) / (tan(θ1) - tan(θ2)); d1 = h / tan(θ1); H = h + h_eye".to_string(),
        steps,
    })
}

/// Result of DIY protractor plumb-line conversion
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProtractorConversionResult {
    pub plumb_angle_deg: f64,
    pub elevation_angle_deg: f64,
    pub explanation: String,
    pub steps: Vec<String>,
}

/// Convert DIY protractor plumb-line reading α to true elevation angle θ
/// Protractor has 90° straight down when level.
/// When tilted up or down, the plumb line reads α.
/// Elevation angle θ = |90.0 - α|
pub fn convert_protractor_plumb_angle(plumb_angle_deg: f64) -> Result<ProtractorConversionResult, String> {
    if plumb_angle_deg < 0.0 || plumb_angle_deg > 180.0 {
        return Err("Protractor scale reading must be within 0° to 180°".to_string());
    }

    let elevation_angle = (90.0 - plumb_angle_deg).abs();

    let explanation = if (plumb_angle_deg - 90.0).abs() < 1e-4 {
        "Level line of sight: Protractor reads exactly 90°, so elevation angle is 0.0° (perfect horizon).".to_string()
    } else if plumb_angle_deg < 90.0 {
        format!(
            "Tilted upward: Protractor reads {:.2}°. True elevation angle θ = 90.0° - {:.2}° = {:.2}°.",
            plumb_angle_deg, plumb_angle_deg, elevation_angle
        )
    } else {
        format!(
            "Tilted upward (reverse scale): Protractor reads {:.2}°. True elevation angle θ = {:.2}° - 90.0° = {:.2}°.",
            plumb_angle_deg, plumb_angle_deg, elevation_angle
        )
    };

    let steps = vec![
        format!("Step 1: Read plumb-line indicator angle on protractor scale: α = {:.2}°", plumb_angle_deg),
        "Step 2: Recognize the 90° datum corresponds to a horizontal line of sight (plumb line hanging perpendicular to sightline).".to_string(),
        format!("Step 3: Apply conversion formula: θ = |90.0° - α| = |90.0° - {:.2}°| = {:.2}°", plumb_angle_deg, elevation_angle),
    ];

    Ok(ProtractorConversionResult {
        plumb_angle_deg,
        elevation_angle_deg: elevation_angle,
        explanation,
        steps,
    })
}

/// Convert true elevation angle θ to expected protractor plumb-line angle α
pub fn elevation_to_protractor_plumb(elevation_angle_deg: f64) -> Result<f64, String> {
    if elevation_angle_deg < 0.0 || elevation_angle_deg >= 90.0 {
        return Err("Elevation angle must be in [0°, 90°)".to_string());
    }
    Ok(90.0 - elevation_angle_deg)
}

/// Result of angle of depression calculation (cliff / clifftop observer looking down)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DepressionResult {
    pub cliff_height: f64,
    pub eye_height: f64,
    pub total_elevation: f64,
    pub angle_dep_deg: f64,
    pub horizontal_distance: f64,
    pub line_of_sight: f64,
    pub formula: String,
    pub steps: Vec<String>,
}

/// Calculate horizontal distance and line of sight from clifftop looking down at depression angle θ_dep
/// Total eye elevation: E = H_cliff + h_eye
/// Horizontal distance: d = E / tan(θ_dep)
/// Line of sight: L = E / sin(θ_dep) = sqrt(d^2 + E^2)
pub fn calculate_depression(
    cliff_height: f64,
    eye_height: f64,
    angle_dep_deg: f64,
) -> Result<DepressionResult, String> {
    if cliff_height < 0.0 || eye_height < 0.0 {
        return Err("Cliff height and eye height must be non-negative".to_string());
    }
    if angle_dep_deg <= 0.0 || angle_dep_deg >= 90.0 {
        return Err("Angle of depression must be in the open interval (0°, 90°)".to_string());
    }

    let total_elevation = cliff_height + eye_height;
    if total_elevation <= 0.0 {
        return Err("Total elevation (cliff + eye) must be strictly positive".to_string());
    }

    let rad = angle_dep_deg * (PI / 180.0);
    let tan_dep = rad.tan();
    let sin_dep = rad.sin();

    let horizontal_distance = total_elevation / tan_dep;
    let line_of_sight = total_elevation / sin_dep;

    let steps = vec![
        format!(
            "Step 1: Compute total elevation above target: E = H_cliff + h_eye = {:.2} + {:.2} = {:.2} m",
            cliff_height, eye_height, total_elevation
        ),
        format!(
            "Step 2: Convert depression angle to radians: θ_dep = {:.2}° ({:.6} rad)",
            angle_dep_deg, rad
        ),
        format!(
            "Step 3: Calculate horizontal distance: d = E / tan(θ_dep) = {:.2} / tan({:.2}°) = {:.2} / {:.6} = {:.4} m",
            total_elevation, angle_dep_deg, total_elevation, tan_dep, horizontal_distance
        ),
        format!(
            "Step 4: Compute direct line of sight: L = E / sin(θ_dep) = {:.2} / {:.6} = {:.4} m (Check: √(d² + E²) = √({:.2}² + {:.2}²) = {:.4} m)",
            total_elevation, sin_dep, line_of_sight, horizontal_distance, total_elevation, line_of_sight
        ),
    ];

    Ok(DepressionResult {
        cliff_height,
        eye_height,
        total_elevation,
        angle_dep_deg,
        horizontal_distance,
        line_of_sight,
        formula: "d = (H_cliff + h_eye) / tan(θ_dep); L = (H_cliff + h_eye) / sin(θ_dep)".to_string(),
        steps,
    })
}

/// Result of inverse distance calculation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InverseDistanceResult {
    pub target_height: f64,
    pub angle_deg: f64,
    pub eye_height: f64,
    pub triangle_height: f64,
    pub distance: f64,
    pub line_of_sight: f64,
    pub steps: Vec<String>,
}

/// Given target height H, angle of elevation θ, and observer eye height h_eye, calculate required distance d
/// Formula: d = (H - h_eye) / tan(θ)
pub fn solve_distance(
    target_height: f64,
    angle_deg: f64,
    eye_height: f64,
) -> Result<InverseDistanceResult, String> {
    let triangle_height = target_height - eye_height;
    if triangle_height <= 0.0 {
        return Err("Target height must be greater than eye height for positive elevation".to_string());
    }
    if angle_deg <= 0.0 || angle_deg >= 90.0 {
        return Err("Angle of elevation must be in the open interval (0°, 90°)".to_string());
    }

    let rad = angle_deg * (PI / 180.0);
    let tan_theta = rad.tan();
    let distance = triangle_height / tan_theta;
    let line_of_sight = distance / rad.cos();

    let steps = vec![
        format!("Step 1: Calculate triangle height above eye level: h_tri = H - h_eye = {:.4} - {:.4} = {:.4} m", target_height, eye_height, triangle_height),
        format!("Step 2: Invert trigonometric formula: d = h_tri / tan(θ) = {:.4} / tan({:.2}°) = {:.4} / {:.6} = {:.4} m", triangle_height, angle_deg, triangle_height, tan_theta, distance),
        format!("Step 3: Line of sight: L = d / cos(θ) = {:.4} m", line_of_sight),
    ];

    Ok(InverseDistanceResult {
        target_height,
        angle_deg,
        eye_height,
        triangle_height,
        distance,
        line_of_sight,
        steps,
    })
}

/// Result of inverse angle calculation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InverseAngleResult {
    pub target_height: f64,
    pub distance: f64,
    pub eye_height: f64,
    pub triangle_height: f64,
    pub angle_deg: f64,
    pub angle_rad: f64,
    pub line_of_sight: f64,
    pub steps: Vec<String>,
}

/// Given target height H, horizontal distance d, and observer eye height h_eye, calculate elevation angle θ
/// Formula: θ = atan((H - h_eye) / d) * (180 / π)
pub fn solve_angle(
    target_height: f64,
    distance: f64,
    eye_height: f64,
) -> Result<InverseAngleResult, String> {
    if distance <= 0.0 {
        return Err("Horizontal distance must be strictly positive (> 0)".to_string());
    }
    let triangle_height = target_height - eye_height;
    if triangle_height <= 0.0 {
        return Err("Target height must be greater than eye height".to_string());
    }

    let ratio = triangle_height / distance;
    let angle_rad = ratio.atan();
    let angle_deg = angle_rad * (180.0 / PI);
    let line_of_sight = (distance * distance + triangle_height * triangle_height).sqrt();

    let steps = vec![
        format!("Step 1: Calculate triangle height: h_tri = H - h_eye = {:.4} - {:.4} = {:.4} m", target_height, eye_height, triangle_height),
        format!("Step 2: Find ratio opposite/adjacent: tan(θ) = h_tri / d = {:.4} / {:.4} = {:.6}", triangle_height, distance, ratio),
        format!("Step 3: Invert via arctangent: θ = atan({:.6}) = {:.6} rad = {:.4}°", ratio, angle_rad, angle_deg),
        format!("Step 4: Line of sight: L = √(d² + h_tri²) = √({:.2}² + {:.2}²) = {:.4} m", distance, triangle_height, line_of_sight),
    ];

    Ok(InverseAngleResult {
        target_height,
        distance,
        eye_height,
        triangle_height,
        angle_deg,
        angle_rad,
        line_of_sight,
        steps,
    })
}
