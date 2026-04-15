import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Studio {
  id: string;
  name: string;
  logo?: string;
  ativa?: boolean;
  status_assinatura?: "active" | "past_due" | "canceled" | "unpaid" | "blocked" | string;
}

interface TenantContextType {
  selectedStudio: Studio | null;
  setTenant: (studio: Studio | null) => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with Supabase (Subscription Status & Studio details)
  useEffect(() => {
    if (!selectedStudio?.id) return;

    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("id", selectedStudio.id)
        .maybeSingle();

      if (data) {
        setSelectedStudio(prev => {
          if (!prev) return null;
          return {
            ...prev,
            name: data.name || prev.name,
            logo: data.logo || prev.logo,
            ativa: data.ativa,
            status_assinatura: data.status_assinatura
          };
        });
      }
    };

    fetchLatest();

    // Subscribe to changes
    const channel = supabase
      .channel(`studio-${selectedStudio.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "studios",
          filter: `id=eq.${selectedStudio.id}`
        },
        (payload) => {
          const data = payload.new as any;
          setSelectedStudio(prev => {
            if (!prev) return null;
            return {
              ...prev,
              name: data.name || prev.name,
              logo: data.logo || prev.logo,
              ativa: data.ativa,
              status_assinatura: data.status_assinatura
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudio?.id]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedTenant");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed) return;
        if (typeof parsed === 'string') {
          // Se for string pura, tentamos carregar do banco os detalhes depois
          setSelectedStudio({ id: parsed, name: "Carregando..." });
        } else {
          setSelectedStudio(parsed);
        }
      } catch (e) {
        // Se falhar o parse, pode ser a string pura
        setSelectedStudio({ id: saved, name: "Carregando..." });
      }
    }
    setIsLoading(false);
  }, []);

  const setTenant = (studio: Studio | null) => {
    setSelectedStudio(studio);
    if (studio) {
      localStorage.setItem("selectedTenant", JSON.stringify(studio));
    } else {
      localStorage.removeItem("selectedTenant");
    }
  };

  return (
    <TenantContext.Provider value={{ selectedStudio, setTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant deve ser usado dentro de um TenantProvider");
  }
  return context;
};
export { TenantProvider, useTenant };
