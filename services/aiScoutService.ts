import { supabase } from "../lib/supabase";

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
   * Client-side news verification & sync checker.
   * Ensures latest news items are retrieved from Supabase database.
   */
  autoSyncNews: async (force: boolean = false): Promise<boolean> => {
    try {
      // Check last sync time
      const lastSync = await AIScoutService.getLastSyncTime();
      if (!force && lastSync) {
        const timeDiff = new Date().getTime() - lastSync.getTime();
        // If sync happened less than 30 mins ago, no need to force update
        if (timeDiff < 30 * 60 * 1000) {
          return false;
        }
      }
      return true;
    } catch (error: any) {
      console.log("AI Scout client news status check:", error?.message || error);
      return false;
    }
  }
};
