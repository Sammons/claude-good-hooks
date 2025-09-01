#!/bin/bash

# Docker Test Setup Verification Script
# This script verifies that the Docker setup works correctly

set -e

echo "🐳 Claude Good Hooks - Docker Smoke Tests Setup Verification"
echo "============================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available"
    exit 1
fi

echo "✅ Docker is installed and running"

# Check if we're in the right directory
if [ ! -f "Dockerfile" ] || [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the smoke tests directory"
    echo "Expected files: Dockerfile, docker-compose.yml"
    exit 1
fi

echo "✅ Required Docker files found"

# Test building the Docker image
echo ""
echo "📦 Building Docker image..."
if docker-compose build smoke-tests; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

# Test running the smoke tests
echo ""
echo "🧪 Running smoke tests in Docker..."
if docker-compose run --rm smoke-tests pnpm build; then
    echo "✅ TypeScript compilation successful in Docker"
else
    echo "❌ TypeScript compilation failed in Docker"
    exit 1
fi

echo ""
echo "🎉 Docker setup verification completed successfully!"
echo ""
echo "You can now use these commands:"
echo "  pnpm run docker:test          # Run tests once"
echo "  pnpm run docker:test:watch    # Run tests in watch mode"
echo "  pnpm run docker:build         # Build Docker image"
echo "  pnpm run docker:clean         # Clean up Docker resources"
echo ""
echo "From monorepo root:"
echo "  pnpm test:smoke:docker         # Run Docker tests"
echo "  pnpm test:smoke:docker:watch   # Watch mode"