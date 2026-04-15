import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface StudioConfig {
  nome: string;
  logoUrl: string;
  sidebarLogoUrl: string;
  sidebarIconUrl: string;
  endereco: string;
  telefone: string;
  slug: string;
}

export function useStudioConfig(studioId?: string) {
  return useQuery({
    queryKey: ["studio-header-config-sb", studioId],
    queryFn: async () => {
      if (!studioId) return null;
      
      // 1. Fetch core studio info
      const { data: studio, error: sErr } = await supabase
        .from("studios")
        .select("id, nome, endereco, whatsapp, telefone, slug, logo_url, sidebar_logo_url, sidebar_icon_url")
        .eq("id", studioId)
        .single();
      
      if (sErr) throw sErr;

      // 2. Fetch JSON config for branding fallback (since studios columns are unreliable)
      const { data: configRow } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();
      
      const configJson = configRow?.config || {};
      const branding = configJson.tema || {};

      return {
        nome: studio.nome || "Kineos",
        // Prefer explicit columns in studios, fallback to JSON config
        logoUrl: studio.logo_url || branding.logo_url || "",
        sidebarLogoUrl: studio.sidebar_logo_url || branding.sidebar_logo_url || "",
        sidebarIconUrl: studio.sidebar_icon_url || branding.sidebar_icon_url || "",
        endereco: studio.endereco || "",
        telefone: studio.whatsapp || studio.telefone || "",
        slug: studio.slug || "",
        _debug: { 
          raw_studio: studio, 
          raw_config: configRow?.config,
          ts: new Date().toISOString()
        }
      } as any;
    },
    enabled: !!studioId,
    staleTime: 0,
    gcTime: 0, // Kill garbage collection for this query
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
