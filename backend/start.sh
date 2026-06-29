#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=========================================="
echo "  Go Campus Backend - Starting..."
echo "=========================================="

mkdir -p mobilidadeUniversitaria/uploads

docker compose up -d --build

echo "Backend started on port 8082"
echo ""
echo "=========================================="
echo "  Backend ready!"
echo "=========================================="
