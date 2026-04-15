import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function usePublicOrg() {
  const [searchParams] = useSearchParams();
  const { slug: urlSlug } = useParams();
  const slug = urlSlug || searchParams.get("org") || undefined;

  return useQuery({
    queryKey: ["public-org-v2", slug],
    queryFn: async () => {
      console.warn("DEBUG: usePublicOrg searching for:", slug || "FALLBACK (No slug/org param)");
      
      let res;
      if (slug) {
        // Regex para verificar se o slug tem formato de UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        
        let query = supabase
          .from("studios")
          .select("id, nome, slug, logo_url, ativa");
          
        if (isUUID) {
          query = query.eq("id", slug);
        } else {
          query = query.eq("slug", slug);
        }
        
        res = await query.maybeSingle();
      } else {
        // Fallback: Busca o primeiro estúdio ativo (Geralmente para testes ou links globais)
        res = await supabase
          .from("studios")
          .select("id, nome, slug, logo_url, ativa")
          .eq("ativa", true)
          .limit(1)
          .maybeSingle();
      }
      
      const { data, error } = res;
      
      if (error) {
        console.error("CRITICAL: PublicOrg Fetch Error:", error);
        throw error;
      }

      if (!data) {
        console.warn("WARNING: Studio not found for slug:", slug);
        throw new Error(`Estúdio não encontrado: ${slug || 'Nenhum parâmetro fornecido'}`);
      }

      if (data.ativa === false) {
        console.warn("WARNING: Studio exists but is INACTIVE:", data.nome);
        throw new Error("Este estúdio está temporariamente inativo.");
      }
      
      console.warn("SUCCESS: PublicOrg loaded:", data.nome);
      return data as { id: string; nome: string; slug: string; logo_url?: string; ativa: boolean };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // Tentar apenas uma vez se falhar
  });
}
