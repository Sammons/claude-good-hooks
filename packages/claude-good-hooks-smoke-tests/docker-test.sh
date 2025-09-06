#!/bin/bash

# Docker Test Execution Script for Claude Good Hooks Smoke Tests
# This script provides a better development workflow using docker exec

set -e

CONTAINER_NAME="claude-good-hooks-smoke-tests"
IMAGE_NAME="claude-good-hooks-smoke-tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if container is running
is_container_running() {
    docker ps -q -f name="$CONTAINER_NAME" | grep -q .
}

# Function to check if container exists (running or stopped)
container_exists() {
    docker ps -a -q -f name="$CONTAINER_NAME" | grep -q .
}

# Function to build the Docker image
build_image() {
    print_info "Building Docker image..."
    docker build -t "$IMAGE_NAME" -f Dockerfile ../../
    print_success "Docker image built successfully"
}

# Function to start the container
start_container() {
    if container_exists; then
        print_info "Container exists, checking if it's running..."
        if is_container_running; then
            print_info "Container is already running"
        else
            print_info "Starting existing container..."
            docker start "$CONTAINER_NAME"
            print_success "Container started"
        fi
    else
        print_info "Creating and starting new container..."
        docker run -d \
            --name "$CONTAINER_NAME" \
            -v "$(pwd)/../../packages/claude-good-hooks-types:/app/packages/claude-good-hooks-types" \
            -v "$(pwd)/../../packages/claude-good-hooks-cli:/app/packages/claude-good-hooks-cli" \
            -v "$(pwd):/app/packages/claude-good-hooks-smoke-tests" \
            -v "$(pwd)/../../package.json:/app/package.json" \
            -v "$(pwd)/../../pnpm-workspace.yaml:/app/pnpm-workspace.yaml" \
            -v "$(pwd)/../../pnpm-lock.yaml:/app/pnpm-lock.yaml" \
            -w /app/packages/claude-good-hooks-smoke-tests \
            -e NODE_ENV=test \
            "$IMAGE_NAME" \
            tail -f /dev/null
        print_success "Container created and started"
    fi
    
    # Wait a moment for container to be ready
    sleep 2
}

# Function to stop the container
stop_container() {
    if is_container_running; then
        print_info "Stopping container..."
        docker stop "$CONTAINER_NAME"
        print_success "Container stopped"
    else
        print_warning "Container is not running"
    fi
}

# Function to remove the container
remove_container() {
    if container_exists; then
        print_info "Removing container..."
        docker rm -f "$CONTAINER_NAME"
        print_success "Container removed"
    else
        print_warning "Container does not exist"
    fi
}

# Function to execute command in container
exec_in_container() {
    if ! is_container_running; then
        print_error "Container is not running. Please start it first."
        exit 1
    fi
    
    print_info "Executing: $*"
    docker exec -it "$CONTAINER_NAME" "$@"
}

# Function to run tests
run_tests() {
    local test_args="$*"
    if [ -z "$test_args" ]; then
        test_args="pnpm run smoke"
    fi
    
    print_info "Running tests: $test_args"
    exec_in_container bash -c "$test_args"
}

# Function to run tests in watch mode
run_tests_watch() {
    print_info "Running tests in watch mode..."
    exec_in_container pnpm run test:watch
}

# Function to run a specific test file
run_test_file() {
    local test_file="$1"
    if [ -z "$test_file" ]; then
        print_error "Please specify a test file"
        exit 1
    fi
    
    print_info "Running specific test file: $test_file"
    exec_in_container pnpm run test "$test_file"
}

# Function to open shell in container
shell() {
    print_info "Opening shell in container..."
    exec_in_container bash
}

# Function to check logs
logs() {
    print_info "Showing container logs..."
    docker logs "$CONTAINER_NAME" "$@"
}

# Function to clean up everything
cleanup() {
    print_info "Cleaning up Docker resources..."
    remove_container
    docker rmi -f "$IMAGE_NAME" 2>/dev/null || true
    docker system prune -f
    print_success "Cleanup complete"
}

# Function to show status
status() {
    echo -e "\n${BLUE}📊 Container Status${NC}"
    echo "===================="
    
    if container_exists; then
        if is_container_running; then
            print_success "Container is running"
            echo -e "\nContainer info:"
            docker ps --filter name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            print_warning "Container exists but is stopped"
        fi
    else
        print_info "Container does not exist"
    fi
    
    echo -e "\nImage info:"
    if docker images "$IMAGE_NAME" --format "{{.Repository}}" | grep -q "$IMAGE_NAME"; then
        docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
    else
        print_warning "Image does not exist"
    fi
}

# Main command dispatcher
case "${1:-help}" in
    build)
        build_image
        ;;
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        stop_container
        start_container
        ;;
    remove|rm)
        remove_container
        ;;
    test)
        shift
        run_tests "$@"
        ;;
    test:watch)
        run_tests_watch
        ;;
    test:file)
        shift
        run_test_file "$1"
        ;;
    shell|sh)
        shell
        ;;
    exec)
        shift
        exec_in_container "$@"
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    cleanup)
        cleanup
        ;;
    setup)
        build_image
        start_container
        print_success "Setup complete! Container is ready for testing."
        print_info "Run './docker-test.sh test' to run all tests"
        print_info "Run './docker-test.sh test:watch' for watch mode"
        print_info "Run './docker-test.sh shell' to open a shell"
        ;;
    help|--help|-h)
        echo -e "${BLUE}🐳 Claude Good Hooks - Docker Test Script${NC}"
        echo "=============================================="
        echo ""
        echo "This script provides a better development workflow using docker exec"
        echo "instead of docker run, allowing for faster iteration and debugging."
        echo ""
        echo -e "${YELLOW}Commands:${NC}"
        echo "  setup                    Build image and start container"
        echo "  build                    Build the Docker image"
        echo "  start                    Start the container"
        echo "  stop                     Stop the container"
        echo "  restart                  Restart the container"
        echo "  remove, rm               Remove the container"
        echo "  test [args]              Run tests (default: pnpm run smoke)"
        echo "  test:watch               Run tests in watch mode"
        echo "  test:file <file>         Run specific test file"
        echo "  shell, sh                Open shell in container"
        echo "  exec <command>           Execute command in container"
        echo "  logs [options]           Show container logs"
        echo "  status                   Show container and image status"
        echo "  cleanup                  Remove container and image, clean up"
        echo "  help                     Show this help"
        echo ""
        echo -e "${YELLOW}Examples:${NC}"
        echo "  ./docker-test.sh setup                           # First time setup"
        echo "  ./docker-test.sh test                            # Run all tests"
        echo "  ./docker-test.sh test:watch                      # Watch mode"
        echo "  ./docker-test.sh test:file cli.help.smoke.test.ts  # Specific test"
        echo "  ./docker-test.sh exec pnpm build                 # Build in container"
        echo "  ./docker-test.sh shell                           # Open shell"
        echo ""
        echo -e "${YELLOW}Development Workflow:${NC}"
        echo "  1. ./docker-test.sh setup     # Initial setup"
        echo "  2. ./docker-test.sh test:watch # Start watch mode"
        echo "  3. Edit files (auto-reloads due to volume mounts)"
        echo "  4. ./docker-test.sh shell      # Debug if needed"
        echo ""
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run './docker-test.sh help' for available commands"
        exit 1
        ;;
esac