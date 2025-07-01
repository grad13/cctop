/**
 * Default Theme Preset
 * Balanced standard color scheme for general use
 */

import type { ThemeData } from '../../../types';

export function getDefaultTheme(): ThemeData {
  return {
    "name": "default",
    "description": "Balanced standard color scheme for general use",
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
          "event_timestamp": "white",
          "elapsed_time": "white",
          "file_name": "white",
          "event_type": {
            "find": "blue",
            "create": "brightGreen",
            "modify": "white",
            "delete": "gray",
            "move": "cyan",
            "restore": "brightYellow"
          },
          "lines": "white",
          "blocks": "white",
          "directory": "white"
        }
      },
      "status_bar": {
        "label": "white",
        "count": "white",
        "separator": "gray"
      },
      "general_keys": {
        "key_active": "white",
        "key_inactive": "dim",
        "label_active": "white",
        "label_inactive": "dim"
      },
      "event_filters": {
        "key_active": "green",
        "key_inactive": "dim",
        "label_active": "white",
        "label_inactive": "gray"
      },
      "message_area": {
        "prompt": "cyan",
        "label": "gray",
        "status": "green",
        "pid": "dim",
        "summary": "white"
      }
    }
  };
}