/* [Pipe Dimensions] */

// Inner diameter of the inlet pipe (mm)
inlet_inner_diameter = 80; // [10:1:200]

// Inner diameter of the outlet pipe (mm)
outlet_inner_diameter = 40; // [10:1:200]

// Wall thickness of the adapter (mm)
wall_thickness = 3; // [1:0.5:10]

// Length of straight inlet section (mm)
inlet_length = 30; // [10:1:100]

// Length of straight outlet section (mm)
outlet_length = 30; // [10:1:100]

// Length of the transition section (mm)
transition_length = 100; // [10:1:100]

/* [Advanced Options] */

// Number of facets (resolution)
$fn = 200; // [20:20:200]

// Add support ring at inlet
add_inlet_ring = false;

// Add support ring at outlet
add_outlet_ring = false;

// Ring thickness
ring_thickness = 3; // [2:0.5:10]

// Ring height
ring_height = 5; // [2:0.5:10]

/* [Hidden] */

// Calculate outer diameters
inlet_outer_diameter = inlet_inner_diameter + (wall_thickness * 2);
outlet_outer_diameter = outlet_inner_diameter + (wall_thickness * 2);

// Total length
total_length = inlet_length + transition_length + outlet_length;

// Module for creating a pipe adapter with transition
module pipe_adapter() {
    difference() {
        union() {
            // Outer shape
            cylinder(h = inlet_length, d = inlet_outer_diameter);
            
            translate([0, 0, inlet_length])
                cylinder(h = transition_length, d1 = inlet_outer_diameter, d2 = outlet_outer_diameter);
                
            translate([0, 0, inlet_length + transition_length])
                cylinder(h = outlet_length, d = outlet_outer_diameter);
            
            // Support rings if enabled
            if (add_inlet_ring) {
                translate([0, 0, inlet_length/2])
                    ring(inlet_outer_diameter + ring_thickness*2, ring_height);
            }
            
            if (add_outlet_ring) {
                translate([0, 0, inlet_length + transition_length + outlet_length/2])
                    ring(outlet_outer_diameter + ring_thickness*2, ring_height);
            }
        }
        
        // Hollow out the inside - extend slightly beyond ends to ensure openings
        translate([0, 0, -0.1])
            cylinder(h = inlet_length + 0.2, d = inlet_inner_diameter);
        
        translate([0, 0, inlet_length])
            cylinder(h = transition_length, d1 = inlet_inner_diameter, d2 = outlet_inner_diameter);
            
        translate([0, 0, inlet_length + transition_length - 0.1])
            cylinder(h = outlet_length + 0.2, d = outlet_inner_diameter);
    }
}

// Module for creating a ring
module ring(diameter, height) {
    difference() {
        cylinder(h = height, d = diameter, center = true);
        cylinder(h = height + 1, d = diameter - (ring_thickness * 2), center = true);
    }
}

// Generate the pipe adapter
pipe_adapter();