# FUNC-020 Event Type Filtering - Manual Test Guide

## Test Environment Setup
Directory: `test/manual/filter-test/`
Test files: `test1.js`, `test2.js`, `test3.js`

## Test Procedure

### 1. Start cctop
```bash
cd /Users/takuo-h/Workspace/Code/06-cctop/cctop
./bin/cctop test/manual/filter-test/
```

### 2. Basic Filter Test
1. After startup, verify filter line at bottom:
   - Should show: `[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move`
   - All filters should be green (active)

2. Create a new file:
   ```bash
   # In another terminal
   cd test/manual/filter-test/
   echo "content" > new-file.js
   ```
   - Verify: CREATE event appears in cctop

3. Press 'c' key in cctop:
   - Filter line should show [c] in dark color
   - Existing CREATE events should disappear immediately

4. Modify a file:
   ```bash
   echo "more content" >> test1.js
   ```
   - Verify: MODIFY event appears (since modify filter is still ON)

5. Press 'm' key:
   - [m] becomes dark in filter line
   - MODIFY events disappear

### 3. Multiple Filters Test
1. Press 'f', 'd', 'v' keys to disable all except CREATE
2. Perform various file operations:
   ```bash
   rm test3.js        # DELETE - should NOT appear
   mv test2.js test4.js  # MOVE - should NOT appear
   touch test5.js     # CREATE - should appear
   ```

### 4. Filter Toggle Test
1. Press 'c' again - CREATE filter turns back ON
2. Create another file - should now appear

### 5. Performance Test
1. Enable all filters (press disabled keys to re-enable)
2. Generate many events:
   ```bash
   for i in {1..100}; do touch file$i.txt; done
   ```
3. Press 'c' to disable CREATE filter
   - All CREATE events should disappear instantly

## Expected Results

### Visual Indicators
- **Active filter**: `[32m[f][0m:[37mFind[0m` (green key, white text)
- **Inactive filter**: `[30m[f][0m:[90mFind[0m` (black key, gray text)

### Event Display
- Only events with active filters are shown
- Filter changes apply immediately to existing events
- New events respect current filter state

### Keyboard Response
- f/c/m/d/v keys toggle respective filters
- Invalid keys are ignored
- Case-insensitive (F/C/M/D/V also work)

## Cleanup
```bash
cd ..
rm -rf filter-test
```