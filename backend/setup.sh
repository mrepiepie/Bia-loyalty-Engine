#!/bin/bash

# Installation Script for BIA Loyalty Backend
# This script sets up the backend for local development and deployment

echo "🚀 BIA Loyalty Engine Backend - Setup Script"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Navigate to backend directory
cd "$(dirname "$0")" || exit

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p data

# Copy .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Setting up environment file..."
    cp .env.example .env
    echo "   ⚠️  Remember to update JWT_SECRET in .env for production!"
fi

echo ""
echo "=============================================="
echo "✅ Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env with your configuration"
echo "   2. Run: npm start (production) or npm run dev (development)"
echo "   3. Backend will be available at http://localhost:5000"
echo ""
echo "🐳 For Docker deployment:"
echo "   docker-compose up -d"
echo "=============================================="
