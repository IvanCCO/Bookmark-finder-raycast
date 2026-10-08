#!/usr/bin/env bash
# Sobe o servidor sozinho no login (launchd). Uso: ./scripts/install-launchd.sh
# Para remover: ./scripts/uninstall-launchd.sh
set -euo pipefail

LABEL="com.bookmark-finder"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

[ -f "$PROJECT/.env" ] || { echo "Crie o .env primeiro (cp .env.example .env) e preencha a chave."; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT/data"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>--env-file=.env</string>
    <string>server/index.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$PROJECT</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$PROJECT/data/server.log</string>
  <key>StandardErrorPath</key><string>$PROJECT/data/server.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Servidor instalado e rodando. Log: $PROJECT/data/server.log"
