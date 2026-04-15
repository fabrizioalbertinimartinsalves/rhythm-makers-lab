import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { instructorService } from "@/features/instructors/instructorService";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface InstructorCheckInButtonProps {
  occurrenceId: string;
  initialStatus?: string;
  initialCheckInTime?: string;
  className?: string;
}

export default function InstructorCheckInButton({ 
  occurrenceId, initialStatus, initialCheckInTime, className 
}: InstructorCheckInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(initialStatus || 'scheduled');
  const [checkInTime, setCheckInTime] = useState<string | null>(initialCheckInTime || null);
  const queryClient = useQueryClient();

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const result = await instructorService.checkIn(occurrenceId);
      setCheckInTime(result.checkin_time);
      setStatus('completed');
      toast.success(result.message || "Check-in realizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["instructor-today-occurrences"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alunos-risco"] });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao realizar check-in.");
    } finally {
      setLoading(false);
    }
  };

  if (status === 'completed' || checkInTime) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 gap-1.5 text-emerald-600 bg-emerald-50 border-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold">
          Check-in às {checkInTime ? format(new Date(checkInTime), "HH:mm") : "Concluído"}
        </span>
      </Button>
    );
  }

  return (
    <Button 
      variant="default" 
      size="sm" 
      className={`h-8 gap-1.5 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        handleCheckIn();
      }}
      disabled={loading || status === 'cancelled'}
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-[10px]">Processando...</span>
        </>
      ) : (
        <>
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-[10px]">Realizar Check-in</span>
        </>
      )}
    </Button>
  );
}
