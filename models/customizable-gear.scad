/* 
 * Customizable Gear
 * A parametric gear for mechanical applications
 */

// Parameters - these will be customizable in the UI
$teeth = 20;            // Number of teeth
$radius = 30;           // Outer radius of the gear
$thickness = 5;         // Thickness of the gear
$hole_diameter = 6;     // Central hole diameter (0 for no hole)
$has_keyway = false;    // Whether to include a keyway
$keyway_width = 3;      // Width of the keyway
$keyway_depth = 2;      // Depth of the keyway

// Main module
module main() {
    difference() {
        // Base gear
        gear($teeth, $radius, $thickness);
        
        // Central hole
        if ($hole_diameter > 0) {
            cylinder(h = $thickness + 1, d = $hole_diameter, center = true, $fn = 32);
            
            // Keyway if needed
            if ($has_keyway && $hole_diameter > 0) {
                keyway();
            }
        }
    }
}

// Gear module
module gear(teeth, radius, thickness) {
    tooth_depth = 2.5;
    tooth_width = 3.14159 * 2 * radius / teeth / 2;
    
    cylinder(h = thickness, r = radius - tooth_depth / 2, center = true, $fn = 64);
    
    for (i = [0:teeth-1]) {
        rotate([0, 0, i * 360 / teeth]) {
            translate([radius, 0, 0]) {
                cube([tooth_depth, tooth_width, thickness], center = true);
            }
        }
    }
}

// Keyway module
module keyway() {
    translate([$hole_diameter / 2, 0, 0]) {
        rotate([0, 0, 90]) {
            cube([$keyway_width, $keyway_depth, $thickness + 1], center = true);
        }
    }
}

// Execute the main module
main();