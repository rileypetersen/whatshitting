#!/bin/bash

# Print test header
echo "===================================================="
echo "    What's Hitting - Comprehensive Test Suite"
echo "===================================================="

# Check project structure first
echo -e "\n📁 Testing Project Structure\n"
cd ~/projects/whatshitting
npm test -- tests/project-structure.test.js

# Start the server for API testing
echo -e "\n🚀 Starting server for API tests...\n"
cd ~/projects/whatshitting/server
node index.js > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Run server tests
echo -e "\n🧪 Running API tests\n"
cd ~/projects/whatshitting/server
npm test

# Run client tests
echo -e "\n🧩 Running client tests\n"
cd ~/projects/whatshitting/client
npm test

# Cleanup
echo -e "\n🧹 Cleaning up...\n"
kill $SERVER_PID

# Summary
echo -e "\n✅ All tests completed!\n"
echo "===================================================="
echo "              Test Summary Report"
echo "===================================================="
echo "Check the detailed test reports above for results."
echo "Any failed tests need to be addressed before deployment."
echo "====================================================" 