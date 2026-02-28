#!/usr/bin/env bash
# Build the web app for VPS demo deployment
# 
# Usage:
#   ./scripts/demo_build_web.sh
#
# Output:
#   - Build artifacts in apps/web/dist/
#   - Docker image tagged as pdf-to-voice-web:latest

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

WEB_DIR="$REPO_ROOT/apps/web"
DEPLOY_DIR="$REPO_ROOT/deploy"

echo "=== Building Web App for VPS Demo ==="
echo "Repository: $REPO_ROOT"
echo "Web directory: $WEB_DIR"

# Check prerequisites
if ! command -v docker &>/dev/null; then
    echo "Error: Docker is required but not installed" >&2
    exit 1
fi

# Build the Docker image
echo ""
echo "Building Docker image..."
cd "$REPO_ROOT"
docker build -f deploy/Dockerfile.web -t pdf-to-voice-web:latest "$WEB_DIR"

echo ""
echo "=== Build Complete ==="
echo "Image: pdf-to-voice-web:latest"
echo ""
echo "To test locally:"
echo "  docker run -p 8080:80 pdf-to-voice-web:latest"
echo ""
echo "To deploy with docker-compose:"
echo "  docker compose -f deploy/docker-compose.demo.yml up -d"
