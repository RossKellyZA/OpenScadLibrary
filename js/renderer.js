/**
 * 3D renderer for OpenSCAD models
 */
class ScadRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        
        this.init();
    }
    
    /**
     * Initialize Three.js scene
     */
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight1.position.set(1, 1, 1);
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-1, -1, -1);
        this.scene.add(directionalLight2);
        
        // Create camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, -100, 100);
        this.camera.up.set(0, 0, 1); // Set Z-up, like OpenSCAD
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.container.appendChild(this.renderer.domElement);
        
        // Add orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        
        // Add a grid and axes
        this.addGrid();
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Start animation loop
        this.animate();
    }
    
    /**
     * Add grid to the scene
     */
    addGrid() {
        const gridHelper = new THREE.GridHelper(200, 20);
        gridHelper.rotateX(Math.PI / 2); // For Z-up orientation
        this.scene.add(gridHelper);
        
        // Axes helper
        const axesHelper = new THREE.AxesHelper(50);
        this.scene.add(axesHelper);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Handle window resize
     */
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    /**
     * Clear the current model from scene
     */
    clearModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel = null;
        }
    }
    
    /**
     * Generate and render a model from OpenSCAD code
     * @param {string} scadCode - OpenSCAD code
     * @param {object} parameters - Parameter values to use
     */
    async renderModel(scadCode, parameters) {
        this.clearModel();
        
        try {
            console.log('Rendering with parameters:', parameters);
            
            // Replace parameters in the SCAD code
            let processedScad = scadCode;
            for (const [key, value] of Object.entries(parameters)) {
                let replacementValue;
                if (typeof value === 'boolean') {
                    replacementValue = value ? 'true' : 'false';
                } else if (typeof value === 'number') {
                    replacementValue = value.toString();
                } else if (typeof value === 'string') {
                    replacementValue = `"${value}"`;
                }
                
                // Check for both styles of parameter declarations:
                // 1. $key = value; (for standard parameters)
                // 2. key = value; (for direct declarations like PVC adapter)
                let replaced = false;
                
                // Try with $ prefix first
                const dollarRegex = new RegExp(`\\$${key}\\s*=\\s*[^;]+;`, 'g');
                if (processedScad.match(dollarRegex)) {
                    // Replace existing parameter with $ prefix
                    processedScad = processedScad.replace(dollarRegex, `$${key} = ${replacementValue};`);
                    replaced = true;
                }
                
                // Try without $ prefix
                const normalRegex = new RegExp(`^${key}\\s*=\\s*[^;]+;`, 'gm');
                if (processedScad.match(normalRegex)) {
                    // Replace existing direct parameter
                    processedScad = processedScad.replace(normalRegex, `${key} = ${replacementValue};`);
                    replaced = true;
                }
                
                // If not replaced by either method, add as a new parameter
                if (!replaced) {
                    if (scadCode.includes('$fn')) {
                        // If the file uses $ prefix style, add with $
                        processedScad = `$${key} = ${replacementValue};\n${processedScad}`;
                    } else {
                        // Otherwise add without $
                        processedScad = `${key} = ${replacementValue};\n${processedScad}`;
                    }
                }
            }
            
            // For demonstration, create a model based on parameters
            if (parameters.hasOwnProperty('width') && parameters.hasOwnProperty('depth') && 
                parameters.hasOwnProperty('height')) {
                // Simple Box
                this.createBox(parameters);
            } else if (parameters.hasOwnProperty('radius') && parameters.hasOwnProperty('teeth')) {
                // Gear
                this.createGear(parameters);
            } else if (parameters.hasOwnProperty('Text') && parameters.hasOwnProperty('Font_name')) {
                // Name Keyring
                this.createNameKeyring(parameters);
            } else if (parameters.hasOwnProperty('inlet_inner_diameter') && parameters.hasOwnProperty('outlet_inner_diameter')) {
                // PVC Pipe Adapter
                this.createPipeAdapter(parameters);
            } else {
                // Default cube
                this.createDefaultModel();
            }
        } catch (error) {
            console.error('Error rendering model:', error);
            this.createErrorModel();
        }
    }
    
    /**
     * Create a simple box with the given parameters
     * @param {object} params - Box parameters
     */
    createBox(params) {
        const width = params.width || 50;
        const depth = params.depth || 50;
        const height = params.height || 50;
        const wall = params.wall_thickness || 2;
        const hasLid = params.has_lid !== undefined ? params.has_lid : true;
        
        const group = new THREE.Group();
        
        // Create box
        const boxGeometry = new THREE.BoxGeometry(width, depth, height);
        const innerGeometry = new THREE.BoxGeometry(width - wall * 2, depth - wall * 2, height - wall);
        const boxMaterial = new THREE.MeshPhongMaterial({ color: 0x3f7cac });
        
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        const innerMesh = new THREE.Mesh(innerGeometry, boxMaterial);
        
        innerMesh.position.z = wall / 2;
        
        // Create CSG operation (subtract inner from outer)
        const boxCSG = CSG.fromMesh(boxMesh);
        const innerCSG = CSG.fromMesh(innerMesh);
        const resultCSG = boxCSG.subtract(innerCSG);
        const resultMesh = CSG.toMesh(resultCSG, boxMesh.matrix, boxMesh.material);
        
        group.add(resultMesh);
        
        // Add lid if needed
        if (hasLid) {
            const lidGeometry = new THREE.BoxGeometry(width, depth, wall);
            const lidMesh = new THREE.Mesh(lidGeometry, boxMaterial);
            lidMesh.position.z = height + 10; // Position above the box
            group.add(lidMesh);
        }
        
        // Position and add to scene
        group.position.set(0, 0, height / 2);
        this.scene.add(group);
        this.currentModel = group;
        
        // Center camera on model
        this.centerCamera();
    }
    
    /**
     * Create a simple gear with the given parameters
     * @param {object} params - Gear parameters
     */
    createGear(params) {
        const radius = params.radius || 30;
        const teeth = params.teeth || 20;
        const thickness = params.thickness || 5;
        const holeDiameter = params.hole_diameter || 6;
        const hasKeyway = params.has_keyway || false;
        const keyWidth = params.keyway_width || 3;
        const keyDepth = params.keyway_depth || 2;
        
        const group = new THREE.Group();
        
        // Create gear outline
        const gearShape = new THREE.Shape();
        const outerRadius = radius;
        const innerRadius = radius - 5;
        const toothSize = 5;
        
        // Create basic circle
        gearShape.moveTo(outerRadius, 0);
        for (let i = 0; i < teeth; i++) {
            const angle1 = (i / teeth) * Math.PI * 2;
            const angle2 = ((i + 0.5) / teeth) * Math.PI * 2;
            const angle3 = ((i + 1) / teeth) * Math.PI * 2;
            
            const x1 = Math.cos(angle1) * outerRadius;
            const y1 = Math.sin(angle1) * outerRadius;
            
            const x2 = Math.cos(angle2) * (outerRadius + toothSize);
            const y2 = Math.sin(angle2) * (outerRadius + toothSize);
            
            const x3 = Math.cos(angle3) * outerRadius;
            const y3 = Math.sin(angle3) * outerRadius;
            
            gearShape.lineTo(x1, y1);
            gearShape.lineTo(x2, y2);
            gearShape.lineTo(x3, y3);
        }
        
        gearShape.closePath();
        
        // Create a hole in the center
        if (holeDiameter > 0) {
            const holePath = new THREE.Path();
            holePath.absarc(0, 0, holeDiameter / 2, 0, Math.PI * 2, true);
            gearShape.holes.push(holePath);
            
            // Add keyway if needed
            if (hasKeyway && holeDiameter > 0) {
                const keyPath = new THREE.Path();
                const holeRadius = holeDiameter / 2;
                
                keyPath.moveTo(holeRadius, -keyWidth / 2);
                keyPath.lineTo(holeRadius + keyDepth, -keyWidth / 2);
                keyPath.lineTo(holeRadius + keyDepth, keyWidth / 2);
                keyPath.lineTo(holeRadius, keyWidth / 2);
                
                gearShape.holes.push(keyPath);
            }
        }
        
        const extrudeSettings = {
            steps: 1,
            depth: thickness,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(gearShape, extrudeSettings);
        const material = new THREE.MeshPhongMaterial({ color: 0x3f7cac });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Rotate to be flat on the XY plane
        mesh.rotation.x = -Math.PI / 2;
        
        group.add(mesh);
        this.scene.add(group);
        this.currentModel = group;
        
        // Center camera on model
        this.centerCamera();
    }
    
    /**
     * Create a name keyring with the given parameters
     * @param {object} params - Keyring parameters
     */
    createNameKeyring(params) {
        const text = params.Text || 'Name';
        const twist = params.twist || -5;
        const center = params.center || 30;
        const loopChar = params.Loop_character || 'o';
        const rotation = params.Rotation || 50;
        
        const group = new THREE.Group();
        
        // Create a simple visualization for the name keyring
        // Main text part
        const letters = text.split('');
        let xOffset = -center;
        
        // Set a base color and material
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x5588cc,
            specular: 0x111111,
            shininess: 30
        });
        
        // Create text letters with varying heights
        letters.forEach((letter, i) => {
            // Get letter height from parameters or use a default value (5)
            const letterHeight = params[`letter_${i+1}_height`] || 5;
            
            // Get letter spacing from parameters or use a default value
            const letterSpacing = params[`letter_${i+1}_space`] || 10;
            
            if (i > 0) {
                xOffset += letterSpacing;
            }
            
            // Create a simple representation of each letter
            // In a real implementation, we'd use actual text geometry
            const letterGeometry = new THREE.BoxGeometry(8, 12, letterHeight);
            const letterMesh = new THREE.Mesh(letterGeometry, material);
            letterMesh.position.set(xOffset, 0, letterHeight/2);
            
            // Apply twist based on the letter's position
            const normalizedPos = (xOffset + center) / (text.length * 10);
            const letterTwist = twist * (normalizedPos - 0.5);
            letterMesh.rotation.z = letterTwist * Math.PI / 180;
            
            group.add(letterMesh);
        });
        
        // Create loop character
        const loopGeometry = new THREE.TorusGeometry(10, 2, 16, 32);
        const loopMaterial = new THREE.MeshPhongMaterial({ color: 0x5588cc });
        const loopMesh = new THREE.Mesh(loopGeometry, loopMaterial);
        
        // Position the loop
        loopMesh.position.set(-center - params.Loop_x_position, params.Loop_y_position, 1.5);
        loopMesh.rotation.x = Math.PI / 2;
        
        group.add(loopMesh);
        
        // Apply overall rotation
        group.rotation.z = rotation * Math.PI / 180;
        
        this.scene.add(group);
        this.currentModel = group;
        
        // Center camera on model
        this.centerCamera();
    }
    
    /**
     * Create a PVC pipe adapter with the given parameters
     * @param {object} params - Pipe adapter parameters
     */
    createPipeAdapter(params) {
        const inletDiameter = params.inlet_inner_diameter || 80;
        const outletDiameter = params.outlet_inner_diameter || 40;
        const inletLength = params.inlet_length || 30;
        const outletLength = params.outlet_length || 30;
        const transitionLength = params.transition_length || 100;
        const wallThickness = params.wall_thickness || 3;
        const addInletRing = params.add_inlet_ring !== undefined ? params.add_inlet_ring : false;
        const addOutletRing = params.add_outlet_ring !== undefined ? params.add_outlet_ring : false;
        const ringThickness = params.ring_thickness || 3;
        const ringHeight = params.ring_height || 5;
        
        const totalLength = inletLength + transitionLength + outletLength;
        const group = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x7ab5c5,
            specular: 0x111111,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });
        
        // Create outer parts of the adapter
        // Inlet straight section
        const inletOuterGeometry = new THREE.CylinderGeometry(
            inletDiameter/2 + wallThickness, inletDiameter/2 + wallThickness, inletLength, 32
        );
        const inletOuterMesh = new THREE.Mesh(inletOuterGeometry, material);
        inletOuterMesh.position.y = -(transitionLength + outletLength)/2;
        
        // Transition section (tapered)
        const transitionOuterGeometry = new THREE.CylinderGeometry(
            outletDiameter/2 + wallThickness, inletDiameter/2 + wallThickness, transitionLength, 32
        );
        const transitionOuterMesh = new THREE.Mesh(transitionOuterGeometry, material);
        transitionOuterMesh.position.y = -outletLength/2;
        
        // Outlet straight section
        const outletOuterGeometry = new THREE.CylinderGeometry(
            outletDiameter/2 + wallThickness, outletDiameter/2 + wallThickness, outletLength, 32
        );
        const outletOuterMesh = new THREE.Mesh(outletOuterGeometry, material);
        outletOuterMesh.position.y = transitionLength/2;
        
        // Add the outer parts to the group
        group.add(inletOuterMesh);
        group.add(transitionOuterMesh);
        group.add(outletOuterMesh);
        
        // Add support rings if enabled
        if (addInletRing) {
            const ringGeometry = new THREE.TorusGeometry(
                inletDiameter/2 + wallThickness + ringThickness, 
                ringHeight/2, 
                16, 
                32
            );
            const ringMesh = new THREE.Mesh(ringGeometry, material);
            ringMesh.rotation.x = Math.PI/2;
            ringMesh.position.y = -(transitionLength + inletLength/2);
            group.add(ringMesh);
        }
        
        if (addOutletRing) {
            const ringGeometry = new THREE.TorusGeometry(
                outletDiameter/2 + wallThickness + ringThickness, 
                ringHeight/2, 
                16, 
                32
            );
            const ringMesh = new THREE.Mesh(ringGeometry, material);
            ringMesh.rotation.x = Math.PI/2;
            ringMesh.position.y = outletLength/2;
            group.add(ringMesh);
        }
        
        // Create inner hollow (cutout)
        const inletInnerDiameter = inletDiameter;
        const outletInnerDiameter = outletDiameter;
        
        // Make the pipe hollow by showing a cutaway view
        const cutawayMaterial = new THREE.MeshPhongMaterial({
            color: 0x444444,
            side: THREE.BackSide
        });
        
        // Inlet inner section
        const inletInnerGeometry = new THREE.CylinderGeometry(
            inletInnerDiameter/2, inletInnerDiameter/2, inletLength + 0.1, 32
        );
        const inletInnerMesh = new THREE.Mesh(inletInnerGeometry, cutawayMaterial);
        inletInnerMesh.position.y = -(transitionLength + outletLength)/2;
        
        // Transition inner section
        const transitionInnerGeometry = new THREE.CylinderGeometry(
            outletInnerDiameter/2, inletInnerDiameter/2, transitionLength + 0.1, 32
        );
        const transitionInnerMesh = new THREE.Mesh(transitionInnerGeometry, cutawayMaterial);
        transitionInnerMesh.position.y = -outletLength/2;
        
        // Outlet inner section
        const outletInnerGeometry = new THREE.CylinderGeometry(
            outletInnerDiameter/2, outletInnerDiameter/2, outletLength + 0.1, 32
        );
        const outletInnerMesh = new THREE.Mesh(outletInnerGeometry, cutawayMaterial);
        outletInnerMesh.position.y = transitionLength/2;
        
        // Add the inner parts to show the hollow
        group.add(inletInnerMesh);
        group.add(transitionInnerMesh);
        group.add(outletInnerMesh);
        
        // Add a cutaway view to show the inner structure
        const cutPlaneGeometry = new THREE.PlaneGeometry(totalLength * 2, Math.max(inletDiameter, outletDiameter) * 2);
        const cutPlaneMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const cutPlane = new THREE.Mesh(cutPlaneGeometry, cutPlaneMaterial);
        cutPlane.position.x = 0;
        cutPlane.position.y = 0;
        cutPlane.rotation.y = Math.PI/2;
        group.add(cutPlane);
        
        // Rotate to orient like the OpenSCAD model (vertical)
        group.rotation.x = Math.PI/2;
        
        // Add to scene
        this.scene.add(group);
        this.currentModel = group;
        
        // Center camera on model
        this.centerCamera();
    }
    
    /**
     * Create a default model when parameters don't match
     */
    createDefaultModel() {
        const geometry = new THREE.BoxGeometry(50, 50, 50);
        const material = new THREE.MeshPhongMaterial({ color: 0x3f7cac });
        const mesh = new THREE.Mesh(geometry, material);
        
        this.scene.add(mesh);
        this.currentModel = mesh;
        
        this.centerCamera();
    }
    
    /**
     * Create a model to indicate error
     */
    createErrorModel() {
        const geometry = new THREE.SphereGeometry(25, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        
        this.scene.add(mesh);
        this.currentModel = mesh;
        
        this.centerCamera();
    }
    
    /**
     * Center camera on model
     */
    centerCamera() {
        if (!this.currentModel) return;
        
        this.controls.reset();
        
        // Calculate bounding box
        const boundingBox = new THREE.Box3().setFromObject(this.currentModel);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        
        // Position camera to view the entire model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));
        
        // Adjust distance for better view
        cameraDistance *= 1.5;
        
        this.camera.position.set(center.x, center.y - cameraDistance, center.z + cameraDistance / 2);
        this.camera.lookAt(center);
        this.controls.target.set(center.x, center.y, center.z);
        this.controls.update();
    }
    
    /**
     * Generate and download STL file for the current model
     */
    exportSTL() {
        if (!this.currentModel) {
            console.error('No model to export');
            return;
        }
        
        try {
            // Create exporter
            const exporter = new THREE.STLExporter();
            const result = exporter.parse(this.currentModel, { binary: true });
            
            // Create download link
            const blob = new Blob([result], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = 'model.stl';
            link.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting STL:', error);
            alert('Error exporting STL file. Please try again.');
        }
    }
}

// STL Exporter class needed for STL export
THREE.STLExporter = function () {};

THREE.STLExporter.prototype = {
    constructor: THREE.STLExporter,
    
    parse: function (scene, options) {
        options = options || {};
        
        const binary = options.binary !== undefined ? options.binary : true;
        
        //
        // ASCII STL
        //
        if (!binary) {
            const output = '';
            output += 'solid exported\n';
            
            scene.traverse(function(object) {
                if (object instanceof THREE.Mesh) {
                    const geometry = object.geometry;
                    const matrixWorld = object.matrixWorld;
                    
                    if (geometry instanceof THREE.BufferGeometry) {
                        const vertices = geometry.getAttribute('position');
                        const indices = geometry.getIndex();
                        
                        if (indices) {
                            // Indexed geometry
                            for (let i = 0; i < indices.count; i += 3) {
                                output += '\tfacet normal 0 0 0\n';
                                output += '\t\touter loop\n';
                                
                                const a = new THREE.Vector3();
                                a.fromBufferAttribute(vertices, indices.getX(i));
                                a.applyMatrix4(matrixWorld);
                                
                                const b = new THREE.Vector3();
                                b.fromBufferAttribute(vertices, indices.getX(i + 1));
                                b.applyMatrix4(matrixWorld);
                                
                                const c = new THREE.Vector3();
                                c.fromBufferAttribute(vertices, indices.getX(i + 2));
                                c.applyMatrix4(matrixWorld);
                                
                                output += '\t\t\tvertex ' + a.x + ' ' + a.y + ' ' + a.z + '\n';
                                output += '\t\t\tvertex ' + b.x + ' ' + b.y + ' ' + b.z + '\n';
                                output += '\t\t\tvertex ' + c.x + ' ' + c.y + ' ' + c.z + '\n';
                                
                                output += '\t\tendloop\n';
                                output += '\tendfacet\n';
                            }
                        } else {
                            // Non-indexed geometry
                            for (let i = 0; i < vertices.count; i += 3) {
                                output += '\tfacet normal 0 0 0\n';
                                output += '\t\touter loop\n';
                                
                                const a = new THREE.Vector3();
                                a.fromBufferAttribute(vertices, i);
                                a.applyMatrix4(matrixWorld);
                                
                                const b = new THREE.Vector3();
                                b.fromBufferAttribute(vertices, i + 1);
                                b.applyMatrix4(matrixWorld);
                                
                                const c = new THREE.Vector3();
                                c.fromBufferAttribute(vertices, i + 2);
                                c.applyMatrix4(matrixWorld);
                                
                                output += '\t\t\tvertex ' + a.x + ' ' + a.y + ' ' + a.z + '\n';
                                output += '\t\t\tvertex ' + b.x + ' ' + b.y + ' ' + b.z + '\n';
                                output += '\t\t\tvertex ' + c.x + ' ' + c.y + ' ' + c.z + '\n';
                                
                                output += '\t\tendloop\n';
                                output += '\tendfacet\n';
                            }
                        }
                    }
                }
            });
            
            output += 'endsolid exported\n';
            
            return output;
        }
        
        //
        // Binary STL
        //
        
        // Count triangles
        let triangles = 0;
        scene.traverse(function(object) {
            if (object instanceof THREE.Mesh) {
                const geometry = object.geometry;
                
                if (geometry instanceof THREE.BufferGeometry) {
                    const vertices = geometry.getAttribute('position');
                    const indices = geometry.getIndex();
                    
                    if (indices) {
                        triangles += indices.count / 3;
                    } else {
                        triangles += vertices.count / 3;
                    }
                }
            }
        });
        
        // Allocate buffer
        const bufferSize = 84 + (50 * triangles);
        const buffer = new ArrayBuffer(bufferSize);
        const dataView = new DataView(buffer);
        let offset = 0;
        
        // Write STL header (80 bytes)
        const encoder = new TextEncoder();
        const headerText = 'OpenSCAD Interface exported STL';
        const headerArray = encoder.encode(headerText);
        for (let i = 0; i < 80; i++) {
            if (i < headerArray.length) {
                dataView.setUint8(i, headerArray[i]);
            } else {
                dataView.setUint8(i, 0);
            }
        }
        
        offset += 80;
        
        // Write number of triangles
        dataView.setUint32(offset, triangles, true);
        offset += 4;
        
        // Write triangle data
        scene.traverse(function(object) {
            if (object instanceof THREE.Mesh) {
                const geometry = object.geometry;
                const matrixWorld = object.matrixWorld;
                
                if (geometry instanceof THREE.BufferGeometry) {
                    const vertices = geometry.getAttribute('position');
                    const normals = geometry.getAttribute('normal');
                    const indices = geometry.getIndex();
                    
                    // Helper functions for vertex and normal handling
                    const getVertexFromIndex = function(index, target) {
                        target.fromBufferAttribute(vertices, index);
                        target.applyMatrix4(matrixWorld);
                    };
                    
                    const getNormalFromIndex = function(index, target) {
                        if (normals) {
                            target.fromBufferAttribute(normals, index);
                            target.transformDirection(matrixWorld);
                        } else {
                            target.set(0, 0, 0);
                        }
                    };
                    
                    // Vertex data containers
                    const vA = new THREE.Vector3();
                    const vB = new THREE.Vector3();
                    const vC = new THREE.Vector3();
                    const cb = new THREE.Vector3();
                    const ab = new THREE.Vector3();
                    const normal = new THREE.Vector3();
                    
                    if (indices) {
                        // Indexed geometry
                        for (let i = 0; i < indices.count; i += 3) {
                            const a = indices.getX(i);
                            const b = indices.getX(i + 1);
                            const c = indices.getX(i + 2);
                            
                            getVertexFromIndex(a, vA);
                            getVertexFromIndex(b, vB);
                            getVertexFromIndex(c, vC);
                            
                            // Calculate normal if not provided
                            if (!normals) {
                                cb.subVectors(vC, vB);
                                ab.subVectors(vA, vB);
                                cb.cross(ab).normalize();
                                normal.copy(cb);
                            } else {
                                getNormalFromIndex(a, normal);
                            }
                            
                            // Write normal
                            dataView.setFloat32(offset, normal.x, true); offset += 4;
                            dataView.setFloat32(offset, normal.y, true); offset += 4;
                            dataView.setFloat32(offset, normal.z, true); offset += 4;
                            
                            // Write vertices
                            dataView.setFloat32(offset, vA.x, true); offset += 4;
                            dataView.setFloat32(offset, vA.y, true); offset += 4;
                            dataView.setFloat32(offset, vA.z, true); offset += 4;
                            dataView.setFloat32(offset, vB.x, true); offset += 4;
                            dataView.setFloat32(offset, vB.y, true); offset += 4;
                            dataView.setFloat32(offset, vB.z, true); offset += 4;
                            dataView.setFloat32(offset, vC.x, true); offset += 4;
                            dataView.setFloat32(offset, vC.y, true); offset += 4;
                            dataView.setFloat32(offset, vC.z, true); offset += 4;
                            
                            // Attribute byte count (unused)
                            offset += 2;
                        }
                    } else {
                        // Non-indexed geometry
                        for (let i = 0; i < vertices.count; i += 3) {
                            getVertexFromIndex(i, vA);
                            getVertexFromIndex(i + 1, vB);
                            getVertexFromIndex(i + 2, vC);
                            
                            // Calculate normal if not provided
                            if (!normals) {
                                cb.subVectors(vC, vB);
                                ab.subVectors(vA, vB);
                                cb.cross(ab).normalize();
                                normal.copy(cb);
                            } else {
                                getNormalFromIndex(i, normal);
                            }
                            
                            // Write normal
                            dataView.setFloat32(offset, normal.x, true); offset += 4;
                            dataView.setFloat32(offset, normal.y, true); offset += 4;
                            dataView.setFloat32(offset, normal.z, true); offset += 4;
                            
                            // Write vertices
                            dataView.setFloat32(offset, vA.x, true); offset += 4;
                            dataView.setFloat32(offset, vA.y, true); offset += 4;
                            dataView.setFloat32(offset, vA.z, true); offset += 4;
                            dataView.setFloat32(offset, vB.x, true); offset += 4;
                            dataView.setFloat32(offset, vB.y, true); offset += 4;
                            dataView.setFloat32(offset, vB.z, true); offset += 4;
                            dataView.setFloat32(offset, vC.x, true); offset += 4;
                            dataView.setFloat32(offset, vC.y, true); offset += 4;
                            dataView.setFloat32(offset, vC.z, true); offset += 4;
                            
                            // Attribute byte count (unused)
                            offset += 2;
                        }
                    }
                }
            }
        });
        
        return buffer;
    }
};

// CSG operations for THREE.js (stub implementation for demo)
const CSG = {
    fromMesh: function (mesh) {
        return {
            subtract: function (other) {
                return this;
            }
        };
    },
    
    toMesh: function (csg, matrix, material) {
        // In a real implementation, this would convert CSG back to a THREE.js mesh
        return new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 50),
            material
        );
    }
};