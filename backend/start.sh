#!/bin/bash
# Startup script for backend

echo "Initializing database..."
python3 init_db.py

echo "Starting backend server..."
exec uvicorn server:app --host 0.0.0.0 --port 8001
