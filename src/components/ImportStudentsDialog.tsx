import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { normalizeCpf, cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface ParsedRow {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  observacoes_medicas: string;
  responsavel_legal_nome: string;
  responsavel_legal_telefone: string;
  responsavel_legal_parentesco: string;
  responsavel_financeiro_nome: string;
  responsavel_financeiro_cpf: string;
  responsavel_financeiro_email: string;
  responsavel_financeiro_telefone: string;
  errors: string[];
  status: "valid" | "error" | "duplicate";
}

const EXPECTED_HEADERS = [
  "nome", "cpf", "email", "telefone", "data_nascimento", "observacoes_medicas",
  "responsavel_legal_nome", "responsavel_legal_telefone", "responsavel_legal_parentesco",
  "responsavel_financeiro_nome", "responsavel_financeiro_cpf",
  "responsavel_financeiro_email", "responsavel_financeiro_telefone",
];

const HEADER_LABELS: Record<string, string> = {
  nome: "Nome Completo",
  cpf: "CPF",
  email: "E-mail",
  telefone: "Telefone",
  data_nascimento: "Data Nasc. (AAAA-MM-DD)",
  observacoes_medicas: "Observações Médicas",
  responsavel_legal_nome: "Resp. Legal Nome",
  responsavel_legal_telefone: "Resp. Legal Tel.",
  responsavel_legal_parentesco: "Resp. Legal Parentesco",
  responsavel_financeiro_nome: "Resp. Finan. Nome",
  responsavel_financeiro_cpf: "Resp. Finan. CPF",
  responsavel_financeiro_email: "Resp. Finan. E-mail",
  responsavel_financeiro_telefone: "Resp. Finan. Tel.",
};

/** Robust CSV Parser supporting quotes and multiple delimiters */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  
  // Detect delimiter
  const firstLine = text.split("\n")[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentRow.push(currentField.trim());
        if (currentRow.some(c => c.length > 0)) lines.push(currentRow);
        currentRow = [];
        currentField = "";
        if (char === "\r") i++;
      } else {
        currentField += char;
      }
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    lines.push(currentRow);
  }

  return lines;
}

function validateRow(row: Record<string, string>, existingCpfs: Set<string>): ParsedRow {
  const errors: string[] = [];
  const nome = (row.nome || "").trim();
  if (!nome) errors.push("Nome é obrigatório");

  const rawCpf = (row.cpf || "").trim();
  const cpf = rawCpf ? (normalizeCpf(rawCpf) || "") : "";
  if (cpf && cpf.length !== 11) errors.push("CPF inválido (deve ter 11 dígitos)");

  const dataNasc = (row.data_nascimento || "").trim();
  if (dataNasc && !/^\d{4}-\d{2}-\d{2}$/.test(dataNasc)) {
    errors.push("Data nasc. deve ser AAAA-MM-DD");
  }

  let status: "valid" | "error" | "duplicate" = errors.length > 0 ? "error" : "valid";
  if (status === "valid" && cpf && existingCpfs.has(cpf)) {
    status = "duplicate";
    errors.push("CPF já existe no sistema");
  }

  return {
    nome,
    cpf,
    email: (row.email || "").trim(),
    telefone: (row.telefone || "").replace(/\D/g, ""),
    data_nascimento: dataNasc,
    observacoes_medicas: (row.observacoes_medicas || "").trim(),
    responsavel_legal_nome: (row.responsavel_legal_nome || "").trim(),
    responsavel_legal_telefone: (row.responsavel_legal_telefone || "").replace(/\D/g, ""),
    responsavel_legal_parentesco: (row.responsavel_legal_parentesco || "").trim(),
    responsavel_financeiro_nome: (row.responsavel_financeiro_nome || "").trim(),
    responsavel_financeiro_cpf: (row.responsavel_financeiro_cpf || "").replace(/\D/g, ""),
    responsavel_financeiro_email: (row.responsavel_financeiro_email || "").trim(),
    responsavel_financeiro_telefone: (row.responsavel_financeiro_telefone || "").replace(/\D/g, ""),
    errors,
    status,
  };
}

