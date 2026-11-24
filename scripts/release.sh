#!/usr/bin/env bash
# Build a platform release and copy the installer into .releases/.
# Usage: bash scripts/release.sh <macos|windows|android|ios|all>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p .releases

macos() {
  pnpm tauri build
  cp src-tauri/target/release/bundle/dmg/*.dmg .releases/
  cp -R src-tauri/target/release/bundle/macos/*.app .releases/
}

windows() {
  if ! rustup target list --installed | grep -qx x86_64-pc-windows-gnu; then
    rustup target add x86_64-pc-windows-gnu
  fi

  local shim makensis
  shim="$(mktemp -d)"
  makensis="${MAKENSIS:-/opt/homebrew/bin/makensis}"
  if [ ! -x "$makensis" ]; then
    echo "makensis not found at $makensis (brew install makensis)" >&2
    exit 1
  fi
  # Tauri looks for makensis.exe even on macOS hosts.
  printf '#!/bin/sh\nexec "%s" "$@"\n' "$makensis" > "$shim/makensis.exe"
  chmod +x "$shim/makensis.exe"

  PATH="$shim:$PATH" pnpm tauri build --target x86_64-pc-windows-gnu -b nsis --ci
  cp src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/*.exe .releases/
  rm -rf "$shim"
}

android() {
  : "${JAVA_HOME:=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
  : "${ANDROID_HOME:=/opt/homebrew/share/android-commandlinetools}"
  : "${NDK_HOME:=$(ls -1d "$ANDROID_HOME"/ndk/* 2>/dev/null | sort -V | tail -1)}"
  export JAVA_HOME ANDROID_HOME NDK_HOME
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
  export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

  pnpm tauri android build --ci --apk -t aarch64

  local unsigned keystore signer
  unsigned="$(find src-tauri/gen/android/app/build/outputs/apk -name '*-unsigned.apk' | head -1)"
  keystore="${ANDROID_KEYSTORE:-$HOME/.android/debug.keystore}"
  if [ ! -f "$keystore" ]; then
    mkdir -p "$(dirname "$keystore")"
    keytool -genkeypair -v -keystore "$keystore" -storepass android \
      -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 \
      -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null
  fi
  signer="$(ls -1 "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)"
  "$signer" sign --ks "$keystore" --ks-pass pass:android --key-pass pass:android \
    --out .releases/Ledger-Notes_0.1.0_arm64.apk "$unsigned"
  # apksigner writes a verification sidecar that is not needed for distribution.
  rm -f .releases/Ledger-Notes_0.1.0_arm64.apk.idsig
}

ios() {
  : "${XCODE_DEVELOPER_DIR:=/Applications/Xcode.app/Contents/Developer}"
  export DEVELOPER_DIR="$XCODE_DEVELOPER_DIR"

  local shim out tool
  shim="$(mktemp -d)"
  out="$(mktemp -d)"
  trap "rm -rf '$shim' '$out'" EXIT

  # Xcode is installed but not selected as the active developer directory.
  # These shims make cargo/cc-rs/swift use the full Xcode toolchain.
  for tool in xcrun clang clang++ swift swiftc swift-frontend; do
    printf '#!/bin/sh\nexport DEVELOPER_DIR="%s"\nexec /usr/bin/%s "$@"\n' \
      "$XCODE_DEVELOPER_DIR" "$tool" > "$shim/$tool"
    chmod +x "$shim/$tool"
  done

  (cd src-tauri && PATH="$shim:$PATH" cargo build --target aarch64-apple-ios --release)

  local gen sdk swiftlib clang lib clean
  gen="src-tauri/gen/apple"
  sdk="$("$shim/xcrun" --sdk iphoneos --show-sdk-path)"
  swiftlib="$XCODE_DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/lib/swift/iphoneos"
  clang="$XCODE_DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin/clang++"
  lib="src-tauri/target/aarch64-apple-ios/release/libnote_app_lib.a"
  clean="$out/libnote_app_clean.a"

  # swift-rs leaves duplicate object members in the archive; keep one of each.
  python3 - "$lib" "$clean" <<'PY'
import os, sys
src, dst = sys.argv[1], sys.argv[2]
data = open(src, 'rb').read()
assert data[:8] == b'!<arch>\n'
pos, seen, kept = 8, set(), []
while pos + 60 <= len(data):
    hdr = data[pos:pos + 60]
    raw = hdr[0:16].decode('ascii', 'replace')
    size = int(hdr[48:58].decode('ascii', 'replace').strip())
    body = data[pos + 60:pos + 60 + size]
    if raw.startswith('#1/'):
        n = int(raw[3:].strip())
        name = body[:n].rstrip(b'\0').decode('utf-8', 'replace')
        body = body[n:]
    else:
        name = raw.strip().rstrip('/').strip()
    if not name.startswith('__.SYMDEF') and name not in seen:
        seen.add(name)
        kept.append(body)
    pos += 60 + size + (size % 2)
tmp = dst + '.members'
os.makedirs(tmp, exist_ok=True)
for i, body in enumerate(kept):
    open(os.path.join(tmp, 'm%04d.o' % i), 'wb').write(body)
PY
  /usr/bin/ar -q "$clean" "$out"/libnote_app_clean.a.members/m*.o
  /usr/bin/ranlib "$clean"

  "$clang" -arch arm64 -isysroot "$sdk" -miphoneos-version-min=15.0 \
    -fobjc-arc -std=c++14 -I "$gen/Sources/note-app" \
    -c "$gen/Sources/note-app/main.mm" -o "$out/main.o"
  "$clang" -arch arm64 -isysroot "$sdk" -miphoneos-version-min=15.0 -L "$swiftlib" \
    -o "$out/LedgerNotes" "$out/main.o" "$clean" \
    -framework CoreGraphics -framework Metal -framework MetalKit \
    -framework QuartzCore -framework Security -framework UIKit -framework WebKit \
    -lswiftCompatibility51 -lswiftCompatibility56 -lswiftCompatibilityConcurrency \
    -lswiftCompatibilityPacks -lswiftCompatibilityDynamicReplacements -ObjC

  local app
  app="$out/Payload/Ledger Notes.app"
  mkdir -p "$app"
  cp "$out/LedgerNotes" "$app/Ledger Notes"
  cp "$gen"/Assets.xcassets/AppIcon.appiconset/*.png "$app/" 2>/dev/null || true
  python3 - "$gen/note-app_iOS/Info.plist" "$app/Info.plist" <<'PY'
import plistlib, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
for key, value in {
    '$(EXECUTABLE_NAME)': 'Ledger Notes',
    '$(PRODUCT_BUNDLE_IDENTIFIER)': 'com.example.ledgernotes',
    '$(PRODUCT_NAME)': 'Ledger Notes',
    '$(DEVELOPMENT_LANGUAGE)': 'en',
}.items():
    s = s.replace(key, value)
info = plistlib.loads(s.encode())
info.pop('UILaunchStoryboardName', None)  # cannot compile storyboard without iOS runtime
info['CFBundleExecutable'] = 'Ledger Notes'
with open(dst, 'wb') as f:
    plistlib.dump(info, f)
PY
  (cd "$out" && zip -qry Ledger-Notes_0.1.0_unsigned.ipa Payload)
  cp "$out/Ledger-Notes_0.1.0_unsigned.ipa" .releases/
}

case "${1:-}" in
  macos) macos ;;
  windows) windows ;;
  android) android ;;
  ios) ios ;;
  all) macos; windows; android; ios ;;
  *)
    echo "Usage: bash scripts/release.sh <macos|windows|android|ios|all>" >&2
    exit 1
    ;;
esac
