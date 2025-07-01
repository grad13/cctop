/**
 * Detail Renderer
 * Handles the rendering of combined aggregate and history displays
 */

import type { 
  IDetailRenderer,
  IAggregateDisplay, 
  IHistoryDisplay 
} from '../interfaces/ControllerInterfaces';

export class DetailRenderer implements IDetailRenderer {
  private aggregateDisplay: IAggregateDisplay;
  private historyDisplay: IHistoryDisplay;
  private debug: boolean;

  constructor(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay
  ) {
    this.aggregateDisplay = aggregateDisplay;
    this.historyDisplay = historyDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Render the complete detail mode display
   */
  renderDetailMode(): string | null {
    try {
      const sections: string[] = [];
      
      // Render aggregate section
      const aggregateSection = this.renderAggregateSection();
      if (aggregateSection) {
        sections.push(aggregateSection);
      }

      // Render history section
      const historySection = this.renderHistorySection();
      if (historySection) {
        sections.push(historySection);
      }

      // Return null if no content
      if (sections.length === 0) {
        if (this.debug) {
          console.log('[DetailRenderer] No content to render');
        }
        return null;
      }

      // Combine sections with proper spacing
      const combinedContent = sections.join('\n');
      
      if (this.debug) {
        console.log('[DetailRenderer] Rendered', sections.length, 'sections');
      }

      return combinedContent;
    } catch (error) {
      console.error('[DetailRenderer] Render failed:', error);
      return null;
    }
  }

  /**
   * Render the aggregate statistics section
   */
  renderAggregateSection(): string | null {
    try {
      const content = this.aggregateDisplay.render();
      
      if (!content) {
        if (this.debug) {
          console.log('[DetailRenderer] No aggregate content available');
        }
        return null;
      }

      // Return content as-is (FUNC-402 already formats it)
      return content;
    } catch (error) {
      console.error('[DetailRenderer] Aggregate render failed:', error);
      return null;
    }
  }

  /**
   * Render the event history section
   */
  renderHistorySection(): string | null {
    try {
      const content = this.historyDisplay.render();
      
      if (!content) {
        if (this.debug) {
          console.log('[DetailRenderer] No history content available');
        }
        return '(No history content)\n';
      }

      // Return content as-is (FUNC-403 already formats it)
      return content;
    } catch (error) {
      console.error('[DetailRenderer] History render failed:', error);
      return null;
    }
  }

  /**
   * Get render status for debugging
   */
  getRenderStatus(): object {
    let aggregateReady = false;
    let historyReady = false;
    let canRender = false;

    try {
      aggregateReady = this.aggregateDisplay.render() !== null;
    } catch (error) {
      // Ignore errors for status check
    }

    try {
      historyReady = this.historyDisplay.render() !== null;
    } catch (error) {
      // Ignore errors for status check
    }

    try {
      canRender = this.renderDetailMode() !== null;
    } catch (error) {
      // Ignore errors for status check
    }

    return {
      aggregateReady,
      historyReady,
      canRender,
      hasContent: aggregateReady || historyReady
    };
  }

  /**
   * Clear the display
   */
  static clearDisplay(): void {
    process.stdout.write('\x1b[2J\x1b[0f');
  }

  /**
   * Write content to stdout with proper formatting
   */
  static writeToStdout(content: string): void {
    // Clear screen first
    DetailRenderer.clearDisplay();
    
    // Write content
    process.stdout.write(content);
    
    // Force cursor to bottom
    process.stdout.write('\x1b[999;1H');
  }
}