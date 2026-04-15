import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function usePixConfig() {
  const { studioId } = useAuth();
  return useQuery({
    queryKey: ["pix-config-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return null;
      
      const { data, error } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .maybeSingle();

      if (error) throw error;
      
      const config = data?.config || {};
      
      return {
        chavePix: config["financeiro.pix_chave"] || "",
        tipoChave: config["financeiro.pix_tipo_chave"] || "",
        nomeBeneficiario: config["financeiro.pix_nome_beneficiario"] || "",
        cidade: config["financeiro.pix_cidade"] || "",
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
