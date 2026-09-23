use crate::calculator::{
    calculate_depression, calculate_direct_height, calculate_inaccessible_base,
    convert_protractor_plumb_angle,
};
use serde::{Deserialize, Serialize};

/// Classification of clinometer mission
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MissionKind {
    DirectHeight,
    ProtractorPlumb,
    InaccessibleBase,
    AngleOfDepression,
}

/// A specific target field the student needs to solve for
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TargetField {
    pub key: String,
    pub label: String,
    pub unit: String,
    pub expected_value: f64,
    pub description: String,
}

/// Mission parameters presented to the student
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MissionParameters {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub distance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub angle_deg: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plumb_angle_deg: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub angle1_deg: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub angle2_deg: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub baseline_distance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cliff_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eye_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub angle_dep_deg: Option<f64>,
}

/// Mission definition structure
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Mission {
    pub id: String,
    pub title: String,
    pub kind: MissionKind,
    pub difficulty: String, // "Beginner", "Intermediate", "Advanced"
    pub story: String,
    pub icon: String,
    pub parameters: MissionParameters,
    pub target_fields: Vec<TargetField>,
    pub hint: String,
    pub solution_steps: Vec<String>,
}

/// Detailed evaluation for each field submitted
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldGrade {
    pub key: String,
    pub label: String,
    pub submitted_value: f64,
    pub expected_value: f64,
    pub absolute_error: f64,
    pub error_percentage: f64,
    pub is_correct: bool,
    pub tolerance_pct: f64,
}

/// Overall grade evaluation result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MissionGradeResult {
    pub mission_id: String,
    pub is_passed: bool,
    pub score: u32,       // 0 to 100
    pub stars: u8,        // 0 to 3 stars
    pub tolerance_pct: f64,
    pub field_grades: Vec<FieldGrade>,
    pub feedback: String,
    pub solution_steps: Vec<String>,
}

/// Lightweight deterministic PRNG (SplitMix64) for seedable random generation
#[derive(Debug, Clone)]
pub struct Prng {
    state: u64,
}

impl Prng {
    pub fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 { 0x9e3779b97f4a7c15 } else { seed },
        }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9e3779b97f4a7c15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
        z ^ (z >> 31)
    }

    /// Return float in [0.0, 1.0)
    pub fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 * (1.0 / (1u64 << 53) as f64)
    }

    /// Return float in range [min, max] rounded to decimals
    pub fn range_f64(&mut self, min: f64, max: f64, decimals: u32) -> f64 {
        let val = min + self.next_f64() * (max - min);
        let factor = 10f64.powi(decimals as i32);
        (val * factor).round() / factor
    }

    /// Pick an item from a slice
    pub fn pick<'a, T>(&mut self, items: &'a [T]) -> &'a T {
        let idx = (self.next_f64() * (items.len() as f64)) as usize;
        &items[idx.min(items.len() - 1)]
    }
}

/// Return the 4 authentic field mission challenges
pub fn get_standard_missions() -> Vec<Mission> {
    vec![
        create_mission_1_flagpole(),
        create_mission_2_ancient_oak(),
        create_mission_3_river_watchtower(),
        create_mission_4_coast_guard_cliff(),
    ]
}

/// Mission 1: Flagpole Challenge (Direct Height)
/// d = 12.0m, θ = 45.0°, h_eye = 1.5m -> H = 13.50m, L = 16.97m
pub fn create_mission_1_flagpole() -> Mission {
    let d = 12.0;
    let theta = 45.0;
    let h_eye = 1.5;
    let direct = calculate_direct_height(d, theta, h_eye).expect("Valid direct calculation");

    Mission {
        id: "mission-flagpole".to_string(),
        title: "The Courtyard Flagpole Challenge".to_string(),
        kind: MissionKind::DirectHeight,
        difficulty: "Beginner".to_string(),
        story: "You stand in the school courtyard preparing for the annual science fair. Your team needs to determine the exact total height of the school flagpole using your clinometer and a 12-meter measuring tape.".to_string(),
        icon: "flag".to_string(),
        parameters: MissionParameters {
            distance: Some(d),
            angle_deg: Some(theta),
            eye_height: Some(h_eye),
            plumb_angle_deg: None,
            angle1_deg: None,
            angle2_deg: None,
            baseline_distance: None,
            cliff_height: None,
            angle_dep_deg: None,
        },
        target_fields: vec![
            TargetField {
                key: "total_height".to_string(),
                label: "Total Height (H)".to_string(),
                unit: "m".to_string(),
                expected_value: 13.50,
                description: "Height from ground to the flagpole peak".to_string(),
            },
            TargetField {
                key: "line_of_sight".to_string(),
                label: "Line of Sight (L)".to_string(),
                unit: "m".to_string(),
                expected_value: 16.97,
                description: "Distance from observer's eye to flagpole peak".to_string(),
            },
        ],
        hint: "Remember to add your eye height (1.5m) to the triangle height (d × tan(θ))!".to_string(),
        solution_steps: direct.steps,
    }
}

