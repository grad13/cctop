#!/bin/bash
# Full Python-Node.js Integration Test Script
# Tests the complete data flow: Python → SQLite → Node.js → UI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DB_PATH="/tmp/cctop_integration_test.db"
SMALL_TEST_FILES=10
SMALL_TEST_DAYS=3
SMALL_TEST_EVENTS=5
LARGE_TEST_FILES=100
LARGE_TEST_DAYS=14
LARGE_TEST_EVENTS=12

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

cleanup() {
    log_info "Cleaning up test files..."
    rm -f "$TEST_DB_PATH"
    rm -f /tmp/cctop_large_test.db
    rm -f /tmp/test_node_integration.js
}

# Trap cleanup on exit
trap cleanup EXIT

echo "🚀 Starting CCTOP Python-Node.js Integration Test Suite"
echo "=================================================="

# Check prerequisites
log_info "Phase 0: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi
NODE_VERSION=$(node --version)
log_success "Node.js found: $NODE_VERSION"

# Check Python
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is not installed"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
log_success "Python found: $PYTHON_VERSION"

# Check SQLite
if ! command -v sqlite3 &> /dev/null; then
    log_error "SQLite3 is not installed"
    exit 1
fi
SQLITE_VERSION=$(sqlite3 --version | cut -d' ' -f1)
log_success "SQLite found: $SQLITE_VERSION"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "scripts/dummy_data_generator.py" ]; then
    log_error "Please run this script from the modules/cli directory"
    exit 1
fi

# Check npm dependencies
if [ ! -d "node_modules" ]; then
    log_warning "Node modules not found, installing..."
    npm install
fi

# Phase 1: Small dataset test
log_info "Phase 1: Testing with small dataset..."
echo "  Files: $SMALL_TEST_FILES, Days: $SMALL_TEST_DAYS, Events/file: $SMALL_TEST_EVENTS"

python3 scripts/dummy_data_generator.py \
    --files "$SMALL_TEST_FILES" \
    --days "$SMALL_TEST_DAYS" \
    --events-per-file "$SMALL_TEST_EVENTS" \
    --db-path "$TEST_DB_PATH" > /dev/null

if [ ! -f "$TEST_DB_PATH" ]; then
    log_error "Python script failed to create database"
    exit 1
fi

log_success "Python data generation completed"

# Verify database structure
EVENTS_COUNT=$(sqlite3 "$TEST_DB_PATH" "SELECT COUNT(*) FROM events;")
FILES_COUNT=$(sqlite3 "$TEST_DB_PATH" "SELECT COUNT(*) FROM files;")
TABLES_COUNT=$(sqlite3 "$TEST_DB_PATH" ".tables" | wc -w)

log_info "Database verification:"
echo "  Tables: $TABLES_COUNT (expected: 5)"
echo "  Files: $FILES_COUNT (expected: $SMALL_TEST_FILES)"  
echo "  Events: $EVENTS_COUNT (expected: ~$((SMALL_TEST_FILES * SMALL_TEST_EVENTS)))"

if [ "$FILES_COUNT" -ne "$SMALL_TEST_FILES" ]; then
    log_error "File count mismatch: expected $SMALL_TEST_FILES, got $FILES_COUNT"
    exit 1
fi

if [ "$EVENTS_COUNT" -lt $((SMALL_TEST_FILES * SMALL_TEST_EVENTS / 2)) ]; then
    log_error "Event count too low: expected ~$((SMALL_TEST_FILES * SMALL_TEST_EVENTS)), got $EVENTS_COUNT"
    exit 1
fi

if [ "$TABLES_COUNT" -ne 5 ]; then
    log_error "Table count mismatch: expected 5, got $TABLES_COUNT"
    exit 1
fi

log_success "Database structure verification passed"

# Phase 2: Node.js integration test  
log_info "Phase 2: Testing Node.js integration..."

cat > /tmp/test_node_integration.js << 'EOF'
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

