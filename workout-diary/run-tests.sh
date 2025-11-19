#!/bin/bash
# Shell script to run all tests
# Usage: ./run-tests.sh

echo "========================================="
echo "Running All Tests"
echo "========================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Run pytest with verbose output
python -m pytest tests/ -v

# Capture exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "========================================="
    echo "All tests passed!"
    echo "========================================="
else
    echo "========================================="
    echo "Some tests failed!"
    echo "========================================="
fi

exit $EXIT_CODE

