import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { 
  CalendarDays, 
  MapPin, 
  Ticket as TicketIcon, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Instagram,
  Phone,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PublicTicket() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTicket() {
      try {
        setLoading(true);
        // We join festivals directly if possible, or through festival_enrollments
        const { data, error: fetchError } = await supabase
          .from("festival_tickets")
          .select(`
            *,
            festival_available_items ( name ),
            students ( nome, foto_url ),
            festival_enrollments (
               students ( nome, foto_url ),
               festivals ( * )
            )
          `)
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Ticket não encontrado.");

        setTicket(data);
      } catch (err: any) {
        console.error("Error fetching ticket:", err);
        setError(err.message || "Erro ao carregar o ingresso.");
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchTicket();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Carregando Ingresso Digital...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="h-20 w-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black uppercase italic mb-2">Ops! Ingresso Inválido</h1>
        <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed mb-8">
          Não conseguimos localizar este ingresso em nossa base de dados. Verifique o link e tente novamente.
        </p>
        <Badge variant="outline" className="text-rose-500 border-rose-500/30 uppercase text-[8px] font-black tracking-widest px-4 py-1">Code: 404_NOT_FOUND</Badge>
      </div>
    );
  }

  // Determine festival & student data from joins
  const festival = ticket.festival_enrollments?.festivals || {};
  const studentName = ticket.students?.nome || ticket.festival_enrollments?.students?.nome || "Participante";
  const statusColor = ticket.status === 'valido' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-700 shadow-slate-900/20';

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 py-12 md:py-20 flex flex-col items-center">
        
        {/* Header - Studio Info */}
        <div className="text-center mb-8">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Kineos Authenticity Verified</span>
           </div>
           <h2 className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">Passaporte Digital</h2>
        </div>

        {/* MAIN TICKET CARD - Mobile Optimized Vertical Layout */}
        <Card className="w-full rounded-[3rem] border-none bg-white p-0 overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)]">
          {/* Top Section - Status & QR */}
          <div className="bg-slate-900 p-8 text-center relative">
            <div className={`absolute top-6 right-6 h-3 w-3 rounded-full ${ticket.status === 'valido' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            
            <div className="qr-wrapper bg-white p-6 rounded-[2.5rem] shadow-2xl inline-block mb-6 ring-8 ring-white/5">
              <QRCodeSVG 
                value={JSON.stringify({ t: ticket.id })}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            
            <div className="space-y-1">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{ticket.serial_number || "FEST-DIGITAL"}</p>
              <h1 className="text-white text-3xl font-black uppercase tracking-tighter italic leading-none">{studentName}</h1>
              <Badge className={`${statusColor} border-none text-[9px] font-black uppercase mt-4 px-6 py-1.5 rounded-full tracking-widest`}>
                {ticket.status === 'valido' ? 'Acesso Permitido' : 'Ticket Utilizado'}
              </Badge>
            </div>
          </div>

          {/* Bottom Section - Content */}
          <CardContent className="p-8 space-y-8 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-100 italic font-black text-xs">RM</div>
            
            <div className="pt-4 text-center">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic leading-tight mb-1">{festival.name || "Evento"}</h3>
              <p className="text-indigo-500 font-bold uppercase text-[10px] tracking-widest">Confirmação de Inscrição</p>
            </div>

            <div className="space-y-6">
               <div className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Localização</p>
                    <p className="text-sm font-black text-slate-800 truncate">{festival.venue_name || "Confira com o Studio"}</p>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{festival.venue_address || "Endereço não disponível."}</p>
                  </div>
               </div>

               <div className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-500 shrink-0">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Data do Evento</p>
                    <p className="text-sm font-black text-slate-800">
                      {festival.date_start ? new Date(festival.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : "Data a confirmar"}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 italic">Chegue com antecedência mínima de 30min.</p>
                  </div>
               </div>

               <div className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100/50">
                  <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-500 shrink-0">
                    <TicketIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Tipo de Ingresso</p>
                    <p className="text-sm font-black text-slate-800">{ticket.festival_available_items?.name || "Entrada Geral"}</p>
                  </div>
               </div>
            </div>

            {/* Studio Footer */}
            <div className="pt-8 border-t border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center text-slate-400">
                <div className="flex gap-4">
                  {festival.contact_instagram && (
                    <div className="flex items-center gap-1.5">
                      <Instagram className="h-4 w-4" />
                      <span className="text-[10px] font-bold">{festival.contact_instagram}</span>
                    </div>
                  )}
                  {festival.contact_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      <span className="text-[10px] font-bold">{festival.contact_phone}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID Verificação</p>
                  <p className="text-[9px] font-mono font-bold text-slate-400">#{ticket.id.slice(0,8)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Instructions */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Apresente este QR Code na portaria do evento.<br/>Dica: Você pode tirar um print desta tela para acesso offline.
          </p>
          <div className="h-1.5 w-16 bg-slate-800 rounded-full mx-auto" />
        </div>

      </div>
    </div>
  );
}