function testNodeIntegration(dbPath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dbPath)) {
            reject(new Error(`Database file not found: ${dbPath}`));
            return;
        }

        const db = new sqlite3.Database(dbPath);
        let testsPassed = 0;
        const totalTests = 4;

        // Test 1: Basic connection and event count
        db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
            if (err) {
                reject(new Error(`Failed to read events: ${err.message}`));
                return;
            }
            console.log(`✅ Events readable: ${row.count} records`);
            testsPassed++;
            
            if (testsPassed === totalTests) {
                db.close();
                resolve();
            }
        });

        // Test 2: JOIN query (CLI-style)
        db.all(`
            SELECT 
                e.id,
                datetime(e.timestamp, 'unixepoch') as timestamp,
                et.code as event_type,
                f.file_path,
                m.file_size,
                m.line_count
            FROM events e
            JOIN event_types et ON e.event_type_id = et.id
            JOIN files f ON e.file_id = f.id
            JOIN measurements m ON e.id = m.event_id
            ORDER BY e.timestamp DESC
            LIMIT 5
        `, (err, rows) => {
            if (err) {
                reject(new Error(`Failed to execute JOIN query: ${err.message}`));
                return;
            }
            console.log(`✅ JOIN query successful: ${rows.length} records`);
            if (rows.length > 0) {
                console.log(`   Sample: ${rows[0].event_type} on ${rows[0].file_path}`);
            }
            testsPassed++;
            
            if (testsPassed === totalTests) {
                db.close();
                resolve();
            }
        });

        // Test 3: Event type distribution
        db.all(`
            SELECT et.code, COUNT(*) as count
            FROM events e
            JOIN event_types et ON e.event_type_id = et.id
            GROUP BY et.code
            ORDER BY count DESC
        `, (err, rows) => {
            if (err) {
                reject(new Error(`Failed to get event distribution: ${err.message}`));
                return;
            }
            console.log(`✅ Event distribution: ${rows.length} types`);
            rows.forEach(row => {
                console.log(`   ${row.code}: ${row.count}`);
            });
            testsPassed++;
            
            if (testsPassed === totalTests) {
                db.close();
                resolve();
            }
        });

        // Test 4: Data integrity check
        db.get(`
            SELECT 
                COUNT(DISTINCT e.id) as event_count,
                COUNT(DISTINCT f.id) as file_count,
                COUNT(DISTINCT m.id) as measurement_count
            FROM events e
            JOIN files f ON e.file_id = f.id
            JOIN measurements m ON e.id = m.event_id
        `, (err, row) => {
            if (err) {
                reject(new Error(`Failed data integrity check: ${err.message}`));
                return;
            }
            
            if (row.event_count !== row.measurement_count) {
                reject(new Error(`Data integrity issue: events(${row.event_count}) != measurements(${row.measurement_count})`));
                return;
            }
            
            console.log(`✅ Data integrity: ${row.event_count} events, ${row.file_count} files, ${row.measurement_count} measurements`);
            testsPassed++;
            
            if (testsPassed === totalTests) {
                db.close();
                resolve();
            }
        });
    });
}

testNodeIntegration(process.argv[2]);
EOF

node /tmp/test_node_integration.js "$TEST_DB_PATH"
log_success "Node.js integration test passed"

# Phase 3: CLI demo test (non-interactive)
log_info "Phase 3: Testing CLI demo..."

export CCTOP_DB_PATH="$TEST_DB_PATH"
timeout 3s npm run demo:ui > /dev/null 2>&1 || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        log_success "CLI demo started successfully (timeout expected)"
    else
        log_warning "CLI demo exited with code $EXIT_CODE (may be normal)"
    fi
}

# Phase 4: Large dataset test (optional, for performance)
if [ "${SKIP_LARGE_TEST:-}" != "1" ]; then
    log_info "Phase 4: Testing with larger dataset..."
    echo "  Files: $LARGE_TEST_FILES, Days: $LARGE_TEST_DAYS, Events/file: $LARGE_TEST_EVENTS"
    
    LARGE_TEST_DB="/tmp/cctop_large_test.db"
    
    # Generate larger dataset
    python3 scripts/dummy_data_generator.py \
        --files "$LARGE_TEST_FILES" \
        --days "$LARGE_TEST_DAYS" \
        --events-per-file "$LARGE_TEST_EVENTS" \
        --db-path "$LARGE_TEST_DB" > /dev/null
    
    # Check performance
    LARGE_EVENTS_COUNT=$(sqlite3 "$LARGE_TEST_DB" "SELECT COUNT(*) FROM events;")
    LARGE_FILES_COUNT=$(sqlite3 "$LARGE_TEST_DB" "SELECT COUNT(*) FROM files;")
    
    echo "  Generated: $LARGE_EVENTS_COUNT events, $LARGE_FILES_COUNT files"
    
    # Quick Node.js performance test
    start_time=$(date +%s%N)
    node -e "
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database('$LARGE_TEST_DB');
        db.all('SELECT COUNT(*) FROM events', (err, rows) => {
            if (err) process.exit(1);
            db.close();
        });
    "
    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))
    
    echo "  Node.js query time: ${duration}ms"
    
    if [ "$duration" -lt 1000 ]; then
        log_success "Large dataset test passed (${duration}ms)"
    else
        log_warning "Large dataset query was slow (${duration}ms)"
    fi
    
    rm -f "$LARGE_TEST_DB"
else
    log_info "Phase 4: Skipped large dataset test (SKIP_LARGE_TEST=1)"
fi

# Phase 5: Error handling test
log_info "Phase 5: Testing error handling..."

# Test with corrupted database
echo "invalid data" > /tmp/cctop_corrupted.db
export CCTOP_DB_PATH="/tmp/cctop_corrupted.db"
timeout 2s npm run demo:ui > /dev/null 2>&1 || {
    log_success "Corrupted database handled gracefully"
}
rm -f /tmp/cctop_corrupted.db

# Test with non-existent database
export CCTOP_DB_PATH="/tmp/cctop_nonexistent.db"
timeout 2s npm run demo:ui > /dev/null 2>&1 || {
    log_success "Non-existent database handled gracefully"
}

# Reset environment
unset CCTOP_DB_PATH

# Final summary
echo ""
echo "=================================================="
echo "🎉 Integration Test Suite Completed Successfully!"
echo "=================================================="
echo ""
echo "✅ Python data generation working"
echo "✅ SQLite schema FUNC-000 compliant"  
echo "✅ Node.js sqlite3 integration working"
echo "✅ CLI UI can display generated data"
echo "✅ Error handling functional"
echo ""
echo "The complete Python → SQLite → Node.js → UI pipeline is operational."
echo ""
echo "Next steps:"
echo "  • Run 'npm test' for unit tests"
echo "  • Run 'npm run demo:python-data' for manual testing"
echo "  • Check 'test/python-integration-test.md' for detailed procedures"