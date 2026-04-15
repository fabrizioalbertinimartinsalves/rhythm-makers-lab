import { useAllPages } from "@/hooks/usePageContent";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, FileText, Settings, ExternalLink, Trash2, Globe, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function PageManager() {
  const { data: pages = [], isLoading } = useAllPages();

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
             <Badge className="bg-primary/5 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 mb-2">CMS Interno</Badge>
             <h1 className="text-2xl font-black text-slate-950 tracking-tighter uppercase italic flex items-center gap-3 leading-none">
                Gestor de <span className="text-primary italic-none tracking-normal">Páginas</span>
             </h1>
             <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Administração de Conteúdo Institucional</p>
          </div>
          <Button disabled className="h-9 px-6 bg-slate-900 font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-slate-950/20 gap-2 opacity-50 cursor-not-allowed">
             <Plus className="h-4 w-4" /> Nova Página
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="border-none shadow-sm ring-1 ring-slate-100 overflow-hidden hover:ring-primary/20 transition-all group">
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                   <div className="flex justify-between items-start">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-all shadow-inner">
                         <FileText className="h-6 w-6" />
                      </div>
                      <Badge variant={page.is_published ? "default" : "secondary"} className={`text-[8px] font-black uppercase tracking-widest h-5 ${page.is_published ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                         {page.is_published ? <div className="flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> Publicada</div> : <div className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Rascunho</div>}
                      </Badge>
                   </div>
                   
                   <div className="space-y-1">
                      <h3 className="font-black text-lg text-slate-900 tracking-tight uppercase leading-none">{page.title}</h3>
                      <p className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">/{page.slug}</p>
                   </div>

                   <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[2rem]">
                      {JSON.parse(JSON.stringify(page.metadata))?.description || "Sem descrição definida."}
                   </p>
                </div>

                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                   <Button variant="outline" className="flex-1 h-8 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white shadow-sm border-slate-200 rounded-lg hover:border-primary/20" asChild>
                      <Link to={`/superadmin/pages/${page.slug}`}>
                         <Settings className="h-3 w-3 mr-1.5" /> Editar
                      </Link>
                   </Button>
                   <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:text-primary border border-transparent hover:border-slate-100 transition-all rounded-lg" asChild>
                      <a href={page.slug === 'contato' ? '/contato' : `/${page.slug}`} target="_blank">
                         <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
