#!/bin/bash
# Fetch external data from bible-story-builder GitHub releases and repo.
# Run before build: pnpm fetch-data
#
# Reads site.config.json for which templates to fetch.
#
# Sources:
#   - Release assets: ALL-langs-data.zip, {Template}-ALL-timings.zip, {Template}-content.zip
#   - Repo export/: ALL-langs*.json
#
# Targets:
#   - public/ALL-langs-data/
#   - public/ALL-langs*.json
#   - public/templates/{Template}/ALL-timings/
#   - src/data/content/templates/{Template}/

set -euo pipefail

REPO="larsgson/bible-story-builder"
PUBLIC_DIR="public"
CONFIG="site.config.json"
TMP_DIR=$(mktemp -d)

trap "rm -rf $TMP_DIR" EXIT

# Read templates from site.config.json
if [ ! -f "$CONFIG" ]; then
    echo "ERROR: $CONFIG not found" >&2
    exit 1
fi
TEMPLATES=$(node -e "require('./$CONFIG').templates.forEach(t=>console.log(t))")

echo "── Fetching data from $REPO ──"
echo "Templates: $(echo $TEMPLATES | tr '\n' ' ')"

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

# ── 3. Per-template data from latest release ──
for tpl in $TEMPLATES; do
    # Timing data
    zip_name="${tpl}-ALL-timings.zip"
    echo "Fetching $zip_name..."
    if curl -sfL "$RELEASE_URL/$zip_name" -o "$TMP_DIR/$zip_name" 2>/dev/null; then
        rm -rf "$PUBLIC_DIR/templates/$tpl/ALL-timings"
        mkdir -p "$PUBLIC_DIR/templates/$tpl/ALL-timings"
        unzip -q "$TMP_DIR/$zip_name" -d "$PUBLIC_DIR/templates/$tpl/ALL-timings"
        echo "  ✓ $tpl timing data"
    else
        echo "  ⊘ No timing data for $tpl"
    fi

    # Template content (markdown, locales, index.toml)
    content_zip="${tpl}-content.zip"
    echo "Fetching $content_zip..."
    if curl -sfL "$RELEASE_URL/$content_zip" -o "$TMP_DIR/$content_zip" 2>/dev/null; then
        rm -rf "src/data/content/templates/$tpl"
        mkdir -p "src/data/content/templates/$tpl"
        unzip -q "$TMP_DIR/$content_zip" -d "src/data/content/templates/"
        echo "  ✓ $tpl content"
    else
        echo "  ⊘ No content zip for $tpl"
    fi
done

echo ""
echo "── Data fetch complete ──"
