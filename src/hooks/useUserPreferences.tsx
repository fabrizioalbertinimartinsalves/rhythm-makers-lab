import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface UserPreferences {
  hidden_sections: string[];
  landing_page: string;
  notifications_push: boolean;
  notifications_email: boolean;
  notifications_pagamentos: boolean;
  notifications_leads: boolean;
  notifications_avisos: boolean;
  custom_font_title: string;
  custom_font_body: string;
  custom_font_size: string;
  custom_title_scale: string;
  custom_foreground_color: string;
  custom_primary_color: string;
  dashboard_section_order?: string[];
}

const DEFAULT_PREFS: UserPreferences = {
  hidden_sections: [],
  landing_page: "auto",
  notifications_push: true,
  notifications_email: true,
  notifications_pagamentos: true,
  notifications_leads: true,
  notifications_avisos: true,
  custom_font_title: "",
  custom_font_body: "",
  custom_font_size: "",
  custom_title_scale: "",
  custom_foreground_color: "",
  custom_primary_color: "",
};

function applyCustomStyles(prefs: UserPreferences) {
  const root = document.documentElement;

  if (prefs.custom_font_title) {
    root.style.setProperty("--font-title-override", prefs.custom_font_title);
  } else {
    root.style.removeProperty("--font-title-override");
  }

  if (prefs.custom_font_body) {
    root.style.setProperty("--font-body-override", prefs.custom_font_body);
  } else {
    root.style.removeProperty("--font-body-override");
  }

  if (prefs.custom_font_size) {
    root.style.setProperty("--font-size-override", `${prefs.custom_font_size}px`);
  } else {
    root.style.removeProperty("--font-size-override");
  }

  if (prefs.custom_foreground_color) {
    root.style.setProperty("--foreground", prefs.custom_foreground_color);
  } else {
    root.style.removeProperty("--foreground");
  }

  if (prefs.custom_primary_color) {
    root.style.setProperty("--primary", prefs.custom_primary_color);
  } else {
    root.style.removeProperty("--primary");
  }
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadPrefs = async (uid: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("preferences").eq("id", uid).single();
      if (!error && data?.preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadPrefs(session.user.id);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadPrefs(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  useEffect(() => {
    applyCustomStyles(prefs);
  }, [prefs.custom_font_title, prefs.custom_font_body, prefs.custom_font_size, prefs.custom_title_scale, prefs.custom_foreground_color, prefs.custom_primary_color]);


  const savePrefs = useCallback(async (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
    if (!userId) return;
    try {
      await supabase.from("profiles").update({ preferences: newPrefs }).eq("id", userId);
    } catch (err) {
      console.error("Erro ao salvar preferências:", err);
    }
  }, [userId]);

  const updatePref = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      savePrefs(updated);
      return updated;
    });
  }, [savePrefs]);

  return { prefs, loading, updatePref, savePrefs };
}
