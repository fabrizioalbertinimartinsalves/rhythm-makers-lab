import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

interface PaymentNotification {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

function isPwaInstalled() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    if (status.display === "denied") return false;
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }

  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function showNativeNotification(titulo: string, mensagem: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: titulo,
            body: mensagem,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: "default",
            actionTypeId: "",
            extra: null,
          },
        ],
      });
      return;
    } catch (error) {
      console.error("Error scheduling local notification:", error);
    }
  }

  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(titulo, {
        body: mensagem,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: "payment-notification",
        renotify: true,
      } as NotificationOptions);
    });
  } else {
    new Notification(titulo, {
      body: mensagem,
      icon: "/pwa-192x192.png",
    });
  }
}

export function usePaymentNotifications() {
  const { user, studioId } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);

  useEffect(() => {
    if ((isPwaInstalled() || Capacitor.isNativePlatform()) && user?.id) {
      requestNotificationPermission();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !studioId) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("lida", false)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.length);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as PaymentNotification;
          setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
          setUnreadCount(c => c + 1);
          
          toast.success(newNotif.titulo, { description: newNotif.mensagem });
          if (isPwaInstalled() || Capacitor.isNativePlatform()) {
            showNativeNotification(newNotif.titulo, newNotif.mensagem);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, studioId]);

  const markAsRead = async (id: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("id", id);
    
    if (error) console.error("Error marking as read:", error);
  };

  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
    
    if (error) console.error("Error marking all as read:", error);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
