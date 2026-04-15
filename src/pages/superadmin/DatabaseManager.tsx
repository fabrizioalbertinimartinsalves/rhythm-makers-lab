/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Database, 
  Download, 
  Upload, 
  Cloud, 
  HardDrive, 
  FileJson, 
  FileSpreadsheet, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Trash2,
  History,
  ShieldCheck,
  Globe,
  Settings2,
  ExternalLink,
  Save,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TABLES_CONFIG = [
  { 
    name: "studios", 
    label: "Estúdios (Tenants)", 
    description: "Dados principais das organizações vinculadas.",
    fields: ["id", "nome", "slug", "email_contato", "telefone", "logo_url", "ativa", "status_assinatura", "saas_plan_id", "limite_alunos", "limite_instrutores", "limite_turmas"] 
  },
  { 
    name: "profiles", 
    label: "Usuários & Perfis", 
    description: "Todos os usuários cadastrados no sistema.",
    fields: ["id", "email", "nome", "telefone", "avatar_url", "status", "ativo"]
  },
  { 
    name: "saas_plans", 
    label: "Planos SaaS", 
    description: "Configurações de planos e precificação.",
    fields: ["id", "nome", "descricao", "valor_mensal", "valor_anual", "limite_alunos", "limite_instrutores", "limite_turmas", "ativa"]
  },
  { 
    name: "login_page_config", 
    label: "Branding de Login", 
    description: "Configurações dinâmicas da tela de login.",
    fields: ["config_key", "config_value", "config_type", "config_group", "description"]
  },
  { 
    name: "integrations", 
    label: "Integrações", 
    description: "Configurações de gateways e APIs externas.",
    fields: ["studio_id", "category", "provider", "display_name", "ativa"]
  },
];

