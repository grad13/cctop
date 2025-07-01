/**
 * High Contrast Theme Preset
 * High contrast color scheme for improved visibility
 */

import type { ThemeData } from '../../../types';

export function getHighContrastTheme(): ThemeData {
  return {
    "name": "high-contrast",
    "description": "High contrast color scheme for improved visibility",
    "version": "1.0.0",
    "colors": {
      "find": "blue",
      "create": "brightGreen",
      "modify": "white",
      "delete": "gray",
      "move": "cyan",
      "restore": "brightYellow",
      "header": "white",
      "footer": "gray",
      "border": "gray",
      "selection": "cyan",
      "default": "white",
      "table": {
        "column_headers": "brightWhite",
        "row": {
          "event_timestamp": "brightWhite",
          "elapsed_time": "brightWhite",
          "file_name": "brightWhite",
          "event_type": {
            "find": "brightBlue",
            "create": "brightGreen",
            "modify": "brightWhite",
            "delete": "brightRed",
            "move": "brightCyan",
            "restore": "brightYellow"
          },
          "lines": "brightWhite",
          "blocks": "brightWhite",
          "directory": "brightWhite"
        }
      },
      "status_bar": {
        "label": "brightWhite",
        "count": "brightWhite",
        "separator": "white"
      },
      "general_keys": {
        "key_active": "brightWhite",
        "key_inactive": "white",
        "label_active": "brightWhite",
        "label_inactive": "white"
      },
      "event_filters": {
        "key_active": "brightGreen",
        "key_inactive": "white",
        "label_active": "brightWhite",
        "label_inactive": "white"
      },
      "message_area": {
        "prompt": "brightCyan",
        "label": "brightWhite",
        "status": "brightGreen",
        "pid": "white",
        "summary": "brightWhite"
      }
    }
  };
}