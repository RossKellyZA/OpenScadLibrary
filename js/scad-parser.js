/**
 * SCAD Parser - Automatically extracts parameters from OpenSCAD files
 */
class ScadParser {
    /**
     * Parse an OpenSCAD file and extract parameters
     * @param {string} scadCode - The content of the OpenSCAD file
     * @param {string} fileName - The filename of the OpenSCAD file
     * @returns {object} - Parsed project with parameters
     */
    static parseScadFile(scadCode, fileName) {
        console.log(`Parsing file: ${fileName}`);
        
        // Generate ID from filename
        const baseName = fileName.split('/').pop().split('\\').pop();
        const fileNameWithoutExt = baseName.replace(/\.scad$/, '');
        const id = fileNameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Generate readable name from filename
        const name = fileNameWithoutExt
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .replace(/V\d+(\.\d+)?$/, '') // Remove version numbers like V1.6
            .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
            .trim();
        
        const description = `A customizable ${name.toLowerCase()}`;
        
        // Extract parameters from the code
        const parameters = this.extractParameters(scadCode, fileName);
        console.log(`Extracted parameters for ${name}:`, parameters);
        
        return {
            id,
            name,
            file: fileName,
            description,
            parameters
        };
    }
    
    /**
     * Extract parameters and their properties from OpenSCAD code
     * @param {string} scadCode - The OpenSCAD code to parse
     * @param {string} fileName - The filename to determine special cases
     * @returns {object} - The extracted parameters
     */
    static extractParameters(scadCode, fileName) {
        const parameters = {};
        const isPVCAdapter = fileName.includes("pvc-pipe-adapter");
        
        // For PVC Pipe Adapter, use a different extraction strategy
        if (isPVCAdapter) {
            return this.extractPVCAdapterParameters(scadCode);
        }
        
        // Regular expression to match parameter declarations with $ prefix
        const paramRegex = /\$(\w+)\s*=\s*([^;]+);(?:\s*\/\/\s*([^\n]*))?/g;
        
        // Regular expression to identify comment blocks that organize parameters
        const sectionRegex = /\/\*\s*\[([^\]]*)\]\s*\*\//g;
        
        // Get parameter sections to help with organization
        const sections = {};
        let currentSection = "";
        let sectionMatch;
        
        while ((sectionMatch = sectionRegex.exec(scadCode)) !== null) {
            currentSection = sectionMatch[1].trim();
            sections[currentSection] = { index: sectionMatch.index };
        }
        
        // Extract parameters
        let match;
        while ((match = paramRegex.exec(scadCode)) !== null) {
            const [fullMatch, name, value, commentWithRange] = match;
            
            // Skip internal or helper variables explicitly listed in known Hidden section
            if (currentSection === "Hidden" || name.startsWith('$')) {
                // Special exception for $fn which is a common customization parameter
                if (name === 'fn') {
                    // Process $fn as a special case
                    const paramInfo = this.analyzeParameter(name, value, commentWithRange, null);
                    if (paramInfo) {
                        parameters[name] = paramInfo;
                    }
                }
                continue;
            }
            
            // Skip specific variables that are used for internal calculations
            if (name === 'spacing' || name === 'height' || 
                name.includes('fn') && name !== 'fn') continue;
                
            // Parse out the comment and range
            let comment = commentWithRange;
            let range = null;
            
            if (comment) {
                // Look for range pattern like [0:5:100] in the comment
                const rangeMatch = comment.match(/\[\s*([-\d\.]+)\s*:\s*([-\d\.]+)\s*:\s*([-\d\.]+)\s*\]/);
                if (rangeMatch) {
                    range = rangeMatch[0]; // Full matched range
                    comment = comment.replace(range, '').trim();
                }
                // Or simpler pattern like [0:100]
                else {
                    const simpleRangeMatch = comment.match(/\[\s*([-\d\.]+)\s*:\s*([-\d\.]+)\s*\]/);
                    if (simpleRangeMatch) {
                        range = simpleRangeMatch[0];
                        comment = comment.replace(range, '').trim();
                    }
                }
                
                // Extract range without brackets for processing
                if (range) {
                    range = range.substring(1, range.length - 1);
                }
            }
            
            // Determine parameter type and options
            const paramInfo = this.analyzeParameter(name, value, comment, range);
            if (paramInfo) {
                parameters[name] = paramInfo;
            }
        }
        
