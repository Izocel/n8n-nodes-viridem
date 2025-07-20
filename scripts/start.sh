#!bin/bash
set -e

npm run deploy

export N8N_DEV_RELOAD=true
export N8N_RUNNERS_ENABLED=true

export N8N_LOG_LEVEL=debug
export N8N_LOG_OUTPUT=console,file

n8n start