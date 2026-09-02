import { supabase } from "../lib/supabase";
import { postJson } from "../lib/api";
import { getAuthUser } from "../lib/auth-client";

export const AIScoutService = {
  getLastSyncTime: async (): Promise<Date | null> => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return null;
      return new Date(data[0].created_at);
    } catch (e) {
      return null;
    }
  },

  /**
   * Triggers a real server-side scout sync via POST /api/ai-scout/sync.
   * Returns true only when the server reports new items were added.
   */
  autoSyncNews: async (force: boolean = false): Promise<boolean> => {
    try {
      if (!force) {
        const user = await getAuthUser();
        if (!user?.id) return false;

        const lastSync = await AIScoutService.getLastSyncTime();
        if (lastSync) {
          const timeDiff = new Date().getTime() - lastSync.getTime();
          // If sync happened less than 30 mins ago, no need to hit the server
          if (timeDiff < 30 * 60 * 1000) {
            return false;
          }
        }
      }
      const res = await postJson<{ didUpdate?: boolean }>('/api/ai-scout/sync', { force });
      return !!res?.didUpdate;
    } catch (error: any) {
      console.warn("AI Scout sync failed:", error?.message || error);
      // Surface failures for explicit (admin) syncs; stay silent for background syncs
      if (force) throw error;
      return false;
    }
  }
};
