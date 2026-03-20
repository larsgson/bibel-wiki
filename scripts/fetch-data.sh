#!/bin/bash
# Fetch external data from bible-story-builder GitHub releases and repo.
# Run before build: pnpm fetch-data
#
# Sources:
#   - Release assets: ALL-langs-data.zip, {Template}-ALL-timings.zip
#   - Repo export/: ALL-langs*.json
#
# Targets:
#   - public/ALL-langs-data/
#   - public/ALL-langs*.json
#   - public/templates/{Template}/ALL-timings/

set -euo pipefail

REPO="larsgson/bible-story-builder"
PUBLIC_DIR="public"
TEMPLATES_DIR="src/data/content/templates"
TMP_DIR=$(mktemp -d)

trap "rm -rf $TMP_DIR" EXIT

echo "── Fetching data from $REPO ──"

# Get the latest release download URL prefix
RELEASE_URL="https://github.com/$REPO/releases/latest/download"

# ── 1. Language JSON files from repo main branch ──
echo "Fetching language JSON files..."
for f in ALL-langs-compact.json ALL-langs-mini.json; do
    curl -sfL "https://raw.githubusercontent.com/$REPO/main/export/$f" -o "$PUBLIC_DIR/$f"
    echo "  ✓ $f"
done

# ── 2. ALL-langs-data from latest release ──
echo "Fetching ALL-langs-data.zip..."
curl -sfL "$RELEASE_URL/ALL-langs-data.zip" -o "$TMP_DIR/ALL-langs-data.zip"
rm -rf "$PUBLIC_DIR/ALL-langs-data"
mkdir -p "$PUBLIC_DIR/ALL-langs-data"
unzip -q "$TMP_DIR/ALL-langs-data.zip" -d "$PUBLIC_DIR/ALL-langs-data"
echo "  ✓ ALL-langs-data/"

# ── 3. Template timing data from latest release ──
# Discover templates from src/data/content/templates/ and fetch matching timing zips
for tpl_dir in "$TEMPLATES_DIR"/*/; do
    tpl=$(basename "$tpl_dir")
    zip_name="${tpl}-ALL-timings.zip"

    echo "Fetching $zip_name..."
    if curl -sfL "$RELEASE_URL/$zip_name" -o "$TMP_DIR/$zip_name" 2>/dev/null; then
        rm -rf "$PUBLIC_DIR/templates/$tpl/ALL-timings"
        mkdir -p "$PUBLIC_DIR/templates/$tpl/ALL-timings"
        unzip -q "$TMP_DIR/$zip_name" -d "$PUBLIC_DIR/templates/$tpl/ALL-timings"
        echo "  ✓ $tpl timing data"
    else
        echo "  ⊘ No timing data for $tpl (no $zip_name in release)"
    fi
done

echo ""
echo "── Data fetch complete ──"
