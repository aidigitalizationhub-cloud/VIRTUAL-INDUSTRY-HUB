import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../../../components/AdminDashboard';
import type { User } from '../../../types';

export const AdminAuditPage: React.FC<{ user: User | null; onRefresh?: () => void }> = ({ user, onRefresh }) => {
  const navigate = useNavigate();
  return (
    <AdminDashboard
      user={user}
      onRefresh={onRefresh}
      activeSubTab="logs"
      setActiveSubTab={(tab) => {
        const segment: Record<string, string> = {
          metrics: 'overview',
          users: 'users',
          disclosures: 'disclosures',
          projects: 'projects',
          news: 'news',
          logs: 'audit',
          decisions: 'decisions',
        };
        navigate(`/dashboard/admin/${segment[tab] ?? 'audit'}`);
      }}
    />
  );
};
