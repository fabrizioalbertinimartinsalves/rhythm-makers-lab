import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, X, MoreVertical, ExternalLink, CreditCard, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: 'pago' | 'pendente' | 'cancelado';
  category?: { nome: string; cor: string };
  student?: { nome: string };
}

interface TransactionTableProps {
  transactions: Transaction[];
  onAction?: (id: string, action: 'pay' | 'cancel' | 'view' | 'pay_online' | 'revert' | 'delete') => void;
  isLoading?: boolean;
}

export const TransactionTable = ({
  transactions,
  onAction,
  isLoading
}: TransactionTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full bg-slate-50 rounded-xl" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhuma transação pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div 
          key={t.id} 
          className="group flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl ring-1 ring-slate-100 hover:ring-primary/20 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {t.type === 'income' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h4 className="text-[11px] sm:text-[12px] font-bold text-slate-900 truncate uppercase tracking-tight">
                {t.description}
              </h4>
              {t.student && (
                <p className="text-[9px] font-medium text-primary mt-0.5 uppercase tracking-wide">
                  Aluno: {t.student.nome}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(t.date).toLocaleDateString('pt-BR')}
                </span>
                {t.category && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                    <span 
                      className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${t.category.cor}20`, color: t.category.cor }}
                    >
                      {t.category.nome}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 text-right shrink-0">
            <div>
              <p className={cn(
                "text-[12px] sm:text-[14px] font-bold tracking-tight",
                t.type === 'income' ? "text-emerald-600" : "text-rose-600"
              )}>
                {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
              </p>
              <Badge variant="outline" className={cn(
                "text-[7px] sm:text-[8px] font-bold uppercase tracking-widest border-none px-1 py-0 h-4",
                t.status === 'pago' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              )}>
                {t.status}
              </Badge>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {t.status === 'pendente' && (
                <>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 hover:bg-emerald-50 text-emerald-600"
                    onClick={() => onAction?.(t.id, 'pay')}
                    title="Confirmar Recebimento (Manual)"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  {t.type === 'income' && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 hover:bg-primary/10 text-primary"
                      onClick={() => onAction?.(t.id, 'pay_online')}
                      title="Receber via Mercado Pago (Cartão/Pix)"
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {t.status === 'pendente' && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 hover:bg-rose-50 text-rose-500"
                  onClick={() => onAction?.(t.id, 'delete')}
                  title="Excluir Lançamento"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {t.status === 'pago' && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 hover:bg-rose-50 text-rose-600"
                  onClick={() => onAction?.(t.id, 'revert')}
                  title="Reverter para Pendente"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-slate-400 group/btn"
                onClick={() => onAction?.(t.id, 'view')}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
