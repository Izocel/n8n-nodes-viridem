#!bin/bash
set -e

export N8N_DEV_RELOAD=true
export N8N_RUNNERS_ENABLED=true

export N8N_LOG_LEVEL=debug
export N8N_LOG_OUTPUT=console,file

n8n start