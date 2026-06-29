// Pipe Adapter - Parametric Design
// Connects two different diameter pipes with smooth curved transition
// Designed to fit OVER the outside of pipes (external coupling)
// Input: Inner diameters of the pipes to be connected

// ===== PIPE SPECIFICATIONS =====
// Pipe diameters that the adapter will slip over
pipe1_inner_dia = 80;    // mm - diameter that adapter end 1 will slip over
pipe2_inner_dia = 50;    // mm - diameter that adapter end 2 will slip over

// These are NOT used in calculations - kept for reference only
pipe1_wall_thickness = 6;  // mm - wall thickness of pipe 1 (reference only)
pipe2_wall_thickness = 6;  // mm - wall thickness of pipe 2 (reference only)

// ===== ADAPTER SPECIFICATIONS =====
// Adapter wall thickness
adapter_wall_thickness = 4;  // mm - wall thickness of the adapter itself

// Collar dimensions (parts that fit over the pipes)
collar1_length = 40;     // mm - length of collar for pipe 1
collar2_length = 30;     // mm - length of collar for pipe 2

// Transition section
transition_length = 30;  // mm - length of the curved transition

// Transition offset (for angled or offset adapters)
transition_offset_x = 14; // mm - horizontal offset in X direction
transition_offset_y = 0; // mm - horizontal offset in Y direction
// Note: Positive values move pipe2 end relative to pipe1 end
// Example: transition_offset_x = 10 moves pipe2 end 10mm in +X direction

// ===== FIT AND TOLERANCE =====
// Clearances for proper fit (adjust for your 3D printer's accuracy)
collar_clearance = 0.5;   // mm - radial clearance between adapter and pipe outer surface
wall_clearance = 0.1;     // mm - clearance to avoid interference

// ===== DESIGN OPTIONS =====
smooth_transition = true; // true for curved transition, false for linear (locked to true for your preference)
show_reference_pipes = false; // set to true to see pipe outlines for reference

// Rendering quality
$fn = 60; // Higher values = smoother curves, slower rendering

// ===== CALCULATED VALUES =====
// Adapter inner diameters (exact diameters you specified + clearance)
adapter1_inner_dia = pipe1_inner_dia + 2 * collar_clearance;
adapter2_inner_dia = pipe2_inner_dia + 2 * collar_clearance;

// Adapter outer diameters
adapter1_outer_dia = adapter1_inner_dia + 2 * adapter_wall_thickness;
adapter2_outer_dia = adapter2_inner_dia + 2 * adapter_wall_thickness;

// Calculate pipe outer diameters for reference display only
pipe1_outer_dia = pipe1_inner_dia + 2 * pipe1_wall_thickness;
pipe2_outer_dia = pipe2_inner_dia + 2 * pipe2_wall_thickness;

// Total length
total_length = collar1_length + transition_length + collar2_length;

// Calculate actual transition distance (accounting for offset)
actual_transition_distance = sqrt(pow(transition_length, 2) + pow(transition_offset_x, 2) + pow(transition_offset_y, 2));

// ===== VALIDATION =====
// Check that the two pipe sizes are different (adapter makes sense)
assert(pipe1_inner_dia != pipe2_inner_dia, 
    "ERROR: pipe1_inner_dia and pipe2_inner_dia must be different for an adapter to make sense");

// Check for reasonable wall thickness
assert(adapter_wall_thickness > 0.8, 
    "WARNING: adapter_wall_thickness is very thin, may not be strong enough");
assert(adapter_wall_thickness < 10, 
    "WARNING: adapter_wall_thickness is very thick, may be wasteful");

// ===== MAIN MODULE =====
module pipe_adapter() {
    difference() {
        // Outer shape
        union() {
            // Collar 1 (pipe 1 end)
            translate([0, 0, 0])
                cylinder(h = collar1_length, d = adapter1_outer_dia);
            
            // Transition section
            translate([0, 0, collar1_length])
                transition_section();
            
            // Collar 2 (pipe 2 end) - with offset
            translate([transition_offset_x, transition_offset_y, collar1_length + transition_length])
                cylinder(h = collar2_length, d = adapter2_outer_dia);
        }
        
        // Inner cavity
        union() {
            // Inner cavity for pipe 1 (fits over pipe 1)
            translate([0, 0, -0.1])
                cylinder(h = collar1_length + 0.1, d = adapter1_inner_dia);
            
            // Inner transition cavity
            translate([0, 0, collar1_length])
                inner_transition();
            
            // Inner cavity for pipe 2 (fits over pipe 2) - with offset
            translate([transition_offset_x, transition_offset_y, collar1_length + transition_length])
                cylinder(h = collar2_length + 0.1, d = adapter2_inner_dia);
        }
    }
}

// ===== TRANSITION MODULES =====
module transition_section() {
    // Always use smooth curved transition with optional offset
    hull() {
        cylinder(h = 0.1, d = adapter1_outer_dia);
        translate([transition_offset_x, transition_offset_y, transition_length])
            cylinder(h = 0.1, d = adapter2_outer_dia);
    }
}

module inner_transition() {
    // Always use smooth curved inner transition with optional offset
    hull() {
        cylinder(h = 0.1, d = adapter1_inner_dia);
        translate([transition_offset_x, transition_offset_y, transition_length])
            cylinder(h = 0.1, d = adapter2_inner_dia);
    }
}

// ===== HELPER MODULES =====
// Module to show pipe outlines for reference
module show_pipes() {
    if (show_reference_pipes) {
        color("red", 0.3) {
            // Pipe 1 outline
            translate([0, 0, -10])
                difference() {
                    cylinder(h = collar1_length + 10, d = pipe1_outer_dia);
                    cylinder(h = collar1_length + 10, d = pipe1_inner_dia);
                }
            
            // Pipe 2 outline - with offset
            translate([transition_offset_x, transition_offset_y, collar1_length + transition_length])
                difference() {
                    cylinder(h = collar2_length + 10, d = pipe2_outer_dia);
                    cylinder(h = collar2_length + 10, d = pipe2_inner_dia);
                }
        }
        
        // Show pipe bores for reference - with offset
        color("blue", 0.2) {
            translate([0, 0, -10])
                cylinder(h = total_length + 20, d = pipe1_inner_dia);
            translate([transition_offset_x, transition_offset_y, collar1_length + transition_length - 10])
                cylinder(h = collar2_length + 20, d = pipe2_inner_dia);
        }
    }
}

// ===== INFORMATION DISPLAY =====
echo("=== PIPE ADAPTER SPECIFICATIONS ===");
echo(str("Adapter hole 1 diameter: ", adapter1_inner_dia, "mm (slips over ", pipe1_inner_dia, "mm pipe)"));
echo(str("Adapter hole 2 diameter: ", adapter2_inner_dia, "mm (slips over ", pipe2_inner_dia, "mm pipe)"));
echo(str("Adapter wall thickness: ", adapter_wall_thickness, "mm"));
echo(str("Total adapter length: ", total_length, "mm"));
echo(str("Transition offset: X=", transition_offset_x, "mm, Y=", transition_offset_y, "mm"));
echo(str("Actual transition distance: ", actual_transition_distance, "mm"));
echo(str("Adapter 1 - Inner: ", adapter1_inner_dia, "mm, Outer: ", adapter1_outer_dia, "mm"));
echo(str("Adapter 2 - Inner: ", adapter2_inner_dia, "mm, Outer: ", adapter2_outer_dia, "mm"));
echo(str("Collar clearance: ", collar_clearance, "mm"));

// ===== RENDER THE ADAPTER =====
pipe_adapter();

// Show reference pipes if enabled
show_pipes();