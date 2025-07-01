# Theme Presets

This directory contains preset theme definitions for cctop.

## Files

- `DefaultTheme.ts` - Balanced standard color scheme
- `HighContrastTheme.ts` - High contrast for improved visibility
- `ColorfulTheme.ts` - Vibrant colors with clear distinction
- `MinimalTheme.ts` - Subtle colors for clean appearance
- `index.ts` - Exports all preset themes

## Usage

```typescript
import { getDefaultTheme, getHighContrastTheme } from './theme-presets';

const defaultTheme = getDefaultTheme();
const highContrastTheme = getHighContrastTheme();
```