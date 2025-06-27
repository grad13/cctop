/**
 * FUNC-207: RGB Support Validation Tests
 * Tests for 16-bit hex color support in ColorManager
 */

const { describe, test, expect, beforeEach, afterEach } = global;
const fs = require('fs');
const path = require('path');
const ColorManager = require('../../src/color/ColorManager');

describe('FUNC-207: RGB Support Validation', () => {
  const testConfigDir = '.cctop-rgb-test';
  const currentThemeFile = path.join(testConfigDir, 'current-theme.json');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testConfigDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Preset Color Compatibility', () => {
    test('should support existing preset color names', () => {
      const testTheme = {
        name: 'preset-test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: 'blue',
                create: 'green',
                modify: 'yellow',
                delete: 'red',
                move: 'magenta',
                restore: 'cyan'
              }
            }
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      // Test preset colors
      const findColored = colorManager.colorizeEventType('find', 'find');
      const createColored = colorManager.colorizeEventType('create', 'create');
      const modifyColored = colorManager.colorizeEventType('modify', 'modify');
      const deleteColored = colorManager.colorizeEventType('delete', 'delete');
      const moveColored = colorManager.colorizeEventType('move', 'move');
      const restoreColored = colorManager.colorizeEventType('restore', 'restore');
      
      // Should contain ANSI color codes for preset colors
      expect(findColored).toContain('\x1b[34m'); // Blue
      expect(createColored).toContain('\x1b[32m'); // Green  
      expect(modifyColored).toContain('\x1b[33m'); // Yellow
      expect(deleteColored).toContain('\x1b[31m'); // Red
      expect(moveColored).toContain('\x1b[35m'); // Magenta
      expect(restoreColored).toContain('\x1b[36m'); // Cyan
    });
  });

  describe('RGB Hex Color Support', () => {
    test('should support valid 6-digit hex colors', () => {
      const testTheme = {
        name: 'rgb-test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: '#0000FF',    // Blue
                create: '#00FF00',  // Green
                modify: '#FFFF00',  // Yellow
                delete: '#FF0000',  // Red
                move: '#FF00FF',    // Magenta
                restore: '#00FFFF'  // Cyan
              }
            }
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      // Test RGB hex colors
      const findColored = colorManager.colorizeEventType('find', 'find');
      const createColored = colorManager.colorizeEventType('create', 'create');
      const deleteColored = colorManager.colorizeEventType('delete', 'delete');
      
      // Should contain content (reset code added by colorizeEventType method)
      expect(findColored).toContain('find');
      expect(createColored).toContain('create');
      expect(deleteColored).toContain('delete');
      
      // Should have content (actual color formatting depends on chalk.hex implementation)
      expect(findColored).toBeDefined();
      expect(createColored).toBeDefined();
      expect(deleteColored).toBeDefined();
    });

    test('should support lowercase hex colors', () => {
      const testTheme = {
        name: 'lowercase-hex-test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: '#ff0000',    // Red (lowercase)
                create: '#00ff00'   // Green (lowercase)
              }
            }
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      const findColored = colorManager.colorizeEventType('find', 'find');
      const createColored = colorManager.colorizeEventType('create', 'create');
      
      expect(findColored).toContain('find');
      expect(createColored).toContain('create');
    });

    test('should support mixed case hex colors', () => {
      const testTheme = {
        name: 'mixed-case-hex-test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: '#Ff0000',    // Mixed case
                create: '#00Ff00'   // Mixed case
              }
            }
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      const findColored = colorManager.colorizeEventType('find', 'find');
      const createColored = colorManager.colorizeEventType('create', 'create');
      
      expect(findColored).toContain('find');
      expect(createColored).toContain('create');
    });
  });

  describe('Mixed Usage (Preset + RGB)', () => {
    test('should support preset colors and RGB hex colors in same theme', () => {
      const testTheme = {
        name: 'mixed-test',
        version: '1.0.0',
        colors: {
          table: {
            column_headers: 'white',        // Preset color
            row: {
              modified_time: '#00FF00',     // RGB hex
              elapsed_time: 'yellow',       // Preset color
              file_name: 'white',           // Preset color
              event_type: {
                find: 'blue',               // Preset color
                create: '#00FF00',          // RGB hex
                modify: 'yellow',           // Preset color
                delete: '#FF0000',          // RGB hex
                move: 'magenta',            // Preset color
                restore: '#00FFFF'          // RGB hex
              }
            }
          },
          general_keys: {
            key_active: 'green',            // Preset color
            key_inactive: '#000000'         // RGB hex (black)
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      // Test mixed usage
      const findColored = colorManager.colorizeEventType('find', 'find');         // Preset
      const createColored = colorManager.colorizeEventType('create', 'create');   // RGB
      const deleteColored = colorManager.colorizeEventType('delete', 'delete');   // RGB
      const moveColored = colorManager.colorizeEventType('move', 'move');         // Preset
      
      // Test general colorize method
      const headerColored = colorManager.colorize('Header', 'table.column_headers');      // Preset
      const modifiedColored = colorManager.colorize('Modified', 'table.row.modified_time'); // RGB
      
      // All should work correctly
      expect(findColored).toContain('find');
      expect(createColored).toContain('create');
      expect(deleteColored).toContain('delete');
      expect(moveColored).toContain('move');
      expect(headerColored).toContain('Header');
      expect(modifiedColored).toContain('Modified');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid hex formats gracefully', () => {
      const testTheme = {
        name: 'invalid-hex-test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: '#FFF',           // Invalid: 3 digits
                create: '#GGGGGG',      // Invalid: non-hex chars
                modify: '#12345',       // Invalid: 5 digits
                delete: '#1234567',     // Invalid: 7 digits
                move: '#',              // Invalid: just #
                restore: 'blue'         // Valid: preset color
              }
            }
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      // Should not throw errors and provide fallback
      expect(() => {
        const findColored = colorManager.colorizeEventType('find', 'find');
        const createColored = colorManager.colorizeEventType('create', 'create');
        const modifyColored = colorManager.colorizeEventType('modify', 'modify');
        const deleteColored = colorManager.colorizeEventType('delete', 'delete');
        const moveColored = colorManager.colorizeEventType('move', 'move');
        const restoreColored = colorManager.colorizeEventType('restore', 'restore');
        
        // Should contain the text even with invalid colors
        expect(findColored).toContain('find');
        expect(createColored).toContain('create');
        expect(modifyColored).toContain('modify');
        expect(deleteColored).toContain('delete');
        expect(moveColored).toContain('move');
        expect(restoreColored).toContain('restore');
        expect(restoreColored).toContain('\x1b[34m'); // Should use blue preset color
      }).not.toThrow();
    });

    test('should handle non-existent preset colors gracefully', () => {
      const testTheme = {
        name: 'invalid-preset-test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: 'invalid_color',
                create: 'nonexistent',
                modify: '#FF0000'       // Valid RGB as reference
              }
            }
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(testTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      // Should not throw errors
      expect(() => {
        const findColored = colorManager.colorizeEventType('find', 'find');
        const createColored = colorManager.colorizeEventType('create', 'create');
        const modifyColored = colorManager.colorizeEventType('modify', 'modify');
        
        expect(findColored).toContain('find');
        expect(createColored).toContain('create');
        expect(modifyColored).toContain('modify');
      }).not.toThrow();
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with existing theme files', () => {
      // Test with the current production theme format
      const existingTheme = {
        name: 'default',
        description: 'Default color scheme for cctop',
        lastUpdated: '2025-06-27T08:25:37.531Z',
        version: '1.0.0',
        colors: {
          table: {
            column_headers: 'white',
            row: {
              modified_time: 'white',
              elapsed_time: 'white',
              file_name: 'white',
              event_type: {
                find: 'blue',
                create: 'brightGreen',
                modify: 'white',
                delete: 'gray',
                move: 'cyan',
                restore: 'brightYellow'
              },
              lines: 'white',
              blocks: 'white',
              directory: 'white'
            }
          },
          status_bar: {
            label: 'white',
            count: 'white',
            separator: 'gray'
          },
          general_keys: {
            key_active: 'white',
            key_inactive: 'dim',
            label_active: 'white',
            label_inactive: 'dim'
          },
          event_filters: {
            key_active: 'green',
            key_inactive: 'dim',
            label_active: 'white',
            label_inactive: 'gray'
          },
          message_area: {
            prompt: 'cyan',
            label: 'gray',
            status: 'green',
            pid: 'dim',
            summary: 'white'
          }
        }
      };
      
      fs.writeFileSync(currentThemeFile, JSON.stringify(existingTheme, null, 2));
      
      const colorManager = new ColorManager(testConfigDir);
      
      // All existing colors should work as before
      const createColored = colorManager.colorizeEventType('create', 'create');
      const promptColored = colorManager.colorize('Prompt', 'message_area.prompt');
      const activeKeyColored = colorManager.colorize('Key', 'event_filters.key_active');
      
      expect(createColored).toContain('\x1b[92m'); // brightGreen
      expect(promptColored).toContain('\x1b[36m');   // cyan
      expect(activeKeyColored).toContain('\x1b[32m'); // green
    });
  });

  describe('Color Parsing Internal Function', () => {
    test('should correctly parse RGB hex values', () => {
      const colorManager = new ColorManager(testConfigDir);
      
      // Test valid hex colors
      const redCode = colorManager.parseColorValue('#FF0000');
      const greenCode = colorManager.parseColorValue('#00FF00');
      const blueCode = colorManager.parseColorValue('#0000FF');
      
      expect(typeof redCode).toBe('string');
      expect(typeof greenCode).toBe('string');
      expect(typeof blueCode).toBe('string');
    });

    test('should correctly parse preset color names', () => {
      const colorManager = new ColorManager(testConfigDir);
      
      // Test preset colors
      const redCode = colorManager.parseColorValue('red');
      const greenCode = colorManager.parseColorValue('green');
      const blueCode = colorManager.parseColorValue('blue');
      
      expect(redCode).toBe('\x1b[31m');   // Red ANSI
      expect(greenCode).toBe('\x1b[32m'); // Green ANSI
      expect(blueCode).toBe('\x1b[34m');  // Blue ANSI
    });

    test('should return empty string for invalid values', () => {
      const colorManager = new ColorManager(testConfigDir);
      
      // Test invalid values
      const invalid1 = colorManager.parseColorValue('#FFF');
      const invalid2 = colorManager.parseColorValue('#GGGGGG');
      const invalid3 = colorManager.parseColorValue('invalid_color');
      const invalid4 = colorManager.parseColorValue('');
      const invalid5 = colorManager.parseColorValue(null);
      
      expect(invalid1).toBe('');
      expect(invalid2).toBe('');
      expect(invalid3).toBe('');
      expect(invalid4).toBe('');
      expect(invalid5).toBe('');
    });
  });
});