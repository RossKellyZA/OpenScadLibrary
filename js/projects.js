/**
 * Project manager responsible for loading available OpenSCAD projects
 */
class ProjectManager {
    constructor() {
        this.projects = [];
    }
    
    /**
     * Initialize project manager by loading projects
     */
    async init() {
        try {
            await this.loadProjects();
        } catch (error) {
            console.error('Error initializing project manager:', error);
        }
    }
    
    /**
     * Load projects - combines statically defined projects with dynamically discovered ones
     */
    async loadProjects() {
        this.projects = [];
        
        // Get list of SCAD files
        const scadFiles = this.getScadFiles();
        
        // Process each SCAD file
        for (const file of scadFiles) {
            try {
                const project = await this.parseScadFile(file);
                if (project) {
                    this.projects.push(project);
                }
            } catch (error) {
                console.error(`Error parsing SCAD file ${file}:`, error);
            }
        }
        
        // Sort projects by name
        this.projects.sort((a, b) => a.name.localeCompare(b.name));
        
        return this.projects;
    }
    
    /**
     * Get list of SCAD files
     * @returns {string[]} - List of SCAD file paths
     */
    getScadFiles() {
        // Known SCAD files in the models directory
        return [
            'models/simple-box.scad',
            'models/customizable-gear.scad',
            'models/NameKeyringV1.6.scad',
            'models/pvc-pipe-adapter.scad'
        ];
    }
    
    /**
     * Parse a SCAD file to extract project information
     * @param {string} filePath - Path to the SCAD file
     * @returns {Promise<object>} - Project object
     */
    async parseScadFile(filePath) {
        try {
            console.log(`Loading file: ${filePath}`);
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`Failed to load SCAD file: ${filePath} (${response.status})`);
            }
            
            const scadCode = await response.text();
            return ScadParser.parseScadFile(scadCode, filePath);
        } catch (error) {
            console.error(`Error loading SCAD file ${filePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Get all available projects
     * @returns {object[]} - List of projects
     */
    getProjects() {
        return this.projects;
    }
    
    /**
     * Get a project by ID
     * @param {string} id - Project ID
     * @returns {object|null} - Project object or null if not found
     */
    getProject(id) {
        return this.projects.find(project => project.id === id) || null;
    }
}

// Create and export a singleton instance
const projectManager = new ProjectManager();