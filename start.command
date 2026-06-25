#!/bin/bash
# Akquise-Cockpit Starter – einfach doppelklicken.
# Holt den neuesten Stand, öffnet den Browser und startet den Server.

cd "$(dirname "$0")" || exit 1

echo "🔄  Hole neuesten Stand..."
git fetch origin && git reset --hard origin/claude/lead-dashboard-crm-n2bgnb

echo "🌐  Öffne den Browser in 2 Sekunden..."
( sleep 2 && open "http://localhost:8000" ) &

echo ""
echo "🚀  Server läuft! Dieses Fenster offen lassen."
echo "    Zum Stoppen: Ctrl + C  oder Fenster schließen."
echo ""
caffeinate -dims python3 -m http.server 8000
