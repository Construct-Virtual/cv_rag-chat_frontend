#!/bin/bash

# SOP AI Agent Chat Interface - Development Environment Setup Script
# This script sets up and runs the complete development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   SOP AI Agent Chat Interface - Development Setup         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Check prerequisites
    print_step "Checking prerequisites..."

    local missing_deps=0

    if ! command_exists node; then
        print_error "Node.js is not installed (required: 20+)"
        missing_deps=1
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            print_error "Node.js version must be 20+ (current: $(node -v))"
            missing_deps=1
        else
            print_success "Node.js $(node -v) found"
        fi
    fi

    if ! command_exists python3; then
        print_error "Python 3 is not installed (required: 3.11+)"
        missing_deps=1
    else
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
        print_success "Python $(python3 --version | cut -d' ' -f2) found"
    fi

    if ! command_exists pnpm; then
        print_warning "pnpm is not installed (recommended for Next.js)"
        print_warning "Installing pnpm globally..."
        npm install -g pnpm
    else
        print_success "pnpm $(pnpm -v) found"
    fi

    if ! command_exists pip3; then
        print_error "pip3 is not installed"
        missing_deps=1
    else
        print_success "pip3 found"
    fi

    if [ $missing_deps -eq 1 ]; then
        print_error "Missing required dependencies. Please install them and try again."
        exit 1
    fi

    echo ""

    # Check for environment files
    print_step "Checking environment configuration..."

    if [ ! -f "backend/.env" ]; then
        print_warning "Backend .env file not found"
        print_warning "Creating backend/.env from template..."
        mkdir -p backend
        cat > backend/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key_here_use_a_long_random_string
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS Configuration (update with your frontend URL)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EOF
        print_warning "Please edit backend/.env with your actual credentials before continuing"
        print_warning "Press Enter when you've updated backend/.env..."
        read
    else
        print_success "Backend .env file found"
    fi

    if [ ! -f "frontend/.env.local" ]; then
        print_warning "Frontend .env.local file not found"
        print_warning "Creating frontend/.env.local from template..."
        mkdir -p frontend
        cat > frontend/.env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
        print_warning "Please edit frontend/.env.local with your actual credentials before continuing"
        print_warning "Press Enter when you've updated frontend/.env.local..."
        read
    else
        print_success "Frontend .env.local file found"
    fi

    echo ""

    # Backend setup
    print_step "Setting up backend..."

    if [ -d "backend" ]; then
        cd backend

        # Create virtual environment if it doesn't exist
        if [ ! -d "venv" ]; then
            print_step "Creating Python virtual environment..."
            python3 -m venv venv
            print_success "Virtual environment created"
        fi

        # Activate virtual environment
        print_step "Activating virtual environment..."
        source venv/bin/activate

        # Install/update dependencies
        if [ -f "requirements.txt" ]; then
            print_step "Installing Python dependencies..."
            pip install --upgrade pip
            pip install -r requirements.txt
            print_success "Python dependencies installed"
        else
            print_warning "requirements.txt not found, skipping Python dependency installation"
        fi

        cd ..
    else
        print_warning "Backend directory not found, skipping backend setup"
    fi

    echo ""

    # Frontend setup
    print_step "Setting up frontend..."

    if [ -d "frontend" ]; then
        cd frontend

        if [ -f "package.json" ]; then
            print_step "Installing Node.js dependencies..."
            pnpm install
            print_success "Node.js dependencies installed"
        else
            print_warning "package.json not found, skipping Node.js dependency installation"
        fi

        cd ..
    else
        print_warning "Frontend directory not found, skipping frontend setup"
    fi

    echo ""
    print_success "Setup complete!"
    echo ""

    # Start services
    print_step "Starting development servers..."
    echo ""

    # Function to handle cleanup on script exit
    cleanup() {
        echo ""
        print_step "Shutting down servers..."
        kill $(jobs -p) 2>/dev/null
        print_success "Servers stopped"
        exit 0
    }

    trap cleanup SIGINT SIGTERM

    # Start backend
    if [ -d "backend" ]; then
        print_step "Starting FastAPI backend on http://localhost:8000..."
        cd backend
        source venv/bin/activate
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
        BACKEND_PID=$!
        cd ..
        print_success "Backend started (PID: $BACKEND_PID)"
        echo "  → API Documentation: http://localhost:8000/docs"
        echo "  → Health Check: http://localhost:8000/api/health"
    fi

    # Wait a moment for backend to start
    sleep 2

    # Start frontend
    if [ -d "frontend" ]; then
        print_step "Starting Next.js frontend on http://localhost:3000..."
        cd frontend
        pnpm dev &
        FRONTEND_PID=$!
        cd ..
        print_success "Frontend started (PID: $FRONTEND_PID)"
        echo "  → Application: http://localhost:3000"
    fi

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                  Development Environment                   ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Frontend:  http://localhost:3000                          ║"
    echo "║  Backend:   http://localhost:8000                          ║"
    echo "║  API Docs:  http://localhost:8000/docs                     ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║  Press Ctrl+C to stop all servers                          ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""

    # Keep script running
    wait
}

# Run main function
main "$@"
