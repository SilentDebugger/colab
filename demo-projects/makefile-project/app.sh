#!/bin/bash
echo "🔧 Makefile demo app started"
echo "PID: $$"

counter=0
while true; do
  counter=$((counter + 1))
  echo "[$(date -Iseconds)] Tick $counter"
  sleep 3
done
