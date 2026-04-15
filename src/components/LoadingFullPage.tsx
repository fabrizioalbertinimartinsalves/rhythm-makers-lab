import { Dumbbell, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function LoadingFullPage() {
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    // Tenta pegar do cache primeiro para velocidade no F5
    const cached = localStorage.getItem("kineos_branding_cache");
    if (cached) {
      setBranding(JSON.parse(cached));
    }

    // Busca atualizado do Supabase
    const fetchBranding = async () => {
      const { data } = await supabase.from("login_page_config").select("*");
      if (data) {
        const config: any = {};
        data.forEach(item => {
          config[item.config_key] = item.config_value;
        });
        setBranding(config);
        localStorage.setItem("kineos_branding_cache", JSON.stringify(config));
      }
    };
    fetchBranding();
  }, []);

  const logo = branding?.login_main_logo;
  const title = branding?.login_title || "Kineos";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          {logo ? (
            <img 
              src={logo} 
              alt="Logo" 
              className="h-24 w-auto object-contain relative animate-pulse" 
            />
          ) : (
            <Dumbbell className="h-20 w-20 text-primary relative animate-pulse" />
          )}
        </div>
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 italic">
            {title}
          </h1>
          <div className="flex items-center gap-2 justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce font-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
