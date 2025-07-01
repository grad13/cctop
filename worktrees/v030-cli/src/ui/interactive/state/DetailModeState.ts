/**
 * Detail Mode State Management
 * Manages the state of detail inspection mode
 */

import type { IDetailModeState, SelectedFile, ISelectedFile } from '../interfaces/ControllerInterfaces';

export class DetailModeState implements IDetailModeState {
  private active: boolean = false;
  private selectedFile: SelectedFile | null = null;
  private debug: boolean;

  constructor() {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Activate detail mode with selected file
   */
  activate(file: SelectedFile): void {
    if (!file) {
      throw new Error('[DetailModeState] Cannot activate with null/undefined file');
    }

    this.selectedFile = file;
    this.active = true;
    
    if (this.debug) {
      const fileName = this.extractFileName(file);
      console.log('[DetailModeState] Activated for:', fileName);
    }
  }

  /**
   * Deactivate detail mode
   */
  deactivate(): void {
    this.selectedFile = null;
    this.active = false;
    
    if (this.debug) {
      console.log('[DetailModeState] Deactivated');
    }
  }

  /**
   * Check if detail mode is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get current selected file
   */
  getSelectedFile(): SelectedFile | null {
    return this.selectedFile;
  }

  /**
   * Validate current state consistency
   */
  validateState(): boolean {
    if (this.active && !this.selectedFile) {
      console.warn('[DetailModeState] Invalid state: active but no selected file');
      return false;
    }
    
    if (!this.active && this.selectedFile) {
      console.warn('[DetailModeState] Invalid state: inactive but has selected file');
      return false;
    }
    
    return true;
  }

  /**
   * Get state information for debugging
   */
  getStateInfo(): object {
    return {
      active: this.active,
      hasSelectedFile: !!this.selectedFile,
      selectedFileName: this.extractFileName(this.selectedFile),
      selectedPath: this.extractFilePath(this.selectedFile),
      stateValid: this.validateState()
    };
  }

  /**
   * Extract file name from SelectedFile
   */
  private extractFileName(file: SelectedFile | null): string | null {
    if (!file) return null;
    
    if (typeof file === 'string') {
      // Extract filename from path
      const parts = file.split('/');
      return parts[parts.length - 1] || file;
    }
    
    const fileObj = file as ISelectedFile;
    return fileObj.name || null;
  }

  /**
   * Extract file path from SelectedFile
   */
  private extractFilePath(file: SelectedFile | null): string | null {
    if (!file) return null;
    
    if (typeof file === 'string') {
      return file;
    }
    
    const fileObj = file as ISelectedFile;
    if (fileObj.name && fileObj.name.trim()) {
      return fileObj.path ? `${fileObj.path}/${fileObj.name}` : fileObj.name;
    }
    
    return 'empty_filename_entry';
  }

  /**
   * Get normalized file path for initialization
   */
  getFilePath(): string {
    if (!this.selectedFile) {
      throw new Error('[DetailModeState] No selected file available');
    }
    
    return this.extractFilePath(this.selectedFile) || 'empty_filename_entry';
  }
}