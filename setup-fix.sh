#!/bin/bash

# TOPPTIC - Automated Setup & Fix Script
# This script fixes all localhost issues automatically

set -e

echo "=========================================="
echo "  TOPPTIC - Complete Setup & Fix Script"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check Node.js installation
echo "📦 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    error "Node.js not found. Please install Node.js v18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
success "Node.js $NODE_VERSION found"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm not found"
    exit 1
fi
NPM_VERSION=$(npm -v)
success "npm $NPM_VERSION found"

echo ""
echo "🔧 Step 1: Cleaning up old installations..."
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force
success "Cleanup complete"

echo ""
echo "📚 Step 2: Installing dependencies..."
npm install
success "Dependencies installed"

echo ""
echo "🔨 Step 3: Installing dev dependencies for testing..."
npm install -D jest \
    @testing-library/react \
    @testing-library/jest-dom \
    ts-jest \
    supertest \
    axios \
    jest-mock-extended \
    @types/jest
success "Dev dependencies installed"

echo ""
echo "⚙️  Step 4: Creating environment file (.env.local)..."
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOF'
# Environment Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development
DATABASE_URL=sqlite:///./dev.db
LOG_LEVEL=debug
EOF
    success ".env.local created with default values"
else
    warning ".env.local already exists, skipping"
fi

echo ""
echo "🧪 Step 5: Creating Jest configuration..."
if [ ! -f "jest.config.js" ]; then
    cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
EOF
    success "jest.config.js created"
else
    warning "jest.config.js already exists, skipping"
fi

echo ""
echo "📁 Step 6: Creating test directories..."
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
success "Test directories created"

echo ""
echo "🌐 Step 7: Checking for port conflicts..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "Port 3000 is already in use"
    PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    echo "Process ID: $PID"
    read -p "Kill this process? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID
        success "Process killed"
    fi
else
    success "Port 3000 is available"
fi

echo ""
echo "🔍 Step 8: Checking TypeScript..."
if npm run build >/dev/null 2>&1; then
    success "TypeScript build successful"
else
    warning "TypeScript build had issues - check above"
fi

echo ""
echo "🚀 Step 9: Tauri setup (if needed)..."
if [ -d "src-tauri" ]; then
    echo "Tauri detected, checking Rust..."
    if command -v rustc &> /dev/null; then
        success "Rust found: $(rustc --version)"
        cd src-tauri
        cargo build 2>/dev/null || warning "Cargo build had issues"
        cd ..
    else
        warning "Rust not found. Install from https://www.rust-lang.org"
    fi
else
    warning "No src-tauri directory found"
fi

echo ""
echo "=========================================="
echo "  ✅ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "1. Update .env.local with your configuration"
echo "2. Start dev server:     npm run dev"
echo "3. Run tests:            npm test"
echo "4. Build for production: npm run build"
echo ""
echo "🔗 Useful commands:"
echo "   npm test --watch       # Run tests in watch mode"
echo "   npm test --coverage    # Generate coverage report"
echo "   npm run lint          # Check code style"
echo "   npm run dev -- -p 3001 # Run on different port"
echo ""
echo "📚 Documentation: See TOPPTIC_TEST_REPORT_AND_SETUP.md"
echo ""