/// Mission 2: Ancient Oak (DIY Protractor Plumb-Line)
/// d = 22.5m, α = 58.0° (θ = 32.0°), h_eye = 1.65m -> H = 15.71m, L = 26.53m
pub fn create_mission_2_ancient_oak() -> Mission {
    let d = 22.5;
    let plumb_alpha = 58.0;
    let conv = convert_protractor_plumb_angle(plumb_alpha).expect("Valid plumb conversion");
    let theta = conv.elevation_angle_deg; // 32.0°
    let h_eye = 1.65;
    let direct = calculate_direct_height(d, theta, h_eye).expect("Valid direct calculation");

    let mut steps = conv.steps;
    steps.extend(direct.steps);

    Mission {
        id: "mission-ancient-oak".to_string(),
        title: "The Ancient Oak Plumb-Line Challenge".to_string(),
        kind: MissionKind::ProtractorPlumb,
        difficulty: "Intermediate".to_string(),
        story: "Park arborists need to record the height of a centuries-old heritage oak. Using a homemade protractor clinometer with a string-and-washer plumb line, the weighted string rests against the 58.0° mark.".to_string(),
        icon: "tree".to_string(),
        parameters: MissionParameters {
            distance: Some(d),
            angle_deg: None,
            eye_height: Some(h_eye),
            plumb_angle_deg: Some(plumb_alpha),
            angle1_deg: None,
            angle2_deg: None,
            baseline_distance: None,
            cliff_height: None,
            angle_dep_deg: None,
        },
        target_fields: vec![
            TargetField {
                key: "elevation_angle".to_string(),
                label: "True Elevation Angle (θ)".to_string(),
                unit: "°".to_string(),
                expected_value: 32.00,
                description: "Calculated angle above the horizontal plane".to_string(),
            },
            TargetField {
                key: "total_height".to_string(),
                label: "Total Tree Height (H)".to_string(),
                unit: "m".to_string(),
                expected_value: 15.71,
                description: "Ground to canopy crown total height".to_string(),
            },
            TargetField {
                key: "line_of_sight".to_string(),
                label: "Line of Sight (L)".to_string(),
                unit: "m".to_string(),
                expected_value: 26.53,
                description: "Hypotenuse distance from eye to crown".to_string(),
            },
        ],
        hint: "On a DIY protractor clinometer, 90° is horizontal. The true elevation angle is θ = |90° - α|.".to_string(),
        solution_steps: steps,
    }
}

/// Mission 3: River Watchtower (Inaccessible Base)
/// Station 1 θ1 = 41.0°, Station 2 θ2 = 27.0°, setback x = 14.0m, h_eye = 1.6m -> H = 18.84m, d1 = 19.83m
pub fn create_mission_3_river_watchtower() -> Mission {
    let theta1 = 41.0;
    let theta2 = 27.0;
    let x = 14.0;
    let h_eye = 1.6;
    let result = calculate_inaccessible_base(theta1, theta2, x, h_eye).expect("Valid inaccessible base");

    Mission {
        id: "mission-river-tower".to_string(),
        title: "River Watchtower - Inaccessible Base".to_string(),
        kind: MissionKind::InaccessibleBase,
        difficulty: "Advanced".to_string(),
        story: "A medieval watchtower guards the opposite bank of a raging river that cannot be crossed. By setting up two observation stations aligned in a straight line separated by 14.0m, you measure the tower's elevation from both positions.".to_string(),
        icon: "castle".to_string(),
        parameters: MissionParameters {
            distance: None,
            angle_deg: None,
            eye_height: Some(h_eye),
            plumb_angle_deg: None,
            angle1_deg: Some(theta1),
            angle2_deg: Some(theta2),
            baseline_distance: Some(x),
            cliff_height: None,
            angle_dep_deg: None,
        },
        target_fields: vec![
            TargetField {
                key: "distance_station1".to_string(),
                label: "Distance from Station 1 to Tower (d1)".to_string(),
                unit: "m".to_string(),
                expected_value: 19.83,
                description: "Horizontal distance from closer station across the water to tower base".to_string(),
            },
            TargetField {
                key: "total_height".to_string(),
                label: "Total Tower Height (H)".to_string(),
                unit: "m".to_string(),
                expected_value: 18.84,
                description: "Total height of the watchtower from ground to parapet".to_string(),
            },
        ],
        hint: "Use two-point triangulation: h = (x × tan(θ1) × tan(θ2)) / (tan(θ1) - tan(θ2)), then d1 = h / tan(θ1) and H = h + h_eye.".to_string(),
        solution_steps: result.steps,
    }
}