function generateTemplate(): string {
  const headers = EXPECTED_HEADERS.map((h) => HEADER_LABELS[h] || h);
  const example = [
    "Maria Silva", "123.456.789-00", "maria@email.com", "(11) 99999-0000", "2010-05-15", "Alérgica a amendoim",
    "José Silva", "(11) 98888-0000", "Pai",
    "José Silva", "123.456.789-00", "jose@email.com", "(11) 98888-0000",
  ];
  return headers.join(";") + "\n" + example.join(";");
}

interface ImportStudentsDialogProps {
  onSuccess: () => void;
}

export default function ImportStudentsDialog({ onSuccess }: ImportStudentsDialogProps) {
  const { studioId } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, skipped: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setProgress(0);
    setIsReading(false);
    setImportResult({ success: 0, skipped: 0, errors: 0 });
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplate();
    const BOM = "\uFEFF"; // Byte Order Mark for Excel compatibility
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_alunos_kineos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReading(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        toast.error("Arquivo inválido: Deve conter cabeçalho e pelo menos uma linha de dados.");
        return;
      }

      // Normalize headers (remove accents, to lower, replace spaces)
      const rawHeaders = parsed[0].map((h) =>
        h.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")
      );

      const headerMap: Record<number, string> = {};
      rawHeaders.forEach((h, i) => {
        const match = EXPECTED_HEADERS.find((eh) => {
          const norm = eh.toLowerCase();
          return h === norm || h.includes(norm) || norm.includes(h);
        });
        if (match) headerMap[i] = match;
      });

      // Fallback: check if the labels match instead of keys
      if (Object.keys(headerMap).length < 2) {
        parsed[0].forEach((h, i) => {
          const match = Object.entries(HEADER_LABELS).find(([key, label]) => 
            h.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(h.toLowerCase())
          );
          if (match) headerMap[i] = match[0];
        });
      }

      if (!studioId) return;
      
      const { data: existingStudents } = await supabase
        .from("students")
        .select("cpf")
        .eq("studio_id", studioId);
      
      const existingCpfs = new Set(
        (existingStudents || []).map((s) => s.cpf).filter(Boolean) as string[]
      );

      const dataRows = parsed.slice(1).map((cols) => {
        const rowObj: Record<string, string> = {};
        cols.forEach((val, i) => {
          if (headerMap[i]) rowObj[headerMap[i]] = val;
        });
        return validateRow(rowObj, existingCpfs);
      });

      setRows(dataRows);
      setStep("preview");
    } catch (err) {
      toast.error("Erro ao ler o arquivo. Certifique-se que é um CSV válido.");
    } finally {
      setIsReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const validRows = rows.filter((r) => r.status === "valid");
  const errorRowsCount = rows.filter((r) => r.status === "error").length;
  const duplicateRowsCount = rows.filter((r) => r.status === "duplicate").length;

  const handleImport = async () => {
    setStep("importing");
    if (!studioId) return;
    
    let successCount = 0;
    let errorCount = 0;
    const toImport = validRows;
    const batchSize = 25;

    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize);
      const insertData = batch.map(r => {
        const { errors: _, status: __, ...fields } = r;
        const cleaned: Record<string, any> = {
          studio_id: studioId,
          created_at: new Date().toISOString(),
          status: "ativo"
        };
        for (const [k, v] of Object.entries(fields)) {
          cleaned[k] = v === "" ? null : v;
        }
        return cleaned;
      });

      const { error } = await supabase.from("students").insert(insertData);
      
      if (error) {
        errorCount += batch.length;
        console.error("Import error details:", error);
      } else {
        successCount += batch.length;
      }
      
      setProgress(Math.round((Math.min(i + batchSize, toImport.length) / toImport.length) * 100));
    }

    setImportResult({ 
      success: successCount, 
      skipped: duplicateRowsCount, 
      errors: errorCount + errorRowsCount 
    });
    setStep("done");

    if (successCount > 0) {
      onSuccess();
      toast.success(`${successCount} alunos importados com sucesso!`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50 transition-all">
          <Upload className="h-3.5 w-3.5 text-primary" /> Importar Planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 border-none shadow-2xl rounded-2xl overflow-hidden flex flex-col">
        <DialogHeader className="bg-slate-900 p-6 text-white bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 flex-none">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Importação de Base
              </DialogTitle>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Carregamento Massivo de Alunos Cockpit v7.5.2</p>
            </div>
            {step === "preview" && (
               <div className="flex gap-1.5 h-6">
                 <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] font-bold uppercase">{validRows.length} Válidos</Badge>
                 {(errorRowsCount > 0 || duplicateRowsCount > 0) && (
                   <Badge className="bg-amber-500/20 text-amber-400 border-none text-[9px] font-bold uppercase">{errorRowsCount + duplicateRowsCount} Pendências</Badge>
                 )}
               </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 bg-white min-h-[400px]">
          {step === "upload" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Prepare seus dados</h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      Utilize nosso modelo padronizado para garantir que todos os dados (aluno, responsáveis e observações) sejam importados corretamente.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                      <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary flex-none">
                        <Download className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">1. Baixe o Modelo</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Arquivo CSV compatível com Excel e Google Sheets.</p>
                        <Button variant="link" onClick={handleDownloadTemplate} className="h-auto p-0 text-[10px] font-bold text-primary uppercase mt-1">Clique para baixar</Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                      <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary flex-none">
                        <Info className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">2. Preencha e Salve</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">O campo "Nome" é obrigatório. Evite caracteres especiais em CPFs.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className={cn(
                    "border-2 border-dashed rounded-3xl p-10 text-center transition-all group flex flex-col items-center justify-center min-h-[300px]",
                    isReading ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50 hover:border-primary/40 hover:bg-white"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); /* Handle drop logic here if needed */ }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-slate-200">
                    {isReading ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Upload className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors" />}
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 uppercase tracking-widest mb-1">Arraste seu arquivo</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-6">ou clique para selecionar do computador</p>
                  
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                  <Button onClick={() => fileRef.current?.click()} className="h-11 px-8 rounded-xl font-bold uppercase tracking-widest bg-slate-950 hover:bg-primary shadow-lg shadow-slate-200 transition-all">
                    Selecionar CSV
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 space-y-4">
                 <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-[10px] font-bold uppercase text-slate-900 tracking-wider">Regras de Validação</span>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { l: "Nomes", v: "Obrigatório" },
                      { l: "CPFs", v: "11 dígitos" },
                      { l: "Datas", v: "AAAA-MM-DD" },
                      { l: "Status", v: "Ativo p/ todos" }
                    ].map((idx, k) => (
                      <div key={k} className="space-y-1 h-12 border-l-2 border-slate-200 pl-3">
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{idx.l}</p>
                         <p className="text-[10px] font-bold text-slate-900">{idx.v}</p>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Prévia dos Dados</h3>
                    <p className="text-xs text-slate-400 font-medium">Revise as informações antes de confirmar a importação.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={reset} className="h-10 rounded-xl text-xs font-bold uppercase tracking-tight bg-white">Limpar e Voltar</Button>
                    <Button onClick={handleImport} disabled={validRows.length === 0} className="h-10 rounded-xl px-8 text-xs font-bold uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 bg-emerald-500 hover:bg-emerald-600 border-none transition-all group">
                      Confirmar {validRows.length} Alunos <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
               </div>

               <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-slate-50/50">
                  <div className="max-h-[350px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-100/50 sticky top-0 z-10">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="text-[9px] font-bold uppercase text-slate-400 tracking-widest h-10 w-12">#</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase text-slate-400 tracking-widest h-10 w-24">Status</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase text-slate-400 tracking-widest h-10">Nome Completo</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase text-slate-400 tracking-widest h-10">CPF</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase text-slate-400 tracking-widest h-10">Pendências</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, i) => (
                          <TableRow key={i} className={cn("border-slate-50 transition-colors group", r.status === "error" ? "bg-red-50/50 hover:bg-red-50" : r.status === "duplicate" ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-white")}>
                            <TableCell className="text-[9px] font-bold text-slate-300 font-mono tracking-tighter">{String(i + 1).padStart(3, '0')}</TableCell>
                            <TableCell>
                              {r.status === "valid" && <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-bold uppercase tracking-tighter shadow-none">Pronto</Badge>}
                              {r.status === "error" && <Badge className="bg-red-100 text-red-600 border-none text-[8px] font-bold uppercase tracking-tighter shadow-none">Erro Crítico</Badge>}
                              {r.status === "duplicate" && <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-bold uppercase tracking-tighter shadow-none">Duplicado</Badge>}
                            </TableCell>
                            <TableCell className={cn("text-xs font-bold leading-tight max-w-[200px] truncate", r.status === "error" ? "text-red-900" : "text-slate-900")}>
                              {r.nome || "Não informado"}
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-slate-400 tracking-tighter font-mono">
                              {r.cpf || "—"}
                            </TableCell>
                            <TableCell className="text-[10px] font-medium text-slate-500 py-3 leading-tight italic overflow-hidden">
                              {r.errors.length > 0 ? r.errors.join(", ") : <span className="text-emerald-500 opacity-40">— Nenhum —</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
               </div>

               {errorRowsCount > 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                   <AlertTriangle className="h-5 w-5 text-red-500 flex-none" />
                   <div>
                      <p className="text-xs font-bold text-red-900">Atenção ao Processar</p>
                      <p className="text-[10px] text-red-700 font-medium leading-relaxed">As {errorRowsCount} linhas marcadas com Erro Crítico serão desconsideradas. Recomendamos corrigir o arquivo e tentar novamente se esses dados forem essenciais.</p>
                   </div>
                </div>
               )}
            </div>
          )}

          {step === "importing" && (
            <div className="space-y-8 py-12 text-center flex flex-col items-center justify-center animate-pulse">
               <div className="relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                  <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Upload className="h-10 w-10 text-primary" />
                  </div>
               </div>
               <div className="space-y-3 w-full max-w-sm">
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Sincronizando Base</h3>
                  <div className="space-y-1">
                    <Progress value={progress} className="h-1.5 bg-slate-100 rounded-full overflow-hidden" />
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span>Iniciando</span>
                      <span className="text-primary">{progress}%</span>
                      <span>Concluído</span>
                    </div>
                  </div>
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Não feche esta janela durante o processo...</p>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-10 py-12 animate-in fade-in zoom-in-95">
               <div className="text-center space-y-4">
                  <div className="h-20 w-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20 translate-y-[-10px]">
                     <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Importação Concluída</h3>
                    <p className="text-xs text-slate-400 font-medium">O processamento da base foi finalizado com sucesso.</p>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl text-center shadow-sm">
                     <p className="text-4xl font-black text-emerald-500 tracking-tighter leading-none mb-2">{importResult.success}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Importados</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl text-center shadow-sm">
                     <p className="text-4xl font-black text-slate-400 tracking-tighter leading-none mb-2">{importResult.skipped}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Duplicados</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl text-center shadow-sm">
                     <p className="text-4xl font-black text-red-500 tracking-tighter leading-none mb-2">{importResult.errors}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Falhas</p>
                  </div>
               </div>

               <div className="flex justify-center pt-4">
                  <Button onClick={() => { setOpen(false); reset(); }} className="h-12 px-12 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-slate-200">
                    Retornar aos Alunos
                  </Button>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
