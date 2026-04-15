/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LandingContent {
  // Identidade e Cores
  primary_color: string;
  logo_url: string;
  
  // Header
  header_link1_text: string;
  header_link1_url: string;
  header_cta_text: string;
  header_cta_url: string;

  // Hero
  hero_title: string;
  hero_highlight_text: string;
  hero_subtitle: string;
  hero_placeholder_img: string;
  hero_cta_primary_text: string;
  hero_cta_primary_url: string;

  // Barra de Números
  stats_students_count: string;
  stats_students_text: string;
  stats_studios_count: string;
  stats_studios_text: string;

  // Funcionalidades
  func_feature1_title: string;
  func_feature1_desc: string;
  func_feature1_icon: string;
  func_placeholder_img: string;

  // Planos
  plan_master_price: string;

  // FAQ
  faq_title: string;
  faq_q1_title: string;
  faq_q1_answer: string;

  // Depoimentos
  testim_title: string;
  testim_quote1_text: string;
  testim_quote1_name: string;

  // Footer
  footer_linkedin_url: string;
  footer_placeholder_text: string;

  // Links
  link_wpp_placeholder: string;
  link_contact_email: string;

  [key: string]: string | undefined;
}

export function useLandingContent() {
  return useQuery({
    queryKey: ["landing-content-sb"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("landpage_config")
          .select("config_key, config_value")
          .is("tenant_id", null);
        
        if (error) throw error;
        
        const result: Record<string, string> = {};
        data.forEach((row) => {
          result[row.config_key] = row.config_value || "";
        });
        return result as Partial<LandingContent>;
      } catch (err) {
        console.error("Erro ao buscar landing content no Supabase:", err);
        return {} as Partial<LandingContent>;
      }
    },
    staleTime: 60000, 
  });
}
