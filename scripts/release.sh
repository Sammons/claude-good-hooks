#!/bin/bash

# ==============================================================================
# Claude Good Hooks - Release Script
# ==============================================================================
#
# OVERVIEW:
# This script initiates the release process for the Claude Good Hooks monorepo
# by creating and pushing a git tag. The actual package building and publishing
# is handled automatically by GitHub Actions.
#
# AUTOMATION WORKFLOW:
# 1. Developer runs this script locally: ./scripts/release.sh 1.2.3
# 2. Script validates environment and creates git tag "v1.2.3"
# 3. Script pushes tag to GitHub repository
# 4. GitHub Actions "Release" workflow (.github/workflows/release.yml) triggers
# 5. GitHub Actions handles building, version updating, and npm publishing
#
# GITHUB ACTIONS INTEGRATION:
# - Workflow: .github/workflows/release.yml
# - Trigger: Push of tags matching pattern "v*"
# - Environment: ubuntu-latest with Node.js 20.x and pnpm 10.12.4
# - Required Secrets:
#   - NPM_TOKEN: For publishing packages to npm registry
#   - GITHUB_TOKEN: Automatically provided for creating GitHub releases
#
# EXECUTION CONTEXT:
# - Manual execution: Run locally by developers to initiate releases
# - NOT run by CI/CD: This script runs locally, CI handles the actual release
# - Prerequisites: Clean working directory, main branch, network access
#
# PUBLISHED PACKAGES:
# The GitHub Action publishes these packages to npm:
# - claude-good-hooks-cli
# - claude-good-hooks-types  
# - dirty-hook
# - claude-good-hooks-template-hook
#
# ERROR HANDLING:
# - Validates semver format (x.y.z)
# - Checks for clean working directory
# - Verifies main branch (with override option)
# - Runs tests and build before tagging
# - Provides clear error messages and exit codes
#
# USAGE:
# ./scripts/release.sh <version>
# 
# EXAMPLES:
# ./scripts/release.sh 1.2.3          # Release version 1.2.3
# ./scripts/release.sh 2.0.0-beta.1   # Not supported - only stable releases
#
# ==============================================================================

set -e

# Detect if running in CI environment
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
  echo "❌ Error: This script is intended for local execution only."
  echo "   It should not be run in CI/CD environments."
  echo "   The GitHub Actions workflow handles the actual release process."
  exit 1
fi

# Validate command line arguments
if [ -z "$1" ]; then
  echo "❌ Error: Version argument required"
  echo ""
  echo "Usage: $0 <version>"
  echo "Example: $0 1.2.3"
  echo ""
  echo "📋 This script will:"
  echo "   1. Validate the environment and version format"
  echo "   2. Run tests and build the packages"
  echo "   3. Create and push a git tag"
  echo "   4. Trigger the automated GitHub Actions release workflow"
  echo ""
  echo "📖 For more details, see the header comments in this script"
  exit 1
fi

VERSION=$1

# Validate version format (stable semver releases only)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Error: Version must be in stable semver format x.y.z"
  echo "   Provided: $VERSION"
  echo "   Examples: 1.2.3, 2.0.0, 1.10.5"
  echo "   Note: Pre-release versions (beta, alpha, rc) are not supported by this script"
  exit 1
fi

# Validate required tools are available
echo "🔍 Validating environment..."

if ! command -v git &> /dev/null; then
  echo "❌ Error: git is required but not installed"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "❌ Error: pnpm is required but not installed"
  echo "   Install with: npm install -g pnpm"
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Check if remote origin is configured
if ! git remote get-url origin &> /dev/null; then
  echo "❌ Error: Git remote 'origin' is not configured"
  echo "   This is required to push the release tag"
  exit 1
fi

echo "🚀 Preparing release v$VERSION"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  Warning: You're not on the main branch (current: $CURRENT_BRANCH)"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if the tag already exists locally
if git tag -l | grep -q "^v$VERSION$"; then
  echo "❌ Error: Tag v$VERSION already exists locally"
  echo "   Use: git tag -d v$VERSION  # to delete local tag"
  exit 1
fi

# Check if the tag already exists on remote
if git ls-remote --tags origin | grep -q "refs/tags/v$VERSION$"; then
  echo "❌ Error: Tag v$VERSION already exists on remote"
  echo "   This version has already been released"
  exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: Working directory is not clean. Please commit your changes first."
  echo ""
  echo "Uncommitted changes:"
  git status --porcelain
  exit 1
fi

# Pull latest changes from remote
echo "📡 Pulling latest changes from origin/main..."
if ! git pull origin main; then
  echo "❌ Error: Failed to pull latest changes from origin/main"
  echo "   Please resolve any merge conflicts and try again"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
if ! pnpm install --frozen-lockfile; then
  echo "❌ Error: Failed to install dependencies"
  echo "   Check your pnpm-lock.yaml file and try again"
  exit 1
fi

# Run tests
echo "🧪 Running tests..."
if ! pnpm test; then
  echo "❌ Error: Tests failed"
  echo "   All tests must pass before creating a release"
  exit 1
fi

# Build packages
echo "🔨 Building packages..."
if ! pnpm build; then
  echo "❌ Error: Build failed"
  echo "   All packages must build successfully before creating a release"
  exit 1
fi

# Create and push tag
echo "🏷️  Creating tag v$VERSION..."
if ! git tag "v$VERSION"; then
  echo "❌ Error: Failed to create tag v$VERSION"
  exit 1
fi

echo "📤 Pushing tag to trigger release workflow..."
if ! git push origin "v$VERSION"; then
  echo "❌ Error: Failed to push tag to remote"
  echo "   Tag created locally but not pushed. You may need to:"
  echo "   - Check your network connection"
  echo "   - Verify you have push permissions to the repository"
  echo "   - Manually push with: git push origin v$VERSION"
  exit 1
fi

# Success message with monitoring instructions
echo ""
echo "✅ Release v$VERSION successfully initiated!"
echo ""
echo "📋 Next Steps:"
echo "   1. Monitor the GitHub Actions workflow at:"
echo "      https://github.com/sammons/claude-good-hooks/actions"
echo ""
echo "   2. The workflow will automatically:"
echo "      • Update package.json versions to $VERSION"
echo "      • Build all packages"
echo "      • Run tests in the CI environment"
echo "      • Publish to npm registry:"
echo "        - claude-good-hooks-cli"
echo "        - claude-good-hooks-types"
echo "        - dirty-hook"
echo "        - claude-good-hooks-template-hook"
echo "      • Create a GitHub release with auto-generated notes"
echo ""
echo "   3. If the workflow fails, check the logs and address any issues"
echo ""
echo "🎉 Release process complete! The packages will be available on npm shortly."