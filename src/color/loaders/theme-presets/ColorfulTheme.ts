/**
 * Colorful Theme Preset
 * Vibrant color scheme with clear element distinction
 */

import type { ThemeData } from '../../../types';

export function getColorfulTheme(): ThemeData {
  return {
    "name": "colorful",
    "description": "Vibrant color scheme with clear element distinction",
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
        "column_headers": "brightMagenta",
        "row": {
          "event_timestamp": "brightCyan",
          "elapsed_time": "brightYellow",
          "file_name": "brightWhite",
          "event_type": {
            "find": "brightBlue",
            "create": "brightGreen",
            "modify": "brightYellow",
            "delete": "brightRed",
            "move": "brightMagenta",
            "restore": "brightCyan"
          },
          "lines": "cyan",
          "blocks": "yellow",
          "directory": "blue"
        }
      },
      "status_bar": {
        "label": "brightMagenta",
        "count": "brightWhite",
        "separator": "brightBlue"
      },
      "general_keys": {
        "key_active": "brightCyan",
        "key_inactive": "dim",
        "label_active": "brightWhite",
        "label_inactive": "gray"
      },
      "event_filters": {
        "key_active": "brightCyan",
        "key_inactive": "dim",
        "label_active": "brightWhite",
        "label_inactive": "gray"
      },
      "message_area": {
        "prompt": "brightMagenta",
        "label": "brightBlue",
        "status": "brightGreen",
        "pid": "dim",
        "summary": "brightWhite"
      }
    }
  };
}