/// Mission 4: Coast Guard Cliff (Angle of Depression)
/// H_cliff = 42.0m, h_eye = 1.7m (total eye elevation 43.7m), θ_dep = 16.5° -> d = 147.53m, L = 153.86m
pub fn create_mission_4_coast_guard_cliff() -> Mission {
    let h_cliff = 42.0;
    let h_eye = 1.7;
    let theta_dep = 16.5;
    let result = calculate_depression(h_cliff, h_eye, theta_dep).expect("Valid depression calculation");

    Mission {
        id: "mission-coast-guard".to_string(),
        title: "Coast Guard Cliff - Angle of Depression".to_string(),
        kind: MissionKind::AngleOfDepression,
        difficulty: "Advanced".to_string(),
        story: "A coast guard lookout stationed atop a 42.0m sea cliff spots an adrift navigation buoy. Using the clinometer inverted to measure depression angle below the horizon, the reading is 16.5°.".to_string(),
        icon: "anchor".to_string(),
        parameters: MissionParameters {
            distance: None,
            angle_deg: None,
            eye_height: Some(h_eye),
            plumb_angle_deg: None,
            angle1_deg: None,
            angle2_deg: None,
            baseline_distance: None,
            cliff_height: Some(h_cliff),
            angle_dep_deg: Some(theta_dep),
        },
        target_fields: vec![
            TargetField {
                key: "horizontal_distance".to_string(),
                label: "Horizontal Distance to Buoy (d)".to_string(),
                unit: "m".to_string(),
                expected_value: 147.53,
                description: "Sea-level horizontal distance from cliff base to buoy".to_string(),
            },
            TargetField {
                key: "line_of_sight".to_string(),
                label: "Direct Line of Sight (L)".to_string(),
                unit: "m".to_string(),
                expected_value: 153.86,
                description: "Direct optical path length from observer to buoy".to_string(),
            },
        ],
        hint: "Total elevation above sea level is E = H_cliff + h_eye = 43.7m. Then d = E / tan(θ_dep).".to_string(),
        solution_steps: result.steps,
    }
}

/// Find a standard mission by its unique ID
pub fn find_mission(id: &str) -> Option<Mission> {
    get_standard_missions().into_iter().find(|m| m.id == id)
}

/// Grade a student submission against a target field
pub fn grade_field_value(
    expected: f64,
    submitted: f64,
    tolerance_pct: f64,
) -> (bool, f64, f64) {
    let abs_err = (submitted - expected).abs();
    let rel_err_pct = if expected.abs() < 1e-6 {
        abs_err * 100.0
    } else {
        (abs_err / expected.abs()) * 100.0
    };
    let is_correct = rel_err_pct <= tolerance_pct;
    (is_correct, abs_err, rel_err_pct)
}

/// Grade a mission submission given the mission and submitted answers (keyed by target field key)
pub fn grade_mission_submission(
    mission: &Mission,
    submissions: &[(String, f64)],
    tolerance_pct: Option<f64>,
) -> MissionGradeResult {
    let tol = tolerance_pct.unwrap_or(2.0); // default +/- 2.0%
    let mut field_grades = Vec::new();
    let mut all_correct = true;
    let mut total_error_pct = 0.0;

    for target in &mission.target_fields {
        let submitted_opt = submissions
            .iter()
            .find(|(k, _)| k == &target.key)
            .map(|(_, v)| *v);

        if let Some(submitted) = submitted_opt {
            let (is_correct, abs_err, err_pct) = grade_field_value(target.expected_value, submitted, tol);
            if !is_correct {
                all_correct = false;
            }
            total_error_pct += err_pct;
            field_grades.push(FieldGrade {
                key: target.key.clone(),
                label: target.label.clone(),
                submitted_value: submitted,
                expected_value: target.expected_value,
                absolute_error: (abs_err * 100.0).round() / 100.0,
                error_percentage: (err_pct * 100.0).round() / 100.0,
                is_correct,
                tolerance_pct: tol,
            });
        } else {
            all_correct = false;
            field_grades.push(FieldGrade {
                key: target.key.clone(),
                label: target.label.clone(),
                submitted_value: 0.0,
                expected_value: target.expected_value,
                absolute_error: target.expected_value,
                error_percentage: 100.0,
                is_correct: false,
                tolerance_pct: tol,
            });
        }
    }

    let avg_error_pct = if !field_grades.is_empty() {
        total_error_pct / (field_grades.len() as f64)
    } else {
        100.0
    };

    // Calculate score (0-100) and stars (0-3)
    let (score, stars) = if all_correct {
        if avg_error_pct <= 0.5 {
            (100, 3)
        } else if avg_error_pct <= 1.5 {
            (95, 3)
        } else {
            (90, 2)
        }
    } else {
        let raw_score = (100.0 - (avg_error_pct * 15.0)).clamp(0.0, 85.0);
        let s = raw_score.round() as u32;
        let star = if avg_error_pct <= 5.0 { 1 } else { 0 };
        (s, star)
    };

    let feedback = if stars == 3 {
        "Outstanding! Spot-on mathematical precision. You're a master surveyor!".to_string()
    } else if stars == 2 {
        "Great job! Your calculations are well within field tolerance.".to_string()
    } else if stars == 1 {
        "Good effort! You're close, but check your trigonometric steps and rounding.".to_string()
    } else {
        "Review the trigonometry formula and check your angle conversions. See step-by-step solution below!".to_string()
    };

    MissionGradeResult {
        mission_id: mission.id.clone(),
        is_passed: all_correct,
        score,
        stars,
        tolerance_pct: tol,
        field_grades,
        feedback,
        solution_steps: mission.solution_steps.clone(),
    }
}