        return parameters;
    }

    /**
     * Specially designed extractor for PVC pipe adapter parameters
     * @param {string} scadCode - The OpenSCAD code to parse
     * @returns {object} - The extracted parameters
     */
    static extractPVCAdapterParameters(scadCode) {
        const parameters = {};
        
        // Regular expression to match direct variable declarations
        const paramRegex = /^(\w+)\s*=\s*([^;]+);(?:\s*\/\/\s*([^\n]*))?/gm;
        
        // Skip sections marked as hidden
        const hiddenSectionStart = scadCode.indexOf("/* [Hidden]");
        let endSearchIndex = scadCode.length;
        if (hiddenSectionStart !== -1) {
            endSearchIndex = hiddenSectionStart;
        }
        
        const codeToSearch = scadCode.substring(0, endSearchIndex);
        
        // Extract parameters
        let match;
        while ((match = paramRegex.exec(codeToSearch)) !== null) {
            const [fullMatch, name, value, commentWithRange] = match;
            
            // Skip specific internal variables
            if (name === '$fn') continue;
            
            // Parse out the comment and range
            let comment = commentWithRange;
            let range = null;
            
            if (comment) {
                // Look for range pattern like [0:5:100] in the comment
                const rangeMatch = comment.match(/\[\s*([-\d\.]+)\s*:\s*([-\d\.]+)\s*:\s*([-\d\.]+)\s*\]/);
                if (rangeMatch) {
                    range = rangeMatch[0]; // Full matched range
                    comment = comment.replace(range, '').trim();
                }
                // Or simpler pattern like [0:100]
                else {
                    const simpleRangeMatch = comment.match(/\[\s*([-\d\.]+)\s*:\s*([-\d\.]+)\s*\]/);
                    if (simpleRangeMatch) {
                        range = simpleRangeMatch[0];
                        comment = comment.replace(range, '').trim();
                    }
                }
                
                // Extract range without brackets for processing
                if (range) {
                    range = range.substring(1, range.length - 1);
                }
            }
            
            // Determine parameter type and options
            const paramInfo = this.analyzeParameterDirect(name, value, comment, range);
            if (paramInfo) {
                parameters[name] = paramInfo;
            }
        }
        
        return parameters;
    }
    
    /**
     * Analyze a standard parameter to determine its type and properties
     * @param {string} name - Parameter name
     * @param {string} value - Parameter value
     * @param {string} comment - Parameter comment
     * @param {string} range - Parameter range if specified
     * @returns {object|null} - Parameter information object
     */
    static analyzeParameter(name, value, comment, range) {
        // Skip common internal variables and helper calculations
        if (name.includes('fn') && name !== 'fn') {
            return null;
        }
        
        // Try to determine the parameter type
        value = value.trim();
        
        // Type detection
        let type = 'string';
        let options = null;
        let min = null;
        let max = null;
        let step = null;
        let defaultVal = value;
        
        // Check for string literals with quotes
        if (/(["'])(?:(?=(\\?))\2.)*?\1/.test(value)) {
            type = 'string';
            defaultVal = value.replace(/["']/g, '');
        }
        // Check for booleans
        else if (value === 'true' || value === 'false') {
            type = 'boolean';
            defaultVal = value === 'true';
        }
        // Check for numbers
        else if (!isNaN(parseFloat(value)) && isFinite(value.replace(/\s/g, ''))) {
            type = 'number';
            defaultVal = parseFloat(value);
            
            // Try to extract range from comments
            if (range) {
                const rangeValues = range.split(':');
                if (rangeValues.length >= 2) {
                    min = parseFloat(rangeValues[0]);
                    
                    if (rangeValues.length === 3) {
                        step = parseFloat(rangeValues[1]);
                        max = parseFloat(rangeValues[2]);
                    } else {
                        step = 1;
                        max = parseFloat(rangeValues[1]);
                    }
                }
            }
        }
        
        // Check for select/enum values (often in comments with square brackets)
        if (comment && comment.includes('[') && comment.includes(']')) {
            // Find all text between square brackets
            const optionsText = comment.match(/\[(.*?)\]/);
            if (optionsText && optionsText[1]) {
                // Split by commas and clean up
                const optionsList = optionsText[1].split(',').map(o => o.trim());
                if (optionsList.length > 1) {
                    type = 'select';
                    options = optionsList;
                    defaultVal = defaultVal.replace(/["']/g, '');
                }
            }
        }
        
        // Build the parameter object
        const param = {
            type,
            default: defaultVal
        };
        
        if (type === 'number') {
            if (min !== null) param.min = min;
            if (max !== null) param.max = max;
            if (step !== null) param.step = step;
            
            // Set reasonable defaults if no range was specified
            if (min === null) param.min = defaultVal > 0 ? 0 : defaultVal * 2;
            if (max === null) param.max = defaultVal > 0 ? defaultVal * 2 : 0;
            if (step === null) {
                // Calculate a reasonable step value based on the range
                const range = Math.abs(param.max - param.min);
                param.step = range > 100 ? 1 : range > 10 ? 0.1 : 0.01;
            }
        } else if (type === 'select' && options) {
            param.options = options;
        }
        
        return param;
    }
    
    /**
     * Analyze a parameter from direct format (used by PVC adapter)
     * @param {string} name - Parameter name
     * @param {string} value - Parameter value
     * @param {string} comment - Parameter comment
     * @param {string} range - Parameter range if specified
     * @returns {object|null} - Parameter information object
     */
    static analyzeParameterDirect(name, value, comment, range) {
        // Skip internal calculation variables
        const internalVars = ['inlet_outer_diameter', 'outlet_outer_diameter', 'total_length'];
        if (internalVars.includes(name)) {
            return null;
        }
        
        // Try to determine the parameter type
        value = value.trim();
        
        // Type detection
        let type = 'string';
        let options = null;
        let min = null;
        let max = null;
        let step = null;
        let defaultVal = value;
        
        // Check for string literals with quotes
        if (/(["'])(?:(?=(\\?))\2.)*?\1/.test(value)) {
            type = 'string';
            defaultVal = value.replace(/["']/g, '');
        }
        // Check for booleans
        else if (value === 'true' || value === 'false') {
            type = 'boolean';
            defaultVal = value === 'true';
        }
        // Check for numbers
        else if (!isNaN(parseFloat(value)) && isFinite(value.replace(/\s/g, ''))) {
            type = 'number';
            defaultVal = parseFloat(value);
            
            // Try to extract range from comments
            if (range) {
                const rangeValues = range.split(':');
                if (rangeValues.length >= 2) {
                    min = parseFloat(rangeValues[0]);
                    
                    if (rangeValues.length === 3) {
                        step = parseFloat(rangeValues[1]);
                        max = parseFloat(rangeValues[2]);
                    } else {
                        step = 1;
                        max = parseFloat(rangeValues[1]);
                    }
                }
            }
        }
        
        // Build the parameter object
        const param = {
            type,
            default: defaultVal
        };
        
        if (type === 'number') {
            if (min !== null) param.min = min;
            if (max !== null) param.max = max;
            if (step !== null) param.step = step;
            
            // Set reasonable defaults if no range was specified
            if (min === null) param.min = defaultVal > 0 ? 0 : defaultVal * 2;
            if (max === null) param.max = defaultVal > 0 ? defaultVal * 2 : 0;
            if (step === null) {
                // Calculate a reasonable step value based on the range
                const range = Math.abs(param.max - param.min);
                param.step = range > 100 ? 1 : range > 10 ? 0.1 : 0.01;
            }
        }
        
        return param;
    }
}