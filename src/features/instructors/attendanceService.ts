import { supabase } from "@/lib/supabase";

export const attendanceService = {
  /**
   * Realiza o check-in do instrutor validando a geolocalização
   * @param classId ID da aula
   */
  async performCheckIn(classId: string): Promise<{ success: boolean; distance_m: number; check_in_time: string }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Geolocalização não é suportada por este navegador."));
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const { data, error } = await supabase.rpc("register_instructor_checkin", {
              p_class_id: classId,
              p_lat: latitude,
              p_lng: longitude,
            });

            if (error) {
              // Tratar erro customizado do RAISE EXCEPTION no Postgres
              return reject(new Error(error.message));
            }

            resolve(data);
          } catch (err: any) {
            reject(err);
          }
        },
        (error) => {
          let msg = "Erro ao obter localização.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = "Permissão de localização negada pelo usuário.";
              break;
            case error.POSITION_UNAVAILABLE:
              msg = "Informações de localização indisponíveis.";
              break;
            case error.TIMEOUT:
              msg = "Tempo esgotado ao buscar localização.";
              break;
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },
};
