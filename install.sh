#!/bin/bash

# Exit on error
set -e

echo "==================================================="
echo "⚡ Installing Forge AI Dependencies... ⚡"
echo "==================================================="
echo

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed."
    echo "Please install Node.js (v18 or higher) and try again."
    exit 1
fi

echo "📦 Running npm install..."
npm install

echo
echo "==================================================="
echo "⚙️ Running Forge AI Configuration Wizard... ⚙️"
echo "==================================================="
echo
node scripts/setup.js

echo
echo "==================================================="
echo "🔍 Verifying Environment Setup... 🔍"
echo "==================================================="
echo
node scripts/validate-env.js

echo
echo "🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉"
echo
echo "To start Forge AI at any time, run:"
echo "   ./start.sh"
echo
