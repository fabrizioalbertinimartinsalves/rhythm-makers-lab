#!/bin/bash

COMPOSE_FILE="/root/supabase/docker/docker-compose.yml"

# Backup de segurança
cp $COMPOSE_FILE "${COMPOSE_FILE}.bak"

# 1. Inserir volume se não existir
if ! grep -q "/etc/google-key.json" "$COMPOSE_FILE"; then
    echo "Injetando Volume..."
    sed -i '/functions:/!b;n;a\      - ./volumes/functions/google-key.json:/etc/google-key.json:ro' "$COMPOSE_FILE"
fi

# 2. Inserir variáveis de ambiente se não existirem
if ! grep -q "GOOGLE_SERVICE_ACCOUNT_JSON:" "$COMPOSE_FILE"; then
    echo "Injetando Variáveis..."
    sed -i '/functions:/,/environment:/ { /environment:/ a\      GOOGLE_SERVICE_ACCOUNT_JSON: ${GOOGLE_SERVICE_ACCOUNT_JSON}\n      DATABASE_URL: ${DATABASE_URL}' "$COMPOSE_FILE"
fi

# 3. Reiniciar containers
echo "Reiniciando containers..."
cd /root/supabase/docker && docker compose up -d --force-recreate functions

echo "SUCESSO: Configurações aplicadas!"
