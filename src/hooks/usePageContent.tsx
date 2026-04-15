import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PageContent {
  id: string;
  slug: string;
  title: string;
  content: any;
  metadata: any;
  is_published: boolean;
}

export function usePageContent(slug: string) {
  return useQuery<PageContent | null>({
    queryKey: ["site-page-content-sb", slug],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("site_pages")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') return null; // No results
          throw error;
        }
        
        return data as PageContent;
      } catch (err) {
        console.error(`Erro ao buscar conteúdo da página ${slug}:`, err);
        return null;
      }
    },
    staleTime: 300000, // 5 minutes cache
  });
}

export function useAllPages() {
  return useQuery<PageContent[]>({
    queryKey: ["site-pages-admin-sb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .order("title", { ascending: true });
      
      if (error) throw error;
      return data as PageContent[];
    }
  });
}
