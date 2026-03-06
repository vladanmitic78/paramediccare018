#!/bin/bash
cd /var/www/paramedic-care018/backend
source venv/bin/activate
exec uvicorn server:app --host 0.0.0.0 --port 8001
