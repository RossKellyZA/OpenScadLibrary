/**
 * Main application script for OpenSCAD Interface
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize components
    const renderer = new ScadRenderer('viewer');
    
    // Current state
    let currentProject = null;
    let currentParameters = {};
    
    // Initialize UI
    initUI();
    
    // Initialize project manager and load projects
    console.log('Initializing ProjectManager...');
    try {
        await projectManager.init();
        const projects = projectManager.getProjects();
        console.log(`Loaded ${projects.length} projects:`, projects);
        populateProjectList(projects);
    } catch (error) {
        console.error('Error initializing projects:', error);
    }
    
    /**
     * Initialize UI event listeners
     */
    function initUI() {
        // Render button
        document.getElementById('render-btn').addEventListener('click', () => {
            if (!currentProject) return;
            renderCurrentProject();
        });
        
        // Export STL button
        document.getElementById('export-stl-btn').addEventListener('click', () => {
            renderer.exportSTL();
        });
    }
    
    /**
     * Render the current project with current parameters
     */
    async function renderCurrentProject() {
        if (!currentProject) return;
        
        try {
            // Fetch the SCAD code
            const response = await fetch(currentProject.file);
            if (!response.ok) {
                throw new Error(`Failed to load SCAD file: ${currentProject.file}`);
            }
            
            const scadCode = await response.text();
            renderer.renderModel(scadCode, currentParameters);
        } catch (error) {
            console.error('Error rendering project:', error);
        }
    }
    
    /**
     * Populate project list in sidebar
     * @param {Array} projects - List of available projects
     */
    function populateProjectList(projects) {
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = '';
        
        if (projects.length === 0) {
            projectList.innerHTML = '<div class="project-item error">No projects found</div>';
            return;
        }
        
        projects.forEach(project => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.textContent = project.name;
            div.dataset.id = project.id;
            
            div.addEventListener('click', async () => {
                // Deselect all projects
                document.querySelectorAll('.project-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Select this project
                div.classList.add('selected');
                
                // Set current project
                currentProject = project;
                
                // Set default parameters
                currentParameters = {};
                Object.entries(project.parameters).forEach(([paramName, paramConfig]) => {
                    currentParameters[paramName] = paramConfig.default;
                });
                
                // Update UI
                updateParameterControls();
                
                // Render the model
                renderCurrentProject();
            });
            
            projectList.appendChild(div);
        });
        
        // Select first project by default if available
        if (projects.length > 0) {
            projectList.querySelector('.project-item').click();
        }
    }
    
    /**
     * Create parameter controls for the current project
     */
    function updateParameterControls() {
        const parametersForm = document.getElementById('parameters-form');
        parametersForm.innerHTML = '';
        
        if (!currentProject) return;
        
        Object.entries(currentProject.parameters).forEach(([paramName, paramConfig]) => {
            const paramGroup = document.createElement('div');
            paramGroup.className = 'parameter-group';
            
            const label = document.createElement('label');
            label.className = 'parameter-label';
            label.textContent = formatParamName(paramName);
            
            const currentValue = currentParameters[paramName];
            let input;
            
            if (paramConfig.type === 'number') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = paramConfig.min !== undefined ? paramConfig.min : 0;
                input.max = paramConfig.max !== undefined ? paramConfig.max : 100;
                input.step = paramConfig.step !== undefined ? paramConfig.step : 1;
                input.value = currentValue;
                
                const valueDisplay = document.createElement('span');
                valueDisplay.textContent = currentValue;
                valueDisplay.style.marginLeft = '8px';
                
                input.addEventListener('input', () => {
                    const value = parseFloat(input.value);
                    valueDisplay.textContent = value;
                    updateParameter(paramName, value);
                });
                
                label.appendChild(valueDisplay);
            } else if (paramConfig.type === 'boolean') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = currentValue;
                
                input.addEventListener('change', () => {
                    updateParameter(paramName, input.checked);
                });
            } else if (paramConfig.type === 'select') {
                input = document.createElement('select');
                input.className = 'parameter-input';
                
                // Add options to select element
                if (paramConfig.options && Array.isArray(paramConfig.options)) {
                    paramConfig.options.forEach(option => {
                        const optElement = document.createElement('option');
                        optElement.value = option;
                        optElement.textContent = option;
                        if (option === currentValue) {
                            optElement.selected = true;
                        }
                        input.appendChild(optElement);
                    });
                }
                
                input.addEventListener('change', () => {
                    updateParameter(paramName, input.value);
                });
            } else {
                // Text or other types
                input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue;
                
                input.addEventListener('change', () => {
                    updateParameter(paramName, input.value);
                });
            }
            
            input.className = 'parameter-input';
            
            paramGroup.appendChild(label);
            paramGroup.appendChild(input);
            parametersForm.appendChild(paramGroup);
        });
    }
    
    /**
     * Update a parameter in the current project
     * @param {string} paramName - Name of the parameter
     * @param {any} value - New value for the parameter
     */
    function updateParameter(paramName, value) {
        if (!currentProject) return;
        
        currentParameters[paramName] = value;
    }
    
    /**
     * Format parameter name for display (e.g., wall_thickness -> Wall Thickness)
     * @param {string} name - Parameter name
     * @returns {string} Formatted name
     */
    function formatParamName(name) {
        return name
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
});