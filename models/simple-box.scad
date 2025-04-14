/* 
 * Simple Box with Optional Lid
 * A customizable box that can have a lid
 */

// Parameters - these will be customizable in the UI
$width = 100;           // Width of the box
$depth = 80;            // Depth of the box
$height = 50;           // Height of the box
$wall_thickness = 2;    // Wall thickness
$has_lid = true;        // Whether to include a lid

// Main module
module main() {
    if ($has_lid) {
        box();
        translate([0, 0, $height + 10]) lid();
    } else {
        box();
    }
}

// Box module
module box() {
    difference() {
        // Outer shell
        cube([$width, $depth, $height]);
        
        // Inner cavity
        translate([$wall_thickness, $wall_thickness, $wall_thickness])
            cube([
                $width - 2 * $wall_thickness, 
                $depth - 2 * $wall_thickness, 
                $height
            ]);
    }
}

// Lid module
module lid() {
    union() {
        // Lid base
        cube([$width, $depth, $wall_thickness]);
        
        // Lip for secure fitting
        translate([$wall_thickness, $wall_thickness, $wall_thickness])
            difference() {
                cube([
                    $width - 2 * $wall_thickness, 
                    $depth - 2 * $wall_thickness, 
                    $wall_thickness
                ]);
                
                translate([$wall_thickness, $wall_thickness, 0])
                    cube([
                        $width - 4 * $wall_thickness, 
                        $depth - 4 * $wall_thickness, 
                        $wall_thickness
                    ]);
            }
    }
}

// Execute the main module
main();