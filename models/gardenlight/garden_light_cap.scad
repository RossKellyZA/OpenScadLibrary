// =====================================================================
//  Garden Light - Top Cap (replacement)
//  Units: millimetres
//
//  Shape: a shallow "cone/dome" cap, hollow underneath, with a lip
//  around the bottom outer edge and 4 bosses for heat-set copper
//  threaded inserts (the main light housing screws into these).
//
//  Measurements supplied:
//    - overall diameter ............ 174 mm
//    - overall height .............. 40 mm
//    - hollow underside follows the outer curve
//    - bottom outer edge lip ....... 5 mm deep (tall) x 5 mm wide (radial)
//    - 4 inserts, 68 mm from centre, square pattern
//    - inserts: 7 mm dia, 10 mm deep, flush with the bottom outer edge
// =====================================================================

/* ============================ Parameters ============================ */

D            = 174;      // overall outside diameter
H            = 40;       // overall height (apex to bottom plane)

lip_h        = 5;        // lip depth  (vertical height of the bottom rim)
lip_w        = 5;        // lip width  (radial thickness of the bottom rim)

wall         = 4;        // shell wall thickness (measured vertically)

// Profile shape (matches side_profile.jpg):
//   straight sloped sides  ->  rounded shoulder fillet  ->  flat top
//   side_angle      = slope of the straight sides (deg from horizontal)
//   shoulder_fillet = radius of the rounded shoulder (bigger = softer,
//                     more gradual crown; smaller = more defined shoulder)
side_angle      = 28;
shoulder_fillet = 22;

// Slight crown over the otherwise-flat top (raises the centre by this much).
// Set to 0 for a dead-flat top.  Overall height becomes H + dome_height.
dome_height     = 2;

// ---- Heat-set copper inserts ----
insert_pos   = 68;       // distance from centre to each insert
insert_dia   = 7;        // insert / hole diameter
insert_depth = 10;       // insert / hole depth
insert_count = 4;        // number of inserts
boss_dia     = 13;       // outer diameter of the boss around each insert
insert_clear = 0.0;      // extra diameter clearance on the hole (e.g. 0.2)

// Resolution
$fn = 200;

/* ============================ Derived ============================== */

R       = D / 2;             // outer radius (87)
inner_R = R - lip_w;         // radius where the inner rim wall starts
steps   = 120;               // smoothness of the curved profiles

// --- Geometry: straight side + shoulder fillet + flat top ---------------
_tb  = tan(side_angle);
_cb  = cos(side_angle);
_sb  = sin(side_angle);
f    = shoulder_fillet;
// Flat-top radius (where the fillet is tangent to the horizontal top).
// Derived from the fillet being tangent to both the flat top (z = H) and
// the straight side line through the lip edge (R, lip_h) at side_angle.
xo   = (R * _tb - (H - f - lip_h) - f / _cb) / _tb;   // flat top radius
psx  = xo + f * _sb;                  // where the fillet meets the side
psz  = H  - f * (1 - _cb);            // height at that shoulder point

// Slight top crown: spherical cap over r in [0, xo], rising dome_height at
// the centre and meeting the flat-top level (z = H) at r = xo (smooth join).
_Rc  = (dome_height > 0) ? (xo * xo + dome_height * dome_height)
                           / (2 * dome_height) : 0;        // crown radius
_zc  = H + dome_height - _Rc;                              // crown centre z

// Outer surface height as a function of radius:
//   r <= xo  : gentle crown (flat if dome_height = 0), z = H+dome at centre
//   xo<r<=psx: rounded shoulder fillet (radius f, centre at (xo, H-f))
//   r >  psx : straight side down to the lip (z = lip_h at r = R)
function zouter(r) =
    (r <= xo)  ? (dome_height > 0 ? _zc + sqrt(max(0, _Rc * _Rc - r * r)) : H) :
    (r <= psx) ? (H - f) + sqrt(max(0, f * f - (r - xo) * (r - xo)))
               : lip_h + (R - r) * _tb;

/* ====================== 2D profiles (x=r, y=z) ===================== */

// --- Outer solid: bottom disc -> vertical lip -> cone side -> flat top
outer_pts = concat(
    [ [0, 0], [R, 0] ],
    [ for (i = [0 : steps]) let (r = R * (1 - i / steps)) [ r, zouter(r) ] ]
);

// --- Cavity (the hollow): open at the bottom, follows the inner curve.
//     Leaves 'lip_w' of solid at the outer bottom edge and 'wall' of
//     material under the whole skin.
cavity_pts = concat(
    [ [0, -2], [inner_R, -2] ],
    [ for (i = [0 : steps]) let (r = inner_R * (1 - i / steps)) [ r, zouter(r) - wall ] ]
);

/* ============================ Modules ============================== */

module outer_solid() {
    rotate_extrude($fn = $fn) polygon(points = outer_pts);
}

module cavity() {
    rotate_extrude($fn = $fn) polygon(points = cavity_pts);
}

// Solid pillar filling the void beneath the skin, capped by the skin.
module boss_solid() {
    for (i = [0 : insert_count - 1]) {
        a = 45 + i * (360 / insert_count);
        rotate([0, 0, a])
            translate([insert_pos, 0, 0])
                cylinder(h = H + 5, d = boss_dia);   // trimmed by the skin
    }
}

// The insert holes, drilled up from the bottom plane (z = 0).
module insert_holes() {
    for (i = [0 : insert_count - 1]) {
        a = 45 + i * (360 / insert_count);
        rotate([0, 0, a])
            translate([insert_pos, 0, -0.1])
                cylinder(h = insert_depth + 0.1, d = insert_dia + insert_clear);
    }
}

/* ============================ Assembly ============================= */

module garden_light_cap() {
    difference() {
        union() {
            // shell = outer minus the hollow
            difference() {
                outer_solid();
                cavity();
            }
            // add the insert bosses, trimmed to stay under the outer skin
            intersection() {
                boss_solid();
                outer_solid();
            }
        }
        // drill the insert holes
        insert_holes();
    }
}

garden_light_cap();
