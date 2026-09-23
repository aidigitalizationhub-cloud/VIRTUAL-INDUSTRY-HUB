import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ReportCenter } from '../ReportCenter';
import type { AccountDeletionRecord, NewsItem, Project, User } from '../../types';

interface AdminReportModalProps {
  open: boolean;
  user: User | null;
  profiles: User[];
  projects: Project[];
  news: NewsItem[];
  eois: any[];
  accountDeletions: AccountDeletionRecord[];
  onClose: () => void;
}

export const AdminReportModal: React.FC<AdminReportModalProps> = ({
  open,
  user,
  profiles,
  projects,
  news,
  eois,
  accountDeletions,
  onClose,
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-6xl w-full shadow-xl relative my-8 max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-full transition cursor-pointer z-20"
            title="Close Report Center"
          >
            <X size={20} />
          </button>
          <ReportCenter
            user={user}
            profiles={profiles}
            projects={projects}
            news={news}
            eois={eois}
            accountDeletions={accountDeletions}
            onClose={onClose}
          />
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
