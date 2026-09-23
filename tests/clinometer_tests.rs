use clinometer_calculator::calculator::*;
use clinometer_calculator::missions::*;

const EPSILON: f64 = 0.015; // 1.5 cm tolerance for rounding checks

#[test]
fn test_mission_1_flagpole_direct_calculation() {
    // Mission 1: d=12.0m, θ=45.0°, h_eye=1.5m -> H=13.50m, L=16.97m
    let d = 12.0;
    let theta = 45.0;
    let h_eye = 1.5;

    let res = calculate_direct_height(d, theta, h_eye).expect("Calculation should succeed");
    assert!((res.triangle_height - 12.0).abs() < 1e-4);
    assert!((res.total_height - 13.50).abs() < EPSILON);
    assert!((res.line_of_sight - 16.97).abs() < EPSILON);
    assert_eq!(res.steps.len(), 4);
}

#[test]
fn test_mission_2_ancient_oak_plumb_line() {
    // Mission 2: d=22.5m, α=58.0° (θ=32.0°), h_eye=1.65m -> H=15.71m, L=26.53m
    let d = 22.5;
    let plumb_alpha = 58.0;
    let h_eye = 1.65;

    let conv = convert_protractor_plumb_angle(plumb_alpha).expect("Plumb conversion");
    assert!((conv.elevation_angle_deg - 32.0).abs() < 1e-4);

    let res = calculate_direct_height(d, conv.elevation_angle_deg, h_eye).expect("Direct calculation");
    assert!((res.total_height - 15.71).abs() < EPSILON);
    assert!((res.line_of_sight - 26.53).abs() < EPSILON);
}

#[test]
fn test_mission_3_river_watchtower_inaccessible_base() {
    // Mission 3: θ1=41.0°, θ2=27.0°, setback x=14.0m, h_eye=1.6m -> H=18.84m, d1=19.83m
    let theta1 = 41.0;
    let theta2 = 27.0;
    let x = 14.0;
    let h_eye = 1.6;

    let res = calculate_inaccessible_base(theta1, theta2, x, h_eye).expect("Inaccessible base calculation");
    assert!((res.distance1 - 19.83).abs() < EPSILON);
    assert!((res.total_height - 18.84).abs() < EPSILON);
    assert!((res.distance2 - (19.83 + 14.0)).abs() < EPSILON);
}

#[test]
fn test_mission_4_coast_guard_cliff_depression() {
    // Mission 4: H_cliff=42.0m, h_eye=1.7m (total 43.7m), θ_dep=16.5° -> d=147.53m, L=153.86m
    let h_cliff = 42.0;
    let h_eye = 1.7;
    let theta_dep = 16.5;

    let res = calculate_depression(h_cliff, h_eye, theta_dep).expect("Depression calculation");
    assert!((res.total_elevation - 43.7).abs() < 1e-4);
    assert!((res.horizontal_distance - 147.53).abs() < EPSILON);
    assert!((res.line_of_sight - 153.86).abs() < EPSILON);
}

#[test]
fn test_inaccessible_base_auto_order_swap() {
    // If user inputs station 2 angle first (27.0°) and station 1 angle second (41.0°),
    // the system should recognize the closer station automatically
    let res = calculate_inaccessible_base(27.0, 41.0, 14.0, 1.6).expect("Calculation succeeds with swapped angles");
    assert!((res.distance1 - 19.83).abs() < EPSILON);
    assert!((res.total_height - 18.84).abs() < EPSILON);
}

#[test]
fn test_inverse_solvers() {
    // If H = 13.5m, θ = 45.0°, h_eye = 1.5m -> d should be 12.0m
    let dist_res = solve_distance(13.5, 45.0, 1.5).expect("Solve distance");
    assert!((dist_res.distance - 12.0).abs() < 1e-4);

    // If H = 13.5m, d = 12.0m, h_eye = 1.5m -> θ should be 45.0°
    let angle_res = solve_angle(13.5, 12.0, 1.5).expect("Solve angle");
    assert!((angle_res.angle_deg - 45.0).abs() < 1e-4);
}

#[test]
fn test_unit_conversions() {
    // 1 meter = 100 cm
    assert!((Unit::convert(1.0, Unit::Meters, Unit::Centimeters) - 100.0).abs() < 1e-6);

    // 1 foot = 12 inches = 0.3048 m
    assert!((Unit::convert(1.0, Unit::Feet, Unit::Inches) - 12.0).abs() < 1e-6);
    assert!((Unit::convert(1.0, Unit::Feet, Unit::Meters) - 0.3048).abs() < 1e-6);

    // 100 feet to meters
    assert!((Unit::convert(100.0, Unit::Feet, Unit::Meters) - 30.48).abs() < 1e-6);

    // String parsing
    assert_eq!(Unit::parse("m").unwrap(), Unit::Meters);
    assert_eq!(Unit::parse("cm").unwrap(), Unit::Centimeters);
    assert_eq!(Unit::parse("ft").unwrap(), Unit::Feet);
    assert_eq!(Unit::parse("in").unwrap(), Unit::Inches);
    assert!(Unit::parse("invalid").is_err());
}

