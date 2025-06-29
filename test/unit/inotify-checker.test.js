/**
 * InotifyChecker Unit Tests (FUNC-019)
 */

const fs = require('fs').promises;
const InotifyChecker = require('../../dist/src/system/inotify-checker');

describe('InotifyChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('getCurrentLimit', () => {
    test('get normal value in Linux environment', async () => {
      // Mock platform to Linux
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      
      // Mock file reading
      vi.spyOn(fs, 'readFile').mockResolvedValue('524288\n');
      
      const limit = await InotifyChecker.getCurrentLimit();
      expect(limit).toBe(524288);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/proc/sys/fs/inotify/max_user_watches',
        'utf8'
      );
    });
    
    test('return null when file reading fails in Linux environment', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));
      
      const limit = await InotifyChecker.getCurrentLimit();
      expect(limit).toBeNull();
    });
    
    test('return null in non-Linux environment', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
      
      const limit = await InotifyChecker.getCurrentLimit();
      expect(limit).toBeNull();
    });
    
    test('return null for invalid values', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      vi.spyOn(fs, 'readFile').mockResolvedValue('invalid-number');
      
      const limit = await InotifyChecker.getCurrentLimit();
      expect(limit).toBeNull();
    });
  });
  
  describe('checkLimitSufficiency', () => {
    test('sufficient determination with adequate limit value', () => {
      const result = InotifyChecker.checkLimitSufficiency(524288, 100000);
      expect(result).toEqual({
        status: 'sufficient',
        canCheck: true,
        current: 524288,
        required: 100000,
        message: 'Current limit (524288) meets requirements (100000)'
      });
    });
    
    test('sufficient determination with same value', () => {
      const result = InotifyChecker.checkLimitSufficiency(524288, 524288);
      expect(result.status).toBe('sufficient');
    });
    
    test('insufficient determination when lacking', () => {
      const result = InotifyChecker.checkLimitSufficiency(8192, 524288);
      expect(result).toEqual({
        status: 'insufficient',
        canCheck: true,
        current: 8192,
        required: 524288,
        shortage: 516096,
        message: 'Current limit (8192) is below required (524288)'
      });
    });
    
    test('unknown determination when check is not possible', () => {
      const result = InotifyChecker.checkLimitSufficiency(null, 524288);
      expect(result).toEqual({
        status: 'unknown',
        canCheck: false,
        message: 'Unable to determine current inotify limit'
      });
    });
  });
  
  describe('generateWarningMessage', () => {
    test('warning message is generated correctly', () => {
      const message = InotifyChecker.generateWarningMessage(8192, 524288);
      
      expect(message).toContain('WARNING: inotify limit may be insufficient');
      expect(message).toContain('Current: 8,192 watches');
      expect(message).toContain('Required: 524,288 watches');
      expect(message).toContain('Shortage: 516,096 watches');
      expect(message).toContain('ENOSPC');
      expect(message).toContain('echo fs.inotify.max_user_watches=524288');
      expect(message).toContain('sudo sysctl fs.inotify.max_user_watches=524288');
    });
  });
  
  describe('getPlatformMessage', () => {
    test('macOS message', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
      const message = InotifyChecker.getPlatformMessage();
      expect(message).toContain('not applicable on macOS');
      expect(message).toContain('FSEvents');
    });
    
    test('Windows message', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
      const message = InotifyChecker.getPlatformMessage();
      expect(message).toContain('not applicable on Windows');
    });
    
    test('null on Linux', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      const message = InotifyChecker.getPlatformMessage();
      expect(message).toBeNull();
    });
    
    test('other platforms', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('freebsd');
      const message = InotifyChecker.getPlatformMessage();
      expect(message).toContain('not supported on freebsd');
    });
  });
  
  describe('shouldCheckLimits', () => {
    test('true on Linux', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      expect(InotifyChecker.shouldCheckLimits()).toBe(true);
    });
    
    test('false on non-Linux', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
      expect(InotifyChecker.shouldCheckLimits()).toBe(false);
    });
  });
  
  describe('formatCheckResult', () => {
    test('sufficient state format', () => {
      const checkResult = {
        status: 'sufficient',
        canCheck: true,
        current: 524288,
        required: 100000
      };
      
      const formatted = InotifyChecker.formatCheckResult(checkResult);
      expect(formatted).toContain('Current inotify limit: 524,288');
      expect(formatted).toContain('Required limit: 100,000');
      expect(formatted).toContain('Status: SUFFICIENT');
      expect(formatted).toContain('✓ Your system is properly configured');
    });
    
    test('insufficient state format', () => {
      const checkResult = {
        status: 'insufficient',
        canCheck: true,
        current: 8192,
        required: 524288
      };
      
      const formatted = InotifyChecker.formatCheckResult(checkResult);
      expect(formatted).toContain('Status: INSUFFICIENT');
      expect(formatted).toContain('WARNING');
    });
    
    test('unknown state format', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      const checkResult = {
        status: 'unknown',
        canCheck: false,
        message: 'Unable to check'
      };
      
      const formatted = InotifyChecker.formatCheckResult(checkResult);
      expect(formatted).toBe('Unable to check');
    });
    
    test('format on macOS', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
      const checkResult = {
        status: 'unknown',
        canCheck: false
      };
      
      const formatted = InotifyChecker.formatCheckResult(checkResult);
      expect(formatted).toContain('not applicable on macOS');
    });
  });
  
  describe('constants', () => {
    test('recommended and default values', () => {
      expect(InotifyChecker.RECOMMENDED_LIMIT).toBe(524288);
      expect(InotifyChecker.DEFAULT_LIMIT).toBe(524288);
    });
  });
});