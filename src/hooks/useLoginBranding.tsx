import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LoginBrandingContent {
  primary_color: string;
  logo_url: string;
  login_hero_title: string;
  login_hero_highlight_text: string;
  login_hero_subtitle: string;
  login_hero_placeholder_img: string;
  login_form_title: string;
  login_form_subtitle: string;
  login_input_email_placeholder: string;
  login_input_password_placeholder: string;
  login_forgot_password_text: string;
  login_forgot_password_url: string;
  login_cta_primary_text: string;
  login_register_text: string;
  login_register_url: string;
  footer_placeholder_text: string;
  footer_linkedin_url: string;
  footer_instagram_url: string;
  link_contact_email: string;
  [key: string]: string | undefined;
}

export function useLoginBranding() {
  return useQuery<LoginBrandingContent>({
    queryKey: ["login-branding-sb"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("login_page_config")
          .select("config_key, config_value");
        
        if (error) throw error;
        
        const result: Record<string, string> = {};
        data.forEach((row) => {
          result[row.config_key] = row.config_value || "";
        });
        
        return result as LoginBrandingContent;
      } catch (err) {
        console.error("Erro ao buscar branding no Supabase:", err);
        return {
          primary_color: "#008080",
          login_hero_title: "Gestão simples e fluida para o seu estúdio crescer.",
          login_form_title: "Gestão simplificada."
        } as LoginBrandingContent;
      }
    },
    staleTime: 60000, 
  });
}
