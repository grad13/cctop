/**
 * File Move Detection System
 */

interface PendingUnlink {
  filePath: string;
  inode: number;
  timestamp: number;
}

interface PendingAdd {
  filePath: string;
  inode: number;
  timestamp: number;
  stats: any;
}

export class MoveDetector {
  private pendingUnlinks: Map<number, PendingUnlink> = new Map();
  private pendingAdds: Map<number, PendingAdd> = new Map();
  private moveThresholdMs: number;

  constructor(moveThresholdMs: number = 100) {
    this.moveThresholdMs = moveThresholdMs;
  }

  addPendingUnlink(filePath: string, inode: number): void {
    const pendingUnlink: PendingUnlink = {
      filePath,
      inode,
      timestamp: Date.now()
    };
    
    this.pendingUnlinks.set(inode, pendingUnlink);
  }

  checkForMove(inode: number): PendingUnlink | null {
    const pendingUnlink = this.pendingUnlinks.get(inode);
    if (!pendingUnlink) {
      return null;
    }

    const timeDiff = Date.now() - pendingUnlink.timestamp;
    if (timeDiff <= this.moveThresholdMs) {
      this.pendingUnlinks.delete(inode);
      return pendingUnlink;
    }

    // Cleanup expired entry
    this.pendingUnlinks.delete(inode);
    return null;
  }

  setupUnlinkTimeout(inode: number, onTimeout: () => void): void {
    setTimeout(() => {
      if (this.pendingUnlinks.has(inode)) {
        this.pendingUnlinks.delete(inode);
        onTimeout();
      }
    }, this.moveThresholdMs);
  }

  getPendingUnlinksSize(): number {
    return this.pendingUnlinks.size;
  }

  cleanup(): void {
    this.pendingUnlinks.clear();
    this.pendingAdds.clear();
  }
}