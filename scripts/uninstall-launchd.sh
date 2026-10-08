#!/usr/bin/env bash
set -euo pipefail
LABEL="com.bookmark-finder"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "Servidor removido do launchd."
