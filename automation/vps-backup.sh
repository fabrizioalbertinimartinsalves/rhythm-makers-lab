#!/bin/bash

# ==============================================================================
# SCRIPT DE BACKUP AUTOMATIZADO - KINEOS (SUPABASE/POSTGRES)
# ==============================================================================
# Este script realiza um dump completo do banco de dados e gerencia a rotação.
# ==============================================================================

# 1. Carregar variáveis de ambiente
# Tenta carregar do arquivo .env.backup na mesma pasta do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/../.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/../.env" | xargs)
fi

# Se não estiver no .env principal, tenta no arquivo específico de backup
if [ -f "$SCRIPT_DIR/.env.backup" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env.backup" | xargs)
fi

# 2. Configurações
DB_URL="${DATABASE_URL}" # Deve ser a Connection String no formato postgres://...
BACKUP_DIR="${BACKUP_PATH:-$SCRIPT_DIR/../backups}"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="db_backup_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/backup_log.txt"

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

echo "-------------------------------------------" >> "$LOG_FILE"
echo "[$TIMESTAMP] Iniciando backup..." >> "$LOG_FILE"

# 3. Validação de Dependências
if ! command -v pg_dump &> /dev/null; then
    echo "[$TIMESTAMP] ERRO: pg_dump não encontrado. Instale o postgresql-client." >> "$LOG_FILE"
    exit 1
fi

if [ -z "$DB_URL" ]; then
    echo "[$TIMESTAMP] ERRO: DATABASE_URL não definida." >> "$LOG_FILE"
    exit 1
fi

# 4. Execução do Backup
echo "[$TIMESTAMP] Gerando dump para $FILENAME.gz..." >> "$LOG_FILE"

# Nota: Usamos compressão via gzip para economizar espaço
pg_dump "$DB_URL" --schema=public --no-owner --no-privileges | gzip > "$BACKUP_DIR/$FILENAME.gz"

if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] ✅ Backup concluído: $FILENAME.gz" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] ❌ ERRO: Falha ao gerar dump." >> "$LOG_FILE"
    exit 1
fi

# 5. Rotação (Limpeza de backups antigos)
echo "[$TIMESTAMP] Limpando backups com mais de $RETENTION_DAYS dias..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "[$TIMESTAMP] Fim do processo." >> "$LOG_FILE"
