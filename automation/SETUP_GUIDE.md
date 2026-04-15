# Guia de Configuração: Backup Diário VPS

Este guia ensina como ativar a automação de backups de 24 horas para o seu sistema.

## 1. Instalar o PostgreSQL Client
Garanta que sua VPS consiga rodar o comando `pg_dump`.

**No Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-client -y
```

## 2. Configurar o Script
1. No diretório `automation/`, crie o arquivo `.env.backup` a partir do exemplo:
   ```bash
   cp .env.backup.example .env.backup
   ```
2. Edite o `.env.backup` e coloque sua **Connection URI** do Supabase.
3. Dê permissão de execução ao script:
   ```bash
   chmod +x vps-backup.sh
   ```

## 3. Agendar com o Cron (A cada 24h)
O `cron` executará o script automaticamente.

1. Abra o editor do crontab:
   ```bash
   crontab -e
   ```
2. Adicione a seguinte linha ao final do arquivo (executa todo dia às 03:00 da manhã):
   ```bash
   0 3 * * * /caminho/para/seu/projeto/automation/vps-backup.sh
   ```
   *Nota: Substitua `/caminho/para/seu/projeto/` pelo caminho absoluto da pasta no seu servidor.*

## 4. Testar Manualmente
Antes de esperar o horário agendado, teste se o script está funcionando:
```bash
./vps-backup.sh
```
Verifique se uma pasta `backups/` foi criada e se há um arquivo `.sql.gz` dentro dela. Confira também o arquivo `backup_log.txt` para logs detalhados.
