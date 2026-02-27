#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="${PROJECT_DIR}/dist"
ASSETS_DIR="${PROJECT_DIR}/assets"
BUNDLE_ID="com.tabor.argon"

# ── Builds ──────────────────────────────────────────────
# 1. Argon        (matte icon)
# 2. Argon Glass  (glass icon)
# ────────────────────────────────────────────────────────

svg_to_icns() {
  local svg_path="$1"
  local icns_path="$2"
  local iconset_dir
  iconset_dir=$(mktemp -d)/icon.iconset
  mkdir -p "$iconset_dir"

  # Render SVG to 1024px PNG
  local tmp_png
  tmp_png=$(mktemp /tmp/icon_XXXX.png)
  qlmanage -t -s 1024 -o /tmp "$svg_path" 2>/dev/null
  local svg_basename
  svg_basename=$(basename "$svg_path")
  mv "/tmp/${svg_basename}.png" "$tmp_png"

  # Generate all required sizes
  for size in 16 32 128 256 512; do
    sips -z $size $size "$tmp_png" --out "${iconset_dir}/icon_${size}x${size}.png" >/dev/null 2>&1
    local double=$((size * 2))
    sips -z $double $double "$tmp_png" --out "${iconset_dir}/icon_${size}x${size}@2x.png" >/dev/null 2>&1
  done

  # iconutil to create .icns
  iconutil -c icns "$iconset_dir" -o "$icns_path"
  rm -rf "$(dirname "$iconset_dir")" "$tmp_png"
  echo "   Created: $icns_path"
}

build_and_install() {
  local app_name="$1"
  local icns_path="$2"
  local app_dir="/Applications/${app_name}.app"

  echo ""
  echo "── Building ${app_name} ──"

  npx @electron/packager . "$app_name" \
    --platform=darwin \
    --arch=$(uname -m) \
    --out="$DIST_DIR" \
    --overwrite \
    --app-bundle-id="$BUNDLE_ID" \
    --app-version="$(node -p "require('./package.json').version")" \
    --icon="$icns_path" \
    --ignore="^/dist" \
    --ignore="^/build-and-install.sh" \
    --ignore="^/\.git" \
    --ignore="^/\.claude" \
    --ignore="^/assets" \
    --ignore="THEME_GUIDE\.md" \
    2>&1 | grep -E "^(Packaging|Wrote|WARNING)" || true

  local built_app
  built_app=$(find "$DIST_DIR" -path "*${app_name}*" -name "*.app" -maxdepth 2 | head -1)

  if [ -z "$built_app" ]; then
    echo "   ERROR: Build failed — no .app found"
    return 1
  fi

  # Self-sign
  codesign --force --deep --sign - "$built_app" 2>/dev/null
  echo "   Signed"

  # Install
  if [ -d "$app_dir" ]; then
    rm -rf "$app_dir"
  fi
  cp -R "$built_app" "$app_dir"
  xattr -cr "$app_dir" 2>/dev/null || true
  echo "   Installed → $app_dir"
}

# ── Main ────────────────────────────────────────────────

echo "=== Argon — Build & Install ==="

# Step 1: Dependencies
echo "[1/4] Dependencies..."
cd "$PROJECT_DIR"
npm install --silent 2>/dev/null
npm list @electron/packager 2>/dev/null || npm install --save-dev @electron/packager 2>/dev/null

# Step 2: Convert icons
echo "[2/4] Converting icons to .icns..."
mkdir -p "$ASSETS_DIR"
svg_to_icns "${ASSETS_DIR}/icon-matte.svg" "${ASSETS_DIR}/icon-matte.icns"
svg_to_icns "${ASSETS_DIR}/icon.svg" "${ASSETS_DIR}/icon-glass.icns"

# Step 3: Clean
echo "[3/4] Cleaning previous builds..."
rm -rf "$DIST_DIR"

# Step 4: Build both apps
echo "[4/4] Packaging..."
build_and_install "Argon" "${ASSETS_DIR}/icon-matte.icns"
build_and_install "Argon Glass" "${ASSETS_DIR}/icon-glass.icns"

echo ""
echo "=== Done! ==="
echo "Installed:"
echo "  • Argon         (matte icon)"
echo "  • Argon Glass   (glass icon)"
echo ""
echo "Launch either from Spotlight or your Applications folder."