export default function DatabaseManager() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("backup");
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [googleConfig, setGoogleConfig] = useState({
    clientId: localStorage.getItem("google_drive_client_id") || "",
    apiKey: localStorage.getItem("google_drive_api_key") || ""
  });
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);

  // Load Google Scripts
  useEffect(() => {
    const script1 = document.createElement("script");
    script1.src = "https://apis.google.com/js/api.js";
    script1.onload = () => setGapiLoaded(true);
    document.body.appendChild(script1);

    const script2 = document.createElement("script");
    script2.src = "https://accounts.google.com/gsi/client";
    script2.onload = () => setGisLoaded(true);
    document.body.appendChild(script2);
  }, []);

  // Initialize GAPI
  useEffect(() => {
    if (gapiLoaded && gisLoaded && googleConfig.clientId) {
      const initializeGapiClient = async () => {
        await (window as any).gapi.load('client', async () => {
          await (window as any).gapi.client.init({
            apiKey: googleConfig.apiKey,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
          });
        });
      };
      initializeGapiClient();

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleConfig.clientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: "", // defined later in handleSync
      });
      setTokenClient(client);
    }
  }, [gapiLoaded, gisLoaded, googleConfig]);

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const fetchCheckpoints = async () => {
    const { data } = await supabase
      .from("system_checkpoints")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setCheckpoints(data);
  };

  const handleCreateCloudCheckpoint = async () => {
    setIsCreatingCheckpoint(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloud-checkpoint", {
        body: { type: "full" }
      });

      if (error) throw error;
      toast.success("Checkpoint em nuvem iniciado! Verifique o status na lista abaixo.");
      fetchCheckpoints();
    } catch (err: any) {
      toast.error("Erro ao iniciar checkpoint: " + err.message);
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  const saveGoogleConfig = () => {
    localStorage.setItem("google_drive_client_id", googleConfig.clientId);
    localStorage.setItem("google_drive_api_key", googleConfig.apiKey);
    setShowGoogleConfig(false);
    toast.success("Credenciais do Google salvas localmente!");
  };

  const handleDownloadTemplate = (tableName: string) => {
    const config = TABLES_CONFIG.find(t => t.name === tableName);
    if (!config) return;

    const headers = config.fields.join(",");
    const blob = new Blob([headers], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo_${tableName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Modelo de ${tableName} baixado!`);
  };

  const handleExport = async (tableName: string, format: "json" | "csv") => {
    setLoading(prev => ({ ...prev, [`export-${tableName}-${format}`]: true }));
    try {
      const { data, error } = await supabase.from(tableName).select("*");
      if (error) throw error;

      let blob;
      let filename = `backup_${tableName}_${new Date().toISOString().split('T')[0]}`;

      if (format === "json") {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        filename += ".json";
      } else {
        if (data.length === 0) throw new Error("Tabela vazia.");
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map(item => 
          Object.values(item).map(val => 
            typeof val === 'object' ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${String(val).replace(/"/g, '""')}"`
          ).join(",")
        );
        blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
        filename += ".csv";
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exportação de ${tableName} (${format.toUpperCase()}) concluída!`);
    } catch (err: any) {
      toast.error("Erro ao exportar: " + err.message);
    } finally {
      setLoading(prev => ({ ...prev, [`export-${tableName}-${format}`]: false }));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, tableName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(prev => ({ ...prev, [`import-${tableName}`]: true }));
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let dataToImport = [];

        if (file.name.endsWith(".json")) {
          dataToImport = JSON.parse(content);
        } else if (file.name.endsWith(".csv")) {
          const lines = content.split("\n");
          const headers = lines[0].split(",");
          dataToImport = lines.slice(1).filter(l => l).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const obj: any = {};
            headers.forEach((h, i) => {
              let val = values[i]?.replace(/^"|"$/g, '').replace(/""/g, '"');
              if (val?.startsWith('{') || val?.startsWith('[')) {
                try { val = JSON.parse(val); } catch(e) {}
              }
              obj[h.trim()] = val;
            });
            return obj;
          });
        }

        if (!confirm(`Deseja importar ${dataToImport.length} registros para '${tableName}'?`)) return;

        const { error } = await supabase.from(tableName).upsert(dataToImport);
        if (error) throw error;

        toast.success(`Sucesso: ${dataToImport.length} registros processados.`);
      } catch (err: any) {
        toast.error("Erro: " + err.message);
      } finally {
        setLoading(prev => ({ ...prev, [`import-${tableName}`]: false }));
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleGoogleDriveSync = async () => {
    if (!googleConfig.clientId || !googleConfig.apiKey) {
      setShowGoogleConfig(true);
      toast.error("Configure as credenciais do Google primeiro!");
      return;
    }

    if (!tokenClient) {
      toast.error("Erro ao inicializar Google Client. Tente recarregar.");
      return;
    }

    setLoading(prev => ({ ...prev, 'google-sync': true }));

    try {
      tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) throw resp;

        // Fetch all tables
        toast.loading("Consolidando dados para backup...", { id: "sync" });
        const fullBackup: any = {};
        for(const t of TABLES_CONFIG) {
          const { data } = await supabase.from(t.name).select("*");
          fullBackup[t.name] = data;
        }

        const fileName = `Kineos_Full_Backup_${new Date().toISOString()}.json`;
        const fileContent = JSON.stringify(fullBackup, null, 2);
        
        // Multi-part upload to Google Drive
        const boundary = 'foo_bar_baz';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
          'name': fileName,
          'mimeType': 'application/json'
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            fileContent +
            close_delim;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + resp.access_token,
            'Content-Type': 'multipart/related; boundary=' + boundary,
            'Content-Length': multipartRequestBody.length.toString()
          },
          body: multipartRequestBody
        });

        if (!response.ok) throw new Error("Falha no upload para o Drive");

        toast.dismiss("sync");
        toast.success("Backup enviado para o seu Google Drive com sucesso!", { duration: 5000 });
        setLoading(prev => ({ ...prev, 'google-sync': false }));
      };

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      toast.dismiss("sync");
      toast.error("Erro na sincronização: " + err.message);
      setLoading(prev => ({ ...prev, 'google-sync': false }));
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">SQL Engine v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 flex items-center gap-3 leading-none">
              Command <span className="text-primary tracking-normal">Database</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Exportação, Importação e Backups em nuvem.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" className="h-8 px-4 font-bold uppercase tracking-widest text-[9px] bg-slate-50 border-slate-200 rounded-lg" onClick={() => setShowGoogleConfig(true)}>
               <Settings2 className="h-3.5 w-3.5 mr-2" /> API Google
             </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
            <TabsList className="bg-transparent border-none h-8 gap-1">
              <TabsTrigger value="backup" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2">
                <Download className="h-3 w-3" /> Exportar
              </TabsTrigger>
              <TabsTrigger value="restore" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2">
                <Upload className="h-3 w-3" /> Importar
              </TabsTrigger>
              <TabsTrigger value="cloud" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2">
                <Cloud className="h-3 w-3" /> Drive
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: EXPORT */}
          <TabsContent value="backup" className="space-y-8 animate-in fade-in slide-in-from-top-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {TABLES_CONFIG.map(table => (
                <Card key={table.name} className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100">
                   <CardHeader className="bg-slate-50/50 py-2.5 border-b border-slate-100">
                      <div className="flex justify-between items-start">
                         <div>
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-800">{table.label}</CardTitle>
                            <CardDescription className="text-[8px] uppercase font-mono mt-0.5">Tabela: {table.name}</CardDescription>
                         </div>
                         <Database className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                   </CardHeader>
                   <CardContent className="p-4 space-y-3">
                      <p className="text-[10px] text-slate-500 leading-relaxed h-8 overflow-hidden">{table.description}</p>
                      <div className="flex gap-2 pt-1">
                         <Button variant="outline" size="sm" onClick={() => handleExport(table.name, "json")} disabled={loading[`export-${table.name}-json`]} className="flex-1 h-7 font-bold text-[8px] uppercase border-slate-200 hover:bg-slate-950 hover:text-white transition-all rounded-lg">
                            {loading[`export-${table.name}-json`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileJson className="h-3 w-3 text-orange-500" />} JSON
                         </Button>
                         <Button variant="outline" size="sm" onClick={() => handleExport(table.name, "csv")} disabled={loading[`export-${table.name}-csv`]} className="flex-1 h-7 font-bold text-[8px] uppercase border-slate-200 hover:bg-slate-950 hover:text-white transition-all rounded-lg">
                            {loading[`export-${table.name}-csv`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3 text-green-600" />} CSV
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 overflow-hidden relative border-none">
               <div className="absolute top-0 right-0 p-6 opacity-5"><HardDrive className="h-32 w-32" /></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1.5">
                     <h3 className="text-xl font-bold uppercase tracking-tight">Backup Completo do Sistema</h3>
                     <p className="text-slate-400 text-xs max-w-lg leading-relaxed">Gera uma cópia de segurança total contendo todas as configurações, planos, estúdios e usuários mapeados.</p>
                  </div>
                  <Button className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-[10px] gap-3 shadow-lg shadow-primary/20 transition-transform active:scale-95 rounded-xl" onClick={() => toast.info("Funcionalidade em desenvolvimento...")}>
                     <Download className="h-4 w-4" /> Snapshot Total (.json)
                  </Button>
               </div>
            </Card>
          </TabsContent>

          {/* TAB: RESTORE */}
          <TabsContent value="restore" className="space-y-6 animate-in fade-in slide-in-from-top-4">
             <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 items-center mb-6">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                <div className="space-y-0.5">
                   <h4 className="font-bold text-amber-900 uppercase text-[10px] tracking-tight">Importação de Dados Críticos</h4>
                   <p className="text-[11px] text-amber-700 leading-relaxed font-medium">A importação utiliza lógica 'Upsert'. Dados com o mesmo ID serão sobrescritos. Recomendamos baixar o modelo CSV antes de começar.</p>
                </div>
             </div>

             <div className="grid gap-4">
                {TABLES_CONFIG.map(table => (
                    <div key={table.name} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all group bg-white ring-1 ring-slate-100/50">
                       <div className="flex items-center gap-4 mb-4 md:mb-0">
                          <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all">
                             <Database className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 uppercase tracking-tight text-xs">{table.label}</p>
                             <p className="text-[8px] text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded-md inline-block mt-0.5">tabela: {table.name}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleDownloadTemplate(table.name)} className="h-9 px-4 font-bold text-[9px] uppercase gap-2 bg-slate-50 border-slate-200 hover:bg-primary/5 hover:text-primary transition-all rounded-lg">
                             <FileSpreadsheet className="h-3.5 w-3.5" /> Baixar Modelo CSV
                          </Button>
                          <div className="relative">
                             <input 
                               type="file" 
                               accept=".json,.csv"
                               onChange={(e) => handleImport(e, table.name)}
                               disabled={loading[`import-${table.name}`]}
                               className="absolute inset-0 opacity-0 cursor-pointer w-full" 
                             />
                             <Button className="h-9 px-5 font-bold text-[9px] uppercase gap-2 shadow-sm bg-slate-950 rounded-lg">
                                {loading[`import-${table.name}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Importar Dados
                             </Button>
                          </div>
                       </div>
                    </div>
                ))}
             </div>
          </TabsContent>

          {/* TAB: GOOGLE DRIVE */}
          <TabsContent value="cloud" className="space-y-10 animate-in fade-in slide-in-from-top-4 pb-20">
             <div className="max-w-4xl mx-auto space-y-8 py-6 text-center">
                <div className="space-y-3">
                   <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                      <Cloud className="h-8 w-8" />
                   </div>
                   <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Google Drive Sync</h2>
                   <p className="text-slate-500 max-w-sm mx-auto font-medium text-[11px]">Sincronização redundante e segura para o seu armazenamento pessoal do Google Cloud.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 text-left">
                   <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-xl bg-white p-1">
                      <CardHeader className="p-5">
                         <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Globe className="h-4 w-4 text-teal-600" /> Status do Conexão
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="px-5 pb-6 space-y-4">
                         <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                               <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Integração</p>
                               <p className="font-bold text-slate-800 uppercase text-[10px]">Google Drive API</p>
                            </div>
                            <Badge className={cn("text-[7px] font-bold", googleConfig.clientId ? "bg-teal-600" : "bg-slate-400")}>
                               {googleConfig.clientId ? "CONFIGURADO" : "PENDENTE"}
                            </Badge>
                         </div>
                         <Button className="w-full h-10 bg-slate-950 text-white font-bold uppercase tracking-widest text-[9px] gap-2 shadow-sm" onClick={() => setShowGoogleConfig(true)}>
                            <Settings2 className="h-3.5 w-3.5" /> Configurar Credenciais
                         </Button>
                      </CardContent>
                   </Card>

                   <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-xl bg-white p-1">
                      <CardHeader className="p-5">
                         <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Ponto de Restauração (Full)
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="px-5 pb-6 space-y-4">
                         <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Gera um backup completo (Banco + Arquivos) e salva no seu servidor e Google Drive de forma automática.</p>
                         <Button 
                           className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-[9px] gap-3 shadow-lg shadow-emerald-500/20"
                           onClick={handleCreateCloudCheckpoint}
                           disabled={isCreatingCheckpoint}
                         >
                            {isCreatingCheckpoint ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Criar Ponto de Restauração
                         </Button>
                      </CardContent>
                   </Card>

                   <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-xl bg-white p-1 md:col-span-2">
                      <CardHeader className="p-5 border-b border-slate-50">
                         <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <History className="h-4 w-4 text-slate-500" /> Histórico de Checkpoints
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="overflow-x-auto">
                           <Table>
                             <TableHeader>
                               <TableRow className="hover:bg-transparent">
                                 <TableHead className="text-[9px] uppercase font-bold text-slate-400">Data / Hora</TableHead>
                                 <TableHead className="text-[9px] uppercase font-bold text-slate-400">Versão</TableHead>
                                 <TableHead className="text-[9px] uppercase font-bold text-slate-400">Status</TableHead>
                                 <TableHead className="text-[9px] uppercase font-bold text-slate-400 text-right">Ações</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {checkpoints.length === 0 ? (
                                 <TableRow>
                                   <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-[10px] uppercase font-medium">Nenhum checkpoint registrado</TableCell>
                                 </TableRow>
                               ) : (
                                 checkpoints.map((cp) => (
                                   <TableRow key={cp.id} className="text-[10px]">
                                     <TableCell className="font-medium text-slate-600">{new Date(cp.created_at).toLocaleString('pt-BR')}</TableCell>
                                     <TableCell className="font-mono text-slate-400">{cp.version_label}</TableCell>
                                     <TableCell>
                                       <Badge className={cn(
                                         "text-[7px] font-bold",
                                         cp.status === 'completed' ? "bg-emerald-100 text-emerald-700" : 
                                         cp.status === 'failed' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                                       )}>
                                         {cp.status.toUpperCase()}
                                       </Badge>
                                     </TableCell>
                                     <TableCell className="text-right">
                                       <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!cp.sql_file_id}>
                                         <ExternalLink className="h-3.5 w-3.5" />
                                       </Button>
                                     </TableCell>
                                   </TableRow>
                                 ))
                               )}
                             </TableBody>
                           </Table>
                         </div>
                         <div className="p-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                           <p className="text-[9px] text-slate-400 font-medium">Exibindo os últimos 10 pontos registrados.</p>
                           <Button variant="ghost" className="h-6 text-[9px] font-bold uppercase tracking-widest gap-2" onClick={fetchCheckpoints}>
                             <RefreshCcw className="h-3 w-3" /> Atualizar
                           </Button>
                         </div>
                      </CardContent>
                   </Card>
                </div>

                <Card className="border-dashed border-2 border-slate-200 rounded-xl bg-slate-50/50 p-6">
                   <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                      <div className="flex gap-4 items-start text-left">
                         <div className="bg-slate-950 text-white p-2.5 rounded-lg shadow-sm"><ShieldCheck className="h-6 w-6" /></div>
                         <div className="space-y-0.5">
                            <h4 className="font-bold uppercase text-[11px] text-slate-800 tracking-tight">Instruções de Segurança</h4>
                            <p className="text-[10px] text-slate-500 max-w-md">Para utilizar o backup no Drive, você deve criar um projeto no Google Cloud Console e habilitar a API do Drive com o escopo <code className="bg-slate-200 px-1 rounded-sm text-[9px]">drive.file</code>.</p>
                         </div>
                      </div>
                      <Button variant="link" className="font-bold text-primary text-xs gap-1 h-auto p-0" asChild>
                         <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
                            Google Cloud Console <ExternalLink className="h-3 w-3" />
                         </a>
                      </Button>
                   </div>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL CONFIG GOOGLE */}
      <Dialog open={showGoogleConfig} onOpenChange={setShowGoogleConfig}>
        <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-950 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold uppercase tracking-tight">API Google Drive</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">Configure as chaves de acesso do seu projeto Google Cloud.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Client ID</Label>
                <Input placeholder="000000000000-xxxxx.apps.googleusercontent.com" value={googleConfig.clientId} onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })} className="h-10 font-mono text-[11px] rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-500">API Key</Label>
                <Input type="password" placeholder="AIzaSy..." value={googleConfig.apiKey} onChange={(e) => setGoogleConfig({ ...googleConfig, apiKey: e.target.value })} className="h-10 font-mono text-[11px] rounded-lg" />
              </div>
            </div>
            <div className="bg-blue-50 p-3.5 rounded-xl flex gap-3 items-start">
               <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
               <p className="text-[9px] text-blue-700 font-medium leading-relaxed">Estas chaves serão armazenadas apenas no seu navegador. O redirecionamento OAuth deve estar configurado para <code className="bg-blue-100 px-1 rounded-sm">https://atelie-9df54.web.app</code></p>
            </div>
            <Button className="w-full h-11 font-bold uppercase tracking-widest text-[10px] gap-2 shadow-sm bg-slate-950 rounded-lg" onClick={saveGoogleConfig}>
              <Save className="h-4 w-4" /> Salvar Credenciais
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