/// Dynamic mission generator that produces authentic randomized challenges
pub fn generate_dynamic_mission(seed: Option<u64>, kind: Option<MissionKind>) -> Mission {
    let mut rng = Prng::new(seed.unwrap_or(0xdeadbeef12345678));
    let chosen_kind = kind.unwrap_or_else(|| {
        let kinds = [
            MissionKind::DirectHeight,
            MissionKind::ProtractorPlumb,
            MissionKind::InaccessibleBase,
            MissionKind::AngleOfDepression,
        ];
        *rng.pick(&kinds)
    });

    match chosen_kind {
        MissionKind::DirectHeight => {
            let names = [
                ("Redwood Tree", "Measuring the crown of a colossal redwood in Humboldt Park", "tree"),
                ("Wind Turbine", "Surveying the hub height of a clean energy wind turbine", "wind"),
                ("Cathedral Spire", "Calculating the peak spire elevation of an ancient cathedral", "landmark"),
                ("Rocket Launch Gantry", "Verifying the service tower height before flight test", "rocket"),
                ("Telecom Radio Mast", "Surveying cellular antenna tower elevation on rolling terrain", "broadcast-tower"),
            ];
            let (target_name, story_desc, icon) = rng.pick(&names);
            let distance = rng.range_f64(10.0, 50.0, 1);
            let angle_deg = rng.range_f64(25.0, 65.0, 1);
            let eye_height = rng.range_f64(1.4, 1.85, 2);

            let res = calculate_direct_height(distance, angle_deg, eye_height).unwrap();
            let exp_total = (res.total_height * 100.0).round() / 100.0;
            let exp_los = (res.line_of_sight * 100.0).round() / 100.0;

            Mission {
                id: format!("dynamic-direct-{}", rng.next_u64() % 10000),
                title: format!("Direct Survey: {}", target_name),
                kind: MissionKind::DirectHeight,
                difficulty: "Beginner".to_string(),
                story: format!("Your field team is tasked with {}. You stand {:.1}m away and record an elevation angle of {:.1}°.", story_desc, distance, angle_deg),
                icon: icon.to_string(),
                parameters: MissionParameters {
                    distance: Some(distance),
                    angle_deg: Some(angle_deg),
                    eye_height: Some(eye_height),
                    plumb_angle_deg: None,
                    angle1_deg: None,
                    angle2_deg: None,
                    baseline_distance: None,
                    cliff_height: None,
                    angle_dep_deg: None,
                },
                target_fields: vec![
                    TargetField {
                        key: "total_height".to_string(),
                        label: format!("Total {} Height (H)", target_name),
                        unit: "m".to_string(),
                        expected_value: exp_total,
                        description: "Total vertical height from ground".to_string(),
                    },
                    TargetField {
                        key: "line_of_sight".to_string(),
                        label: "Line of Sight (L)".to_string(),
                        unit: "m".to_string(),
                        expected_value: exp_los,
                        description: "Direct hypotenuse distance to top".to_string(),
                    },
                ],
                hint: "Use H = d × tan(θ) + h_eye and L = d / cos(θ).".to_string(),
                solution_steps: res.steps,
            }
        }
        MissionKind::ProtractorPlumb => {
            let names = [
                ("Heritage Banyan", "park", "tree"),
                ("Historic Clock Tower", "civic center", "clock"),
                ("Water Reservoir Tower", "municipal facility", "tint"),
            ];
            let (target_name, location, icon) = rng.pick(&names);
            let distance = rng.range_f64(15.0, 40.0, 1);
            let elev_angle = rng.range_f64(20.0, 55.0, 1);
            let plumb_angle = (90.0 - elev_angle).round();
            let true_elev = (90.0 - plumb_angle).abs();
            let eye_height = rng.range_f64(1.5, 1.8, 2);

            let conv = convert_protractor_plumb_angle(plumb_angle).unwrap();
            let direct = calculate_direct_height(distance, true_elev, eye_height).unwrap();
            let mut steps = conv.steps;
            steps.extend(direct.steps);

            let exp_h = (direct.total_height * 100.0).round() / 100.0;

            Mission {
                id: format!("dynamic-plumb-{}", rng.next_u64() % 10000),
                title: format!("DIY Protractor: {}", target_name),
                kind: MissionKind::ProtractorPlumb,
                difficulty: "Intermediate".to_string(),
                story: format!("Using your DIY protractor clinometer at the {}, the plumb line aligns with {:.1}°. You are stationed {:.1}m away with eye height {:.2}m.", location, plumb_angle, distance, eye_height),
                icon: icon.to_string(),
                parameters: MissionParameters {
                    distance: Some(distance),
                    angle_deg: None,
                    eye_height: Some(eye_height),
                    plumb_angle_deg: Some(plumb_angle),
                    angle1_deg: None,
                    angle2_deg: None,
                    baseline_distance: None,
                    cliff_height: None,
                    angle_dep_deg: None,
                },
                target_fields: vec![
                    TargetField {
                        key: "elevation_angle".to_string(),
                        label: "True Elevation Angle (θ)".to_string(),
                        unit: "°".to_string(),
                        expected_value: true_elev,
                        description: "Convert plumb angle: θ = |90° - α|".to_string(),
                    },
                    TargetField {
                        key: "total_height".to_string(),
                        label: format!("Total {} Height (H)", target_name),
                        unit: "m".to_string(),
                        expected_value: exp_h,
                        description: "Ground to summit total height".to_string(),
                    },
                ],
                hint: "First convert plumb angle α to elevation angle θ = |90° - α|, then apply standard height formula.".to_string(),
                solution_steps: steps,
            }
        }
        MissionKind::InaccessibleBase => {
            let names = [
                ("Canyon Pinnacle", "canyon chasm", "mountain"),
                ("Island Beacon", "rocky inlet", "lightbulb"),
                ("Rooftop Antenna", "fenced compound", "tower-broadcast"),
            ];
            let (target_name, obstacle, icon) = rng.pick(&names);
            let baseline = rng.range_f64(8.0, 25.0, 1);
            let angle2 = rng.range_f64(20.0, 35.0, 1);
            let angle1 = angle2 + rng.range_f64(10.0, 18.0, 1);
            let eye_height = rng.range_f64(1.5, 1.8, 2);

            let res = calculate_inaccessible_base(angle1, angle2, baseline, eye_height).unwrap();
            let exp_d1 = (res.distance1 * 100.0).round() / 100.0;
            let exp_h = (res.total_height * 100.0).round() / 100.0;

            Mission {
                id: format!("dynamic-triangulation-{}", rng.next_u64() % 10000),
                title: format!("Two-Point Triangulation: {}", target_name),
                kind: MissionKind::InaccessibleBase,
                difficulty: "Advanced".to_string(),
                story: format!("An impassable {} blocks direct access to the base of {}. You set up Station 1 (angle {:.1}°) and walk back {:.1}m to Station 2 (angle {:.1}°).", obstacle, target_name, angle1, baseline, angle2),
                icon: icon.to_string(),
                parameters: MissionParameters {
                    distance: None,
                    angle_deg: None,
                    eye_height: Some(eye_height),
                    plumb_angle_deg: None,
                    angle1_deg: Some(angle1),
                    angle2_deg: Some(angle2),
                    baseline_distance: Some(baseline),
                    cliff_height: None,
                    angle_dep_deg: None,
                },
                target_fields: vec![
                    TargetField {
                        key: "distance_station1".to_string(),
                        label: "Distance from Station 1 (d1)".to_string(),
                        unit: "m".to_string(),
                        expected_value: exp_d1,
                        description: "Calculated distance from closer station to target base".to_string(),
                    },
                    TargetField {
                        key: "total_height".to_string(),
                        label: format!("Total {} Height (H)", target_name),
                        unit: "m".to_string(),
                        expected_value: exp_h,
                        description: "Total height of the target".to_string(),
                    },
                ],
                hint: "h = (x × tan(θ1) × tan(θ2)) / (tan(θ1) - tan(θ2)), d1 = h / tan(θ1), H = h + h_eye.".to_string(),
                solution_steps: res.steps,
            }
        }
        MissionKind::AngleOfDepression => {
            let names = [
                ("Anchored Sailboat", "harbor entrance", "ship"),
                ("Distressed Raft", "coastal bay", "life-ring"),
                ("Survey Marker Buoy", "reef barrier", "compass"),
            ];
            let (target_name, location, icon) = rng.pick(&names);
            let cliff_h = rng.range_f64(30.0, 70.0, 1);
            let eye_h = rng.range_f64(1.5, 1.8, 2);
            let angle_dep = rng.range_f64(12.0, 35.0, 1);

            let res = calculate_depression(cliff_h, eye_h, angle_dep).unwrap();
            let exp_d = (res.horizontal_distance * 100.0).round() / 100.0;
            let exp_los = (res.line_of_sight * 100.0).round() / 100.0;

            Mission {
                id: format!("dynamic-depression-{}", rng.next_u64() % 10000),
                title: format!("Depression Angle: {}", target_name),
                kind: MissionKind::AngleOfDepression,
                difficulty: "Advanced".to_string(),
                story: format!("From an observation clifftop {:.1}m above sea level at {}, you sight a {} at an angle of depression of {:.1}°.", cliff_h, location, target_name, angle_dep),
                icon: icon.to_string(),
                parameters: MissionParameters {
                    distance: None,
                    angle_deg: None,
                    eye_height: Some(eye_h),
                    plumb_angle_deg: None,
                    angle1_deg: None,
                    angle2_deg: None,
                    baseline_distance: None,
                    cliff_height: Some(cliff_h),
                    angle_dep_deg: Some(angle_dep),
                },
                target_fields: vec![
                    TargetField {
                        key: "horizontal_distance".to_string(),
                        label: "Horizontal Distance (d)".to_string(),
                        unit: "m".to_string(),
                        expected_value: exp_d,
                        description: "Sea-level distance from cliff base to target".to_string(),
                    },
                    TargetField {
                        key: "line_of_sight".to_string(),
                        label: "Line of Sight (L)".to_string(),
                        unit: "m".to_string(),
                        expected_value: exp_los,
                        description: "Direct optical path length".to_string(),
                    },
                ],
                hint: "Total elevation is E = H_cliff + h_eye. Then d = E / tan(θ_dep).".to_string(),
                solution_steps: res.steps,
            }
        }
    }
}