#[test]
fn test_edge_cases_and_error_handling() {
    // Zero or negative distance
    assert!(calculate_direct_height(0.0, 45.0, 1.5).is_err());
    assert!(calculate_direct_height(-5.0, 45.0, 1.5).is_err());

    // Negative eye height
    assert!(calculate_direct_height(10.0, 45.0, -1.0).is_err());

    // Out of range angles
    assert!(calculate_direct_height(10.0, 90.0, 1.5).is_err());
    assert!(calculate_direct_height(10.0, -90.0, 1.5).is_err());

    // Plumb line angle out of 0..180
    assert!(convert_protractor_plumb_angle(-5.0).is_err());
    assert!(convert_protractor_plumb_angle(185.0).is_err());

    // Identical angles for triangulation
    assert!(calculate_inaccessible_base(35.0, 35.0, 10.0, 1.5).is_err());

    // Target height below eye height for inverse solver
    assert!(solve_distance(1.2, 45.0, 1.5).is_err());
}

#[test]
fn test_grading_tolerance_and_stars() {
    let mission1 = create_mission_1_flagpole();

    // Exact answers
    let exact_sub = vec![
        ("total_height".to_string(), 13.50),
        ("line_of_sight".to_string(), 16.97),
    ];
    let grade_exact = grade_mission_submission(&mission1, &exact_sub, Some(2.0));
    assert!(grade_exact.is_passed);
    assert_eq!(grade_exact.stars, 3);
    assert_eq!(grade_exact.score, 100);

    // Answer within 1.5% tolerance
    let close_sub = vec![
        ("total_height".to_string(), 13.60), // error ~ 0.74%
        ("line_of_sight".to_string(), 17.10), // error ~ 0.76%
    ];
    let grade_close = grade_mission_submission(&mission1, &close_sub, Some(2.0));
    assert!(grade_close.is_passed);
    assert!(grade_close.stars >= 2);

    // Answer outside tolerance (> 2%)
    let wrong_sub = vec![
        ("total_height".to_string(), 15.00), // ~ 11% error
        ("line_of_sight".to_string(), 16.97),
    ];
    let grade_wrong = grade_mission_submission(&mission1, &wrong_sub, Some(2.0));
    assert!(!grade_wrong.is_passed);
}

#[test]
fn test_dynamic_mission_generator() {
    let mission = generate_dynamic_mission(Some(42), Some(MissionKind::DirectHeight));
    assert_eq!(mission.kind, MissionKind::DirectHeight);
    assert!(!mission.target_fields.is_empty());
    assert!(!mission.solution_steps.is_empty());

    let mission_inacc = generate_dynamic_mission(Some(123), Some(MissionKind::InaccessibleBase));
    assert_eq!(mission_inacc.kind, MissionKind::InaccessibleBase);

    let mission_dep = generate_dynamic_mission(Some(999), Some(MissionKind::AngleOfDepression));
    assert_eq!(mission_dep.kind, MissionKind::AngleOfDepression);
}

#[test]
fn test_core_calculate_direct() {
    // d = 15m, θ = 45°, eye = 1.6m -> tan(45) = 1, h = 15m, total = 16.6m, hyp = 15 / cos(45) = 21.2132m
    let res = calculate_direct(15.0, 45.0, 1.6);
    assert!((res.tan_val - 1.0).abs() < 1e-6);
    assert!((res.h - 15.0).abs() < 1e-6);
    assert!((res.total_height - 16.6).abs() < 1e-6);
    assert!((res.hypotenuse - 21.2132).abs() < 0.001);
    assert!((res.eye_ratio - (1.6 / 16.6 * 100.0)).abs() < 1e-4);
}

#[test]
fn test_core_calculate_protractor() {
    // String plumb line at 70° on protractor scale:
    // θ = |90 - 70| = 20°
    let res70 = calculate_protractor(70.0);
    assert_eq!(res70.alpha, 70.0);
    assert_eq!(res70.theta, 20.0);

    // String plumb line at 115° (reverse scale tilt):
    // θ = |90 - 115| = 25°
    let res115 = calculate_protractor(115.0);
    assert_eq!(res115.alpha, 115.0);
    assert_eq!(res115.theta, 25.0);

    // Level horizon at 90°:
    let res90 = calculate_protractor(90.0);
    assert_eq!(res90.theta, 0.0);

    // Tilt helper
    assert_eq!(protractor_alpha_to_theta(55.0), 35.0);
}

#[test]
fn test_core_convert_units() {
    // 10 meters to feet
    let ft = convert_units(10.0, "m", "ft").expect("Convert m to ft");
    assert!((ft - 32.8084).abs() < 0.001);

    // 50 feet to meters
    let m = convert_units(50.0, "ft", "m").expect("Convert ft to m");
    assert!((m - 15.24).abs() < 1e-6);

    // 254 centimeters to inches
    let inches = convert_units(254.0, "cm", "in").expect("Convert cm to in");
    assert!((inches - 100.0).abs() < 1e-6);

    // Case insensitivity
    let res_case = convert_units(1.0, "Meters", "FEET").expect("Case insensitive");
    assert!((res_case - 3.28084).abs() < 0.001);

    // Error on invalid unit
    assert!(convert_units(10.0, "yards", "meters").is_err());
}

