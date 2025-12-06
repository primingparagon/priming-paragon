
#!/bin/bash

echo "Priming Paragon — post-creation script running..."

# Install global packages needed for dev
npm install -g vite
npm install -g three
npm install -g @theatre/core @theatre/studio

# Python dependencies
pip install requests flask fastapi uvicorn

# Create project structure if empty
mkdir -p src
mkdir -p assets
mkdir -p scripts
mkdir -p backend

echo "All tools installed!"
