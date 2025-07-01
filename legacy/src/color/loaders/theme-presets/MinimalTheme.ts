/**
 * Minimal Theme Preset
 * Minimal color scheme with subtle distinctions
 */

import type { ThemeData } from '../../../types';

export function getMinimalTheme(): ThemeData {
  return {
    "name": "minimal",
    "description": "Minimal color scheme with subtle distinctions",
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
        "column_headers": "white",
        "row": {
          "event_timestamp": "gray",
          "elapsed_time": "gray",
          "file_name": "white",
          "event_type": {
            "find": "gray",
            "create": "white",
            "modify": "white",
            "delete": "dim",
            "move": "gray",
            "restore": "white"
          },
          "lines": "dim",
          "blocks": "dim",
          "directory": "gray"
        }
      },
      "status_bar": {
        "label": "white",
        "count": "white",
        "separator": "dim"
      },
      "general_keys": {
        "key_active": "white",
        "key_inactive": "dim",
        "label_active": "white",
        "label_inactive": "dim"
      },
      "event_filters": {
        "key_active": "white",
        "key_inactive": "dim",
        "label_active": "white",
        "label_inactive": "dim"
      },
      "message_area": {
        "prompt": "white",
        "label": "gray",
        "status": "white",
        "pid": "dim",
        "summary": "white"
      }
    }
  };
}