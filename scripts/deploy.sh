#!/bin/bash
set -e

# ===================================================
#  Erq Marketplace — Ubuntu Production Deploy Script
#  Usage: bash scripts/deploy.sh
# ===================================================

echo "🚀 Starting Erq deployment..."

# 1. Load environment variables
if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
else
  echo "❌ .env.production file not found! Create it from .env.production.example"
  exit 1
fi

# 2. Pull latest code (if using git)
if [ -d .git ]; then
  echo "📦 Pulling latest code..."
  git pull origin main
fi

# 3. Install dependencies
echo "📦 Installing server dependencies..."
npm install --production

echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

# 4. Build client
echo "🔨 Building client..."
cd client && npm run build && cd ..

# 5. Copy logo into public/ (if not already there)
if [ ! -f client/public/high-resolution-color-logo.png ]; then
  echo "🖼️  Copying logo to client/public/..."
  cp high-resolution-color-logo.png client/public/high-resolution-color-logo.png
fi

# 6. Create required directories
echo "📁 Creating required directories..."
mkdir -p uploads/agent-files uploads/profiles uploads/portfolio logs

# 7. Restart with PM2
if command -v pm2 &> /dev/null; then
  echo "🔄 Restarting with PM2..."
  pm2 startOrRestart ecosystem.config.js
  pm2 save
else
  echo "⚠️  PM2 not found. Install it: npm install -g pm2"
  echo "   Then run: pm2 start ecosystem.config.js"
fi

# 8. Verify
echo ""
echo "✅ Deployment complete!"
echo "   App:        http://localhost:${PORT:-5000}"
echo "   Logs:       pm2 logs erq"
echo "   Status:     pm2 status"
echo ""
