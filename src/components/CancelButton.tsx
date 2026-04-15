import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ban, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getCancellationMessage } from "@/utils/appointment-utils";

interface CancelButtonProps {
  bookingId: string;
  dateStr: string;
  timeStr?: string;
  onSuccess?: () => void;
  variant?: "outline" | "ghost" | "destructive" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export const CancelButton: React.FC<CancelButtonProps> = ({
  bookingId,
  dateStr,
  timeStr,
  onSuccess,
  variant = "outline",
  size = "sm",
  className,
  label = "Cancelar",
}) => {
  const [loading, setLoading] = useState(false);
  const message = getCancellationMessage(dateStr, timeStr);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("cancel_booking", {
        p_booking_id: bookingId,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; credited: boolean };

      if (result.success) {
        toast.success(result.message);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast.error(error.message || "Erro ao processar o cancelamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Ban className="h-4 w-4 mr-1" />
          )}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Cancelamento?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Você tem certeza que deseja cancelar este agendamento?</p>
            <div className="p-3 bg-slate-50 border rounded-lg text-sm font-medium text-slate-700">
              {message}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar e Cancelar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
