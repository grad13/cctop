#!/bin/bash
# Debug script for testing cctop crash scenarios in container

echo "=== cctop Container Debug Environment ==="
echo "This script helps debug the crash when .cctop directory is deleted"
echo ""

# Function to run cctop with monitoring
run_cctop_test() {
    echo "Starting cctop with monitoring..."
    
    # Check if .cctop exists
    if [ -d ".cctop" ]; then
        echo "✓ .cctop directory exists"
    else
        echo "✗ .cctop directory NOT found"
    fi
    
    # Run with strace to capture system calls
    echo "Running with strace to capture crash details..."
    strace -f -o /tmp/cctop-strace.log node dist/src/main.js --dangerously-skip-permissions &
    CCTOP_PID=$!
    
    echo "cctop started with PID: $CCTOP_PID"
    echo "Strace log: /tmp/cctop-strace.log"
    
    # Wait a bit
    sleep 2
    
    # Check if process is still running
    if kill -0 $CCTOP_PID 2>/dev/null; then
        echo "✓ Process is running"
        return 0
    else
        echo "✗ Process crashed!"
        return 1
    fi
}

# Test scenarios
echo "=== Test 1: With .cctop directory ==="
run_cctop_test

echo ""
echo "=== Test 2: Delete .cctop and test ==="
echo "Removing .cctop directory..."
rm -rf .cctop
run_cctop_test

echo ""
echo "=== Analyzing crash ==="
if [ -f /tmp/cctop-strace.log ]; then
    echo "Last 50 lines of strace before crash:"
    tail -50 /tmp/cctop-strace.log
fi