# Theme Loaders

This directory contains theme loading and management functionality.

## Components

### ThemeInitializer
- Creates themes directory
- Installs preset themes
- Checks initialization status

### ThemeRepository
- Lists available themes
- Loads theme files
- Saves custom themes
- Validates theme existence

### theme-presets/
- Contains preset theme definitions
- Default, High Contrast, Colorful, and Minimal themes

## Usage

The main ThemeLoader in the parent directory uses these components to provide a unified interface for theme management.