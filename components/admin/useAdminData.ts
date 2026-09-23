import { useCallback, useEffect, useState } from 'react';
import type { AccountDeletionRecord, NewsItem, Project, User } from '../../types';
import { StorageService } from '../../services/storageService';
import type { ToastType } from '../../contexts/ToastContext';

interface UseAdminDataOptions {
  overviewOnly: boolean;
  showToast: (message: string, type?: ToastType) => void;
}

export const useAdminData = ({ overviewOnly, showToast }: UseAdminDataOptions) => {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [eois, setEois] = useState<any[]>([]);
  const [accountDeletions, setAccountDeletions] = useState<AccountDeletionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      if (overviewOnly) {
        const overview = await StorageService.getAdminOverview();
        setProfiles(overview.profiles);
        setProjects(overview.projects);
        setEois(overview.eois);
        setNews([]);
        setAccountDeletions([]);
        return;
      }

      const [allProfiles, allProjects, allNews, allEOIs, deletionsData] = await Promise.all([
        StorageService.adminGetAllProfiles(),
        StorageService.getProjects(),
        StorageService.getNews(true, { limit: 150 }),
        StorageService.adminGetAllEOIs(),
        StorageService.getAccountDeletions(),
      ]);

      setProfiles(allProfiles);
      setProjects(allProjects);
      setNews(allNews);
      setEois(allEOIs);
      setAccountDeletions(deletionsData);
    } catch (err) {
      console.error('Failed loading admin data', err);
      showToast('Error loading registry databases', 'error');
    } finally {
      setLoading(false);
    }
  }, [overviewOnly, showToast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  return {
    profiles,
    setProfiles,
    projects,
    setProjects,
    news,
    setNews,
    eois,
    accountDeletions,
    loading,
    loadAdminData,
  };
};
