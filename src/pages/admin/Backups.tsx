/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Download, FileJson, FileSpreadsheet, Database, History,
  Shield, CheckCircle2, Loader2, AlertTriangle, ArrowDownToLine,
  HardDrive, Terminal, Info, RefreshCw,
} from "lucide-react";

const VERSION_HISTORY = [
  { version: "1.8.2", date: "2026-04-11", status: "atual",    notes: "Blindagem de build (ESLint), Figurinos v2, Dashboard de movimentações." },
  { version: "1.6.0", date: "2026-03-24", status: "anterior", notes: "Migração completa para Supabase finalizada." },
  { version: "1.5.0", date: "2026-03-16", status: "anterior", notes: "Versão Firebase estável." },
];

const ALL_TABLES = [
  "studios", "profiles", "studio_members", "saas_plans", "saas_subscriptions",
  "students", "modalities", "classes", "plans", "billing_configs",
  "enrollments", "invoices", "contracts", "pre_matriculas",
  "costumes", "costume_stock", "costume_movements",
  "festivals", "festival_enrollments", "festival_payments",
  "partners", "products", "orders", "order_items",
];

function downloadFile(content: string | Blob, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function jsonToCsv(data: Record<string, any>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export default function Backups() {
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingDump, setExportingDump] = useState(false);
  const [dumpProgress, setDumpProgress] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");

  const exportTable = async (table: string, fmt: "json" | "csv") => {
    setExportingTable(table);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      const timestamp = new Date().toISOString().slice(0, 10);
      if (fmt === "json") {
        downloadFile(JSON.stringify(data, null, 2), `${table}_${timestamp}.json`, "application/json");
      } else {
        downloadFile(jsonToCsv(data), `${table}_${timestamp}.csv`, "text/csv");
      }
      toast.success(`Tabela "${table}" exportada.`);
    } catch (err: any) {
      toast.error(`Erro ao exportar "${table}": ${err.message}`);
    } finally {
      setExportingTable(null);
    }
  };

  const exportAll = async () => {
    setExportingAll(true);
    try {
      const allData: Record<string, any[]> = {};
      for (const table of ALL_TABLES) {
        try {
          const { data, error } = await supabase.from(table).select("*");
          if (error) throw error;
          allData[table] = data || [];
        } catch {
          allData[table] = [];
        }
      }
      const timestamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadFile(JSON.stringify(allData, null, 2), `backup_kineos_${timestamp}.json`, "application/json");
      } else {
        let combined = "";
        for (const [table, rows] of Object.entries(allData)) {
          combined += `\n=== ${table.toUpperCase()} ===\n`;
          combined += rows.length ? jsonToCsv(rows) : "(vazio)";
          combined += "\n";
        }
        downloadFile(combined, `backup_kineos_${timestamp}.csv`, "text/csv");
      }
      toast.success("Backup completo exportado!");
    } catch (err: any) {
      toast.error(`Erro no backup: ${err.message}`);
    } finally {
      setExportingAll(false);
    }
  };

  const runFullDump = async () => {
    setExportingDump(true);
    setDumpProgress("Conectando à Edge Function...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      setDumpProgress("Executando pg_dump no servidor (pode levar 15–60 segundos)...");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-backup`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      setDumpProgress("Preparando download...");
      const blob = await response.blob();
      const sizeKB = Math.round(blob.size / 1024);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
      downloadFile(blob, `kineos_dump_${timestamp}.sql`, "application/sql");
      toast.success(`✅ Dump completo baixado! Tamanho: ${sizeKB} KB`);
      setDumpProgress("");
    } catch (err: any) {
      toast.error("Falha no dump: " + err.message);
      setDumpProgress("");
    } finally {
      setExportingDump(false);
    }
  };

  const downloadBashScript = () => {
    const script = `#!/bin/bash
# ==============================================================================
# Kineos — Full PostgreSQL Backup Script
# Uso: bash kineos_backup.sh
# Pré-requisito: pg_dump instalado (sudo apt install postgresql-client)
# ==============================================================================
set -e

echo "╔══════════════════════════════════════╗"
echo "║  KINEOS — Backup Completo PostgreSQL  ║"
echo "╚══════════════════════════════════════╝"
echo ""

read -p "🔗 Postgres URI (ex: postgresql://postgres:senha@host:5432/postgres): " DB_URL

if [ -z "$DB_URL" ]; then
  echo "❌ URL não fornecida. Cancelando."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="kineos_backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo ""
echo "[1/3] 📐 Exportando Schema (DDL)..."
pg_dump "$DB_URL" --schema-only --clean --if-exists --no-owner --no-acl --schema=public -f "$BACKUP_DIR/01_schema.sql"
echo "    ✅ $BACKUP_DIR/01_schema.sql"

echo ""
echo "[2/3] 📦 Exportando Dados (INSERT statements)..."
pg_dump "$DB_URL" --data-only --schema=public --no-owner -f "$BACKUP_DIR/02_data.sql"
echo "    ✅ $BACKUP_DIR/02_data.sql"

echo ""
echo "[3/3] 🗜️  Gerando dump binário (pg_restore)..."
pg_dump "$DB_URL" --no-owner --no-acl -Fc -f "$BACKUP_DIR/03_full.dump"
echo "    ✅ $BACKUP_DIR/03_full.dump"

echo ""
echo "════════════════════════════════════════"
echo "✅ Backup em: $BACKUP_DIR/"
echo ""
echo "RESTAURAR EM NOVO SUPABASE:"
echo "  pg_restore --clean --if-exists -d \\$NOVO_DB_URL \\"$BACKUP_DIR/03_full.dump\\""
echo "════════════════════════════════════════"
`;
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(script, `kineos_backup_${ts}.sh`, "application/x-sh");
    toast.success("Script baixado! Execute com: bash kineos_backup.sh");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">Backup & Versões</h1>
            <p className="text-sm text-muted-foreground">Exportação e restauração de dados do Supabase</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-200">Supabase Ready</Badge>
        </div>

        <Tabs defaultValue="dump" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dump" className="gap-2"><HardDrive className="h-4 w-4 text-violet-500" /> Dump PostgreSQL</TabsTrigger>
            <TabsTrigger value="backup" className="gap-2"><Database className="h-4 w-4" /> Tabelas (JSON/CSV)</TabsTrigger>
            <TabsTrigger value="versions" className="gap-2"><History className="h-4 w-4" /> Versões</TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2"><Terminal className="h-4 w-4 text-rose-500" /> Script VPS</TabsTrigger>
          </TabsList>

          {/* ABA: DUMP POSTGRESQL */}
          <TabsContent value="dump" className="space-y-4">
            <Card className="border-violet-100 bg-gradient-to-br from-violet-50/40 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-700">
                  <HardDrive className="h-5 w-5" /> Dump Completo PostgreSQL
                </CardTitle>
                <CardDescription>
                  Gera um arquivo <code className="bg-violet-100 px-1 rounded text-violet-700">.sql</code> completo com schema + dados.
                  Pronto para restaurar em qualquer instância Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: "1", title: "Baixar o Dump", desc: "Clique abaixo. A Edge Function executa pg_dump no servidor e retorna o .sql direto para o seu navegador." },
                    { step: "2", title: "Criar Novo Projeto", desc: "Crie um projeto Supabase (cloud ou self-hosted). Obtenha a Connection String do novo banco." },
                    { step: "3", title: "Restaurar", desc: "Cole o .sql no SQL Editor do novo projeto, ou execute via psql: psql $NOVO_DB < dump.sql" },
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-xl border bg-white flex gap-3 shadow-sm">
                      <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 font-black text-sm flex items-center justify-center shrink-0">{s.step}</div>
                      <div>
                        <p className="font-bold text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-start gap-3">
                  <Button
                    onClick={runFullDump}
                    disabled={exportingDump}
                    size="lg"
                    className="bg-violet-600 hover:bg-violet-700 text-white h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-violet-200 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {exportingDump
                      ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Gerando Dump...</>
                      : <><Download className="h-5 w-5 mr-2" /> Baixar Dump Completo (.sql)</>
                    }
                  </Button>
                  {dumpProgress && (
                    <div className="flex items-center gap-2 text-sm text-violet-600 animate-pulse">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {dumpProgress}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                  <Info className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Requisito: Edge Function implantada</p>
                    <p className="text-xs">
                      A função <code className="bg-amber-100 px-1 rounded">database-backup</code> precisa estar implantada no seu Supabase.
                      O arquivo está em <code className="bg-amber-100 px-1 rounded">supabase/functions/database-backup/index.ts</code>.
                      Se preferir backup manual, use a aba <strong>"Script VPS"</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl text-sm font-mono text-slate-300 space-y-1">
                  <p className="text-slate-500 text-xs mb-2"># Restaurar em novo Supabase via psql</p>
                  <p><span className="text-emerald-400">psql</span> <span className="text-sky-300">"postgresql://postgres:SENHA@db.PROJETO.supabase.co:5432/postgres"</span> \</p>
                  <p className="pl-4"><span className="text-slate-400">-f</span> kineos_dump_TIMESTAMP.sql</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: TABELAS JSON/CSV */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Exportação por Tabela</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportAll} disabled={exportingAll} className="gap-2 bg-teal-600">
                  {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {exportingAll ? "Exportando..." : "Baixar Tudo"}
                </Button>
              </CardContent>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ALL_TABLES.map(table => (
                <div key={table} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                  <span className="text-xs font-mono font-medium">{table}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportTable(table, "json")} disabled={exportingTable === table}>
                      <FileJson className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportTable(table, "csv")} disabled={exportingTable === table}>
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ABA: VERSÕES */}
          <TabsContent value="versions">
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de Versões</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {VERSION_HISTORY.map(v => (
                  <div key={v.version} className="p-4 border rounded-lg flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">v{v.version}</span>
                        {v.status === 'atual' && <Badge>Atual</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{v.notes}</p>
                      <p className="text-[10px] text-muted-foreground">{v.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA: SCRIPT VPS */}
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-600">
                  <Shield className="h-5 w-5" /> Backup Manual via VPS (Linux)
                </CardTitle>
                <CardDescription>
                  Baixe o script shell para executar diretamente na sua VPS com psql instalado.
                  Alternativa quando a Edge Function não está disponível.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-900 rounded-xl overflow-x-auto text-sm font-mono text-slate-300 space-y-1">
                  <p className="text-slate-500 text-xs"># Pré-requisito: pg_dump instalado</p>
                  <p><span className="text-sky-400">sudo apt install</span> postgresql-client <span className="text-slate-500"># Ubuntu/Debian</span></p>
                  <p><span className="text-emerald-400">bash</span> kineos_backup.sh</p>
                </div>
                <Button onClick={downloadBashScript} className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" /> Baixar Script (.sh)
                </Button>
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <p>
                    O dump binário <code>-Fc</code> é o mais completo. Para restaurar em outro Supabase:
                    <br /><code>pg_restore --clean -d $NOVO_DB kineos_backup/03_full.dump</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
