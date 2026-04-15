import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface GeoCheckinProps {
  studentId: string;
  classId: string;
  disabled?: boolean;
}

export default function GeoCheckin({ studentId, classId, disabled }: GeoCheckinProps) {
  const { studioId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();

  // Load studio coordinates from studio_configs
  const { data: geoConfig } = useQuery({
    queryKey: ["checkin-geo-config", studioId],
    enabled: !!studioId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!studioId) return { lat: -19.9191, lon: -43.9386, raio: 100 };
      const { data, error } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      const config = data?.config || {};
      return {
        lat: parseFloat(config["checkin.latitude"] || "-19.9191"),
        lon: parseFloat(config["checkin.longitude"] || "-43.9386"),
        raio: parseInt(config["checkin.raio_metros"] || "100", 10),
      };
    },
  });

  const handleCheckin = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }

    if (!studioId) {
      toast.error("ID do estúdio não encontrado.");
      return;
    }

    const config = geoConfig || { lat: -19.9191, lon: -43.9386, raio: 100 };
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = haversineDistance(latitude, longitude, config.lat, config.lon);

        if (distance > config.raio) {
          toast.error(
            `Você precisa estar na unidade para fazer o check-in. Distância: ${Math.round(distance)}m`,
            { duration: 5000 }
          );
          setLoading(false);
          return;
        }

        const hoje = new Date().toISOString().split("T")[0];
        
        try {
          const { error } = await supabase
            .from("presences")
            .insert({
              studio_id: studioId,
              student_id: studentId,
              class_id: classId,
              data: hoje,
              presente: true,
              created_at: new Date().toISOString()
            });

          if (error) throw error;
          
          // Also try to create a session record if we want to track session count
          await supabase
            .from("sessions")
            .insert({
              studio_id: studioId,
              student_id: studentId,
              class_id: classId,
              data: hoje,
              created_at: new Date().toISOString()
            });

        } catch (err: any) {
          toast.error("Erro ao registrar presença: " + err.message);
          setLoading(false);
          return;
        }

        toast.success("✅ Check-in realizado com sucesso!");
        setDone(true);
        queryClient.invalidateQueries({ queryKey: ["my-sessoes-count"] });
        queryClient.invalidateQueries({ queryKey: ["my-presencas-today"] });
        queryClient.invalidateQueries({ queryKey: ["my-checkin-history"] });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Permissão de localização negada. Habilite nas configurações do navegador.");
        } else {
          toast.error("Não foi possível obter sua localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (done) {
    return (
      <Button size="sm" variant="ghost" disabled className="text-xs gap-1">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        Presente
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs gap-1"
      disabled={loading || disabled}
      onClick={handleCheckin}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <MapPin className="h-3.5 w-3.5" />
      )}
      Confirmar Presença
    </Button>
  );
}
