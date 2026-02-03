#!/bin/bash

# Investment Tracker - Quick Start Script

echo "🚀 Investment Tracker - Starting Development Environment"
echo ""

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found!"
    echo "Creating from template..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env with your Supabase credentials"
    exit 1
fi

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔄 To start developing:"
echo ""
echo "Terminal 1 - Start Backend:"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 - Start Frontend:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
