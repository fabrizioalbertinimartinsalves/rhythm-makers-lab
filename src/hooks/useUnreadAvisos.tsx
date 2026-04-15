import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadAvisos(audienceFilter: string[]) {
  const { user, studioId } = useAuth();
  const queryClient = useQueryClient();
  const hoje = new Date().toISOString().split("T")[0];

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-avisos", user?.id, studioId, audienceFilter],
    enabled: !!user?.id && !!studioId,
    queryFn: async () => {
      // 1. Get active notices for this studio and audience
      const { data: activeNotices, error: noticesError } = await supabase
        .from("notices")
        .select("id")
        .eq("studio_id", studioId)
        .eq("ativo", true)
        .lte("data_inicio", hoje)
        .in("destinatario", audienceFilter);

      if (noticesError) throw noticesError;
      if (!activeNotices || activeNotices.length === 0) return 0;

      // 2. Get read notice IDs for this user
      const { data: readNotices, error: readError } = await supabase
        .from("notice_reads")
        .select("notice_id")
        .eq("user_id", user?.id);

      if (readError) throw readError;
      
      const readSet = new Set(readNotices?.map(r => r.notice_id) || []);
      
      // count notices not in reached set
      return activeNotices.filter(n => !readSet.has(n.id)).length;
    },
    refetchInterval: 60000, 
  });

  const markAsRead = useMutation({
    mutationFn: async (noticeIds: string[]) => {
      if (!user?.id || !studioId || noticeIds.length === 0) return;
      
      const inserts = noticeIds.map(notice_id => ({
        user_id: user.id,
        notice_id
      }));

      const { error } = await supabase
        .from("notice_reads")
        .upsert(inserts, { onConflict: "user_id, notice_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-avisos"] });
    },
  });

  return { unreadCount, markAsRead };
}
