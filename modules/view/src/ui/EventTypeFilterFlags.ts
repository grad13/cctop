/**
 * Event Type Filter Flags
 * More intuitive flag-based class replacing Set<EventType>
 */

export class EventTypeFilterFlags {
  isShowFind: boolean = true;
  isShowCreate: boolean = true;
  isShowModify: boolean = true;
  isShowDelete: boolean = true;
  isShowMove: boolean = true;
  isShowRestore: boolean = true;

  // Flag flip methods
  flipFindFlag(): void {
    this.isShowFind = !this.isShowFind;
  }

  flipCreateFlag(): void {
    this.isShowCreate = !this.isShowCreate;
  }

  flipModifyFlag(): void {
    this.isShowModify = !this.isShowModify;
  }

  flipDeleteFlag(): void {
    this.isShowDelete = !this.isShowDelete;
  }

  flipMoveFlag(): void {
    this.isShowMove = !this.isShowMove;
  }

  flipRestoreFlag(): void {
    this.isShowRestore = !this.isShowRestore;
  }

  // Reset all flags to true
  resetAll(): void {
    this.isShowFind = true;
    this.isShowCreate = true;
    this.isShowModify = true;
    this.isShowDelete = true;
    this.isShowMove = true;
    this.isShowRestore = true;
  }

  // Clone for editing
  clone(): EventTypeFilterFlags {
    const copy = new EventTypeFilterFlags();
    copy.isShowFind = this.isShowFind;
    copy.isShowCreate = this.isShowCreate;
    copy.isShowModify = this.isShowModify;
    copy.isShowDelete = this.isShowDelete;
    copy.isShowMove = this.isShowMove;
    copy.isShowRestore = this.isShowRestore;
    return copy;
  }

  // Check if a specific event type is enabled
  isEventTypeEnabled(eventType: string): boolean {
    switch (eventType.toLowerCase()) {
      case 'find': return this.isShowFind;
      case 'create': return this.isShowCreate;
      case 'modify': return this.isShowModify;
      case 'delete': return this.isShowDelete;
      case 'move': return this.isShowMove;
      case 'restore': return this.isShowRestore;
      default: return false;
    }
  }

  // Toggle a specific event type
  toggleEventType(eventType: string): void {
    switch (eventType.toLowerCase()) {
      case 'find': this.flipFindFlag(); break;
      case 'create': this.flipCreateFlag(); break;
      case 'modify': this.flipModifyFlag(); break;
      case 'delete': this.flipDeleteFlag(); break;
      case 'move': this.flipMoveFlag(); break;
      case 'restore': this.flipRestoreFlag(); break;
    }
  }

  // Get active filters for database query
  getActiveFilters(): string[] {
    const filters: string[] = [];
    if (this.isShowFind) filters.push('Find');
    if (this.isShowCreate) filters.push('Create');
    if (this.isShowModify) filters.push('Modify');
    if (this.isShowDelete) filters.push('Delete');
    if (this.isShowMove) filters.push('Move');
    if (this.isShowRestore) filters.push('Restore');
    return filters;
  }

  // Count active filters
  countActiveFilters(): number {
    let count = 0;
    if (this.isShowFind) count++;
    if (this.isShowCreate) count++;
    if (this.isShowModify) count++;
    if (this.isShowDelete) count++;
    if (this.isShowMove) count++;
    if (this.isShowRestore) count++;
    return count;
  }
}