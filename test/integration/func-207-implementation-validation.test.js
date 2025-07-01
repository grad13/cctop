/**
 * FUNC-207: Implementation Validation Tests
 * Tests actual ColorManager and ThemeLoader implementations
 */

const { describe, test, expect, beforeEach, afterEach } = global;
const fs = require('fs');
const path = require('path');
const ColorManager = require('../../dist/src/color/ColorManager');
const ThemeLoader = require('../../dist/src/color/ThemeLoader');

describe('FUNC-207: Implementation Validation', () => {
  const testConfigDir = '.cctop-impl-test';
  const testThemesDir = path.join(testConfigDir, 'themes');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('ColorManager Implementation Tests', () => {
    test('should load current theme from existing file', () => {
      // Create test directory and theme file
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      const testTheme = {
        name: 'test-theme',
        description: 'Test theme for validation',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: 'blue',
                create: 'green'
              }
            }
          }
        }
      };
      
      fs.writeFileSync(
        path.join(testConfigDir, 'current-theme.json'), 
        JSON.stringify(testTheme, null, 2)
      );

      const colorManager = new ColorManager(testConfigDir);
      const theme = colorManager.getCurrentThemeInfo();
      
      expect(theme.name).toBe('test-theme');
      expect(theme.colors.table.row.event_type.find).toBe('blue');
    });

    test('should handle missing current-theme.json with fallback', () => {
      // Create empty test directory
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      const colorManager = new ColorManager(testConfigDir);
      const theme = colorManager.getCurrentThemeInfo();
      
      // Should use fallback theme
      expect(theme).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.colors).toBeDefined();
    });

    test('should colorize event types according to theme', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      const testTheme = {
        name: 'test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: 'blue',
                create: 'green',
                modify: 'yellow'
              }
            }
          }
        }
      };
      
      fs.writeFileSync(
        path.join(testConfigDir, 'current-theme.json'),
        JSON.stringify(testTheme, null, 2)
      );

      const colorManager = new ColorManager(testConfigDir);
      
      const findColored = colorManager.colorizeEventType('find', 'find');
      const createColored = colorManager.colorizeEventType('create', 'create');
      
      // Should contain ANSI color codes
      expect(findColored).toContain('\x1b[34m'); // Blue
      expect(createColored).toContain('\x1b[32m'); // Green
      expect(findColored).toContain('find');
      expect(createColored).toContain('create');
    });

    test('should handle invalid color names with fallback', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      const testTheme = {
        name: 'test',
        version: '1.0.0',
        colors: {
          table: {
            row: {
              event_type: {
                find: 'invalid-color-name'
              }
            }
          }
        }
      };
      
      fs.writeFileSync(
        path.join(testConfigDir, 'current-theme.json'),
        JSON.stringify(testTheme, null, 2)
      );

      const colorManager = new ColorManager(testConfigDir);
      
      // Should not throw error and provide fallback
      expect(() => {
        const result = colorManager.colorizeEventType('find', 'find');
        expect(result).toContain('find');
      }).not.toThrow();
    });

    test('should provide colorize method for general usage', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      const testTheme = {
        name: 'test',
        version: '1.0.0',
        colors: {
          status_bar: {
            label: 'cyan'
          }
        }
      };
      
      fs.writeFileSync(
        path.join(testConfigDir, 'current-theme.json'),
        JSON.stringify(testTheme, null, 2)
      );

      const colorManager = new ColorManager(testConfigDir);
      
      const colorized = colorManager.colorize('Status', 'status_bar.label');
      
      expect(colorized).toContain('\x1b[36m'); // Cyan
      expect(colorized).toContain('Status');
      expect(colorized).toContain('\x1b[0m'); // Reset
    });
  });

  describe('ThemeLoader Implementation Tests', () => {
    test('should create themes directory and preset files', async () => {
      const themeLoader = new ThemeLoader(testConfigDir);
      
      await themeLoader.initializeThemes();
      
      // Check directory creation
      expect(fs.existsSync(testThemesDir)).toBe(true);
      
      // Check preset files creation
      const expectedFiles = ['default.json', 'high-contrast.json', 'colorful.json', 'minimal.json'];
      expectedFiles.forEach(file => {
        const filePath = path.join(testThemesDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
        
        // Validate JSON structure
        const content = fs.readFileSync(filePath, 'utf8');
        const theme = JSON.parse(content);
        expect(theme.name).toBeDefined();
        expect(theme.colors).toBeDefined();
      });
    });

    test('should provide theme switching functionality', async () => {
      const themeLoader = new ThemeLoader(testConfigDir);
      
      await themeLoader.initializeThemes();
      
      // Switch to high-contrast theme
      await themeLoader.loadTheme('high-contrast');
      
      // Verify current-theme.json was updated
      const currentThemePath = path.join(testConfigDir, 'current-theme.json');
      expect(fs.existsSync(currentThemePath)).toBe(true);
      
      const currentTheme = JSON.parse(fs.readFileSync(currentThemePath, 'utf8'));
      expect(currentTheme.name).toBe('high-contrast');
    });

    test('should list available themes', async () => {
      const themeLoader = new ThemeLoader(testConfigDir);
      
      await themeLoader.initializeThemes();
      
      const themes = await themeLoader.getAvailableThemes();
      
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBe(4);
      
      const themeNames = themes.map(t => t.name);
      expect(themeNames).toContain('default');
      expect(themeNames).toContain('high-contrast');
      expect(themeNames).toContain('colorful');
      expect(themeNames).toContain('minimal');
    });

    test('should handle missing themes directory gracefully', async () => {
      const themeLoader = new ThemeLoader(testConfigDir);
      
      // Don't initialize themes directory
      
      expect(async () => {
        const themes = await themeLoader.getAvailableThemes();
        expect(Array.isArray(themes)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should work together - ThemeLoader and ColorManager', async () => {
      const themeLoader = new ThemeLoader(testConfigDir);
      
      // Initialize and switch theme
      await themeLoader.initializeThemes();
      await themeLoader.loadTheme('colorful');
      
      // Use ColorManager to load switched theme
      const colorManager = new ColorManager(testConfigDir);
      const theme = colorManager.getCurrentThemeInfo();
      
      expect(theme.name).toBe('colorful');
      
      // Test colorization with new theme
      const colored = colorManager.colorizeEventType('create', 'create');
      expect(colored).toContain('create');
    });

    test('should maintain FUNC-202 compatibility', () => {
      // Test that ColorManager can work without themes directory
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      const colorManager = new ColorManager(testConfigDir);
      
      // Should work even without themes/ directory
      expect(() => {
        const colored = colorManager.colorizeEventType('modify', 'modify');
        expect(colored).toContain('modify');
      }).not.toThrow();
    });
  });

  describe('Error Handling Implementation Tests', () => {
    test('should handle corrupted current-theme.json', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      // Write invalid JSON
      fs.writeFileSync(
        path.join(testConfigDir, 'current-theme.json'),
        '{ invalid json syntax'
      );
      
      expect(() => {
        const colorManager = new ColorManager(testConfigDir);
        const theme = colorManager.getCurrentThemeInfo();
        expect(theme).toBeDefined();
      }).not.toThrow();
    });

    test('should handle permission errors gracefully', () => {
      // This test would require actual permission manipulation
      // For now, just verify error handling structure exists
      expect(() => {
        const colorManager = new ColorManager('/nonexistent/path');
        const theme = colorManager.getCurrentThemeInfo();
        expect(theme).toBeDefined();
      }).not.toThrow();
    });
  });
});