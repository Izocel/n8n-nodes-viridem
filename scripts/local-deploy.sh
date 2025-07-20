#!bin/bash
set -e

npm run build
npm link

cd  ~/.n8n/nodes
rm -rf node_modules/n8n-nodes-viridem
npm link n8n-nodes-viridem