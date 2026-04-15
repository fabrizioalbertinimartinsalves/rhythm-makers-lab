import React, { useState } from "react";
import { 
  Users, 
  CreditCard, 
  Calendar, 
  Music, 
  Shirt, 
  Settings, 
  BookOpen, 
  CheckCircle2, 
  Info, 
  ChevronRight, 
  Wand2,
  Clock,
  ShieldCheck,
  Smartphone,
  MessageCircle,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ManualSection {
  id: string;
  title: string;
  icon: React.ElementType;
}

const AdminManual = () => {
  const [activeSection, setActiveSection] = useState<string>("intro");

  const sections: ManualSection[] = [
    { id: "intro", title: "Introdução", icon: BookOpen },
    { id: "students", title: "Gestão de Alunos", icon: Users },
    { id: "billing", title: "Financeiro & Billing", icon: CreditCard },
    { id: "schedule", title: "Agenda & Cockpit", icon: Calendar },
    { id: "festivals", title: "Festivais & Ingressos", icon: Music },
    { id: "costumes", title: "Figurinos", icon: Shirt },
    { id: "integrations", title: "Configurações & APIs", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "intro":
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-4">
              <Badge variant="outline" className="border-primary/30 text-primary px-3 py-1 font-bold">BEM-VINDO AO KINEOS</Badge>
              <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter italic uppercase">Guia Operacional <span className="text-primary italic">Passo a Passo</span></h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl">
                Este manual foi desenhado para transformar você em um mestre na operacionalização do seu estúdio. Siga os guias abaixo para cada módulo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-100 bg-emerald-50/30 overflow-hidden group">
                <CardContent className="p-8 space-y-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Mentalidade Kineos</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Tudo no sistema é interconectado. Uma matrícula gera um contrato, que gera uma fatura, que alimenta o fluxo de caixa. O segredo é manter os dados sempre atualizados.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-100 bg-blue-50/30 overflow-hidden group">
                <CardContent className="p-8 space-y-4">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Smartphone className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Acesso Mobile</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    Recomendamos que seus instrutores usem o sistema no celular para chamadas e fotos, enquanto você faz o financeiro no computador.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "students":
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Como Matricular um Novo Aluno</h2>
              <p className="text-slate-500">O Wizard de Matrícula é a ferramenta mais poderosa do sistema.</p>
            </div>

            <div className="space-y-4">
               {[
                 { step: 1, text: "Acesse o menu 'Alunos' lateral e clique no botão verde '+ Novo Aluno'." },
                 { step: 2, text: "Preencha os dados pessoais. IMPORTANTE: O CPF é obrigatório para gerar o contrato jurídico." },
                 { step: 3, text: "Selecione o 'Dia de Vencimento Unificado'. Isso garante que todas as faturas do aluno vençam no mesmo dia, todo mês." },
                 { step: 4, text: "Selecione a(s) Modalidade(s) e Plano(s). O sistema calculará o PRO-RATA da primeira mensalidade automaticamente." },
                 { step: 5, text: "Revise e confirme. O sistema agora gera simultaneamente: o Perfil, a Matrícula Ativa, o Contrato e a 1ª Fatura." }
               ].map((item) => (
                 <div key={item.step} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-primary/20 transition-all">
                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0 font-black text-slate-500">{item.step}</div>
                    <p className="text-slate-700 font-medium py-2">{item.text}</p>
                 </div>
               ))}
            </div>

            <Card className="bg-amber-50 border-amber-100">
              <CardContent className="p-6 flex gap-4">
                <Info className="h-6 w-6 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900">Dica: Responsáveis Financeiros</p>
                  <p className="text-sm text-amber-700 leading-relaxed">Para menores de idade, preencha sempre os campos de Responsável. Os boletos e contratos serão gerados no nome deles.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Dominando o Faturamento Automático</h2>
              <p className="text-slate-500">Faturamento Consolidado v2: Menos gestão, maior recebimento.</p>
            </div>

            <div className="grid gap-6">
               <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-4">
                  <div className="flex items-center gap-3">
                     <Clock className="h-6 w-6 text-primary" />
                     <h3 className="text-xl font-bold">Faturamento de Recorrência</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    O sistema gera faturas recorrentes automaticamente 10 dias antes do vencimento do aluno. 
                    <br/><br/>
                    <strong>Passo a Passo:</strong> No menu 'Financeiro', clique em <em>'Gerar Recorrência'</em> no início do mês. O motor vai varrer todas as matrículas ativas e consolidar as mensalidades em faturas únicas por aluno.
                  </p>
               </div>

               <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-4">
                  <div className="flex items-center gap-3">
                     <CreditCard className="h-6 w-6 text-blue-500" />
                     <h3 className="text-xl font-bold">Pagamentos Manual vs Automático</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    - <strong>Manual:</strong> Se o aluno pagar em dinheiro/pix no balcão, você clica no botão 'Confirmar' na fatura.<br/>
                    - <strong>Automático:</strong> Integrando o Mercado Pago, o sistema dá baixa sozinho assim que o pagamento é aprovado.
                  </p>
               </div>
            </div>
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">O Cockpit: Controle sua Grade</h2>
              <p className="text-slate-500">Visualize quem está no estúdio em tempo real.</p>
            </div>

            <div className="space-y-6">
               <div className="relative pl-12 border-l-2 border-slate-100 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[54px] top-0 h-10 w-10 bg-white border-2 border-primary rounded-full flex items-center justify-center font-bold text-primary">1</div>
                    <div className="space-y-2">
                       <h4 className="font-bold text-slate-950">Filtre por Modalidade ou Instrutor</h4>
                       <p className="text-sm text-slate-500">Use os filtros no topo do Cockpit para focar em áreas específicas do estúdio.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[54px] top-0 h-10 w-10 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-500">2</div>
                    <div className="space-y-2">
                       <h4 className="font-bold text-slate-950">Gerencie a Lista de Presença</h4>
                       <p className="text-sm text-slate-500">Clique em qualquer horário para ver a lista de alunos. Registre ausências ou remanejamentos ali mesmo.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[54px] top-0 h-10 w-10 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-500">3</div>
                    <div className="space-y-2">
                       <h4 className="font-bold text-slate-950">Bloqueios de Agenda</h4>
                       <p className="text-sm text-slate-500">Vai ter feriado? Use o botão 'Bloquear Horário' para impedir agendamentos indevidos naquele período.</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        );

      case "festivals":
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Festivais & Espetáculos</h2>
              <p className="text-slate-500">Transforme seus eventos em lucro organizado.</p>
            </div>

            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6">
               <div className="flex gap-4">
                  <Badge className="bg-primary hover:bg-primary">PASSO 1</Badge>
                  <p className="font-medium">Cadastre o Festival em 'Gestão de Festivais'. Defina data e local.</p>
               </div>
               <div className="flex gap-4">
                  <Badge className="bg-primary hover:bg-primary">PASSO 2</Badge>
                  <p className="font-medium">Crie <strong>Pacotes</strong> (ex: Fantasia + Ingressos). O sistema cuidará das cobranças.</p>
               </div>
               <div className="flex gap-4">
                  <Badge className="bg-primary hover:bg-primary">PASSO 3</Badge>
                  <p className="font-medium">Emita Ingressos QR Code para os participantes e famílias.</p>
               </div>
               <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-3">
                  <Wand2 className="h-5 w-5 text-primary" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">O check-in na porta pode ser feito com qualquer celular lendo o QR Code.</p>
               </div>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Super-Automações (APIs)</h2>
              <p className="text-slate-500">Conecte o Kineos ao mundo externo.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
               <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/20 space-y-4">
                  <div className="flex items-center gap-3">
                     <MessageCircle className="h-6 w-6 text-emerald-500" />
                     <h3 className="text-lg font-bold">Evolution API (WhatsApp)</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <strong>Como ativar:</strong> Em Configurações {'>'} Integrações, coloque a URL e o Token da sua instância. <br/><br/>
                    <em>Isso habilita o envio automático de links de pagamento e avisos de aula.</em>
                  </p>
               </div>

               <div className="p-6 rounded-3xl border border-blue-100 bg-blue-50/20 space-y-4">
                  <div className="flex items-center gap-3">
                     <CreditCard className="h-6 w-6 text-blue-500" />
                     <h3 className="text-lg font-bold">Mercado Pago</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <strong>Como ativar:</strong> Insira seu Access Token em Integrações. <br/><br/>
                    <em>Isso permite que seus alunos paguem via PIX ou Cartão e o sistema dê baixa automático.</em>
                  </p>
               </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F7F3EC] overflow-hidden">
      {/* Sidebar de Navegação */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-black">K</div>
            <span className="font-black tracking-tighter uppercase italic text-lg">Central <span className="text-primary">Admin</span></span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Operacional</p>
        </div>

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1 py-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 group ${
                    isActive 
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "group-hover:text-primary"} transition-colors`} />
                    <span className="text-sm font-bold">{section.title}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-6">
          <Card className="bg-slate-50 border-none rounded-3xl overflow-hidden relative">
            <CardContent className="p-4 space-y-3">
               <HelpCircle className="h-5 w-5 text-slate-400" />
               <p className="text-xs font-bold text-slate-900">Precisa de suporte extra?</p>
               <Button className="w-full h-9 text-[10px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600">Falar com Consultor</Button>
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 bg-white md:m-4 md:rounded-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden border border-slate-100 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-8 md:p-16 max-w-4xl">
            {renderContent()}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default AdminManual;
