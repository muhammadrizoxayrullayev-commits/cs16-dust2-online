#!/bin/bash
# 24/7 Daemon Runner for Counter-Strike 1.6 Server

echo "=== Counter-Strike 1.6 Server 24/7 Daemon Starter ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="$SCRIPT_DIR/server_24_7.log"
PID_FILE="$SCRIPT_DIR/server.pid"

# Stop existing process if running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Stopping existing server PID $OLD_PID..."
        kill "$OLD_PID" 2>/dev/null
        sleep 1
    fi
    rm -f "$PID_FILE"
fi

echo "Starting server in 24/7 background mode..."
nohup bash -c "
while true; do
    echo \"[\$(date)] Starting node server.js...\" >> \"$LOG_FILE\"
    export PATH=\"$HOME/.local/bin:\$PATH\"
    node server.js >> \"$LOG_FILE\" 2>&1
    EXIT_CODE=\$?
    echo \"[\$(date)] Server crashed or stopped with code \$EXIT_CODE. Auto-restarting in 2s...\" >> \"$LOG_FILE\"
    sleep 2
done
" > /dev/null 2>&1 &

DAEMON_PID=$!
echo "$DAEMON_PID" > "$PID_FILE"

sleep 1
echo "Server is running 24/7! (PID: $DAEMON_PID)"
echo "Logs: tail -f $LOG_FILE"
echo "Game URL: http://localhost:3000"
