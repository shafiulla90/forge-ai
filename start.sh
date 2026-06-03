#!/bin/bash

echo "==================================================="
echo "⚡ Starting Forge AI... ⚡"
echo "==================================================="
echo

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️ Configuration file (.env.local) not found."
    echo "Running installation first..."
    echo
    chmod +x install.sh
    ./install.sh
    exit $?
fi

# Validate environment configuration
node scripts/validate-env.js
if [ $? -ne 0 ]; then
    echo "❌ Validation failed. Please fix your .env.local or re-run setup."
    exit 1
fi

echo
echo "🚀 Starting the development server..."
echo "🌍 Opening Forge AI in your default browser at http://localhost:3000"
echo

# Launch the browser in parallel after a 3-second delay to let Next.js boot
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 3 && open http://localhost:3000) &
else
    (sleep 3 && (xdg-open http://localhost:3000 || sensible-browser http://localhost:3000 || python -m webbrowser http://localhost:3000)) &>/dev/null &
fi

# Start Next.js dev server
npm run dev
