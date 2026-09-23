import React from 'react';
import { Globe, Download, Search, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import type { Project, User } from '../../types';
import type { ToastType } from '../../contexts/ToastContext';

interface AdminMetricsSectionProps {
  profiles: User[];
  projects: Project[];
  eois: any[];
  publicProjectsCount: number;
  totalResearchers: number;
  totalInvestors: number;
  onOpenReport: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export const AdminMetricsSection: React.FC<AdminMetricsSectionProps> = ({
  profiles,
  projects,
  eois,
  publicProjectsCount,
  totalResearchers,
  totalInvestors,
  onOpenReport,
  showToast,
}) => {
  const exportMetrics = () => {
    const csvRows = [
      ['Metric', 'Value'],
      ['Total Registrants', profiles.length],
      ['Total Projects', projects.length],
      ['Total Disclosure Views', projects.reduce((acc, project) => acc + (project.views || 0), 0)],
      ['Total Expression of Interest Clicks', eois.length],
      ['Public Projects Count', publicProjectsCount],
      ['Researchers Count', totalResearchers],
      ['Investors Count', totalInvestors],
    ];
    const csvContent = `data:text/csv;charset=utf-8,${csvRows.map(row => row.join(',')).join('\n')}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `UG_Hub_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Analytics summary CSV exported successfully!', 'success');
  };

  const totalViews = projects.reduce((acc, project) => acc + (project.views || 0), 0);
  const conversionRate = ((eois.length / Math.max(totalViews, 1)) * 100).toFixed(1);

  const stats = [
    { label: 'Disclosure Views', value: totalViews.toLocaleString(), sub: 'Recorded research page visits', color: 'text-ug-navy' },
    { label: 'EOI Inquiries & Clicks', value: eois.length, sub: 'Recorded expressions of interest', color: 'text-ug-teal' },
    { label: 'Engagement Rate', value: `${conversionRate}%`, sub: 'Views converted to EOIs', color: 'text-blue-600' },
    { label: 'Verified Registrants', value: profiles.length, sub: 'Researchers, VCs & Partners', color: 'text-purple-600' },
  ];

  return (
    <motion.div
      key="metrics"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 text-left"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-ug-teal mb-1">
            <TrendingUp size={16} />
            <span className="text-[11px] font-semibold tracking-wide">Ecosystem Intelligence & Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-ug-navy">Platform Performance & Engagement Dashboard</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <button onClick={onOpenReport} className="px-5 py-2.5 bg-ug-teal hover:bg-teal-600 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-ug-teal/10">
            <Download size={15} />
            <span>Generate Report</span>
          </button>
          <button onClick={exportMetrics} className="px-4 py-2.5 bg-[#1a1a4b] hover:bg-[#1a1a4b]/90 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between h-32 hover:border-ug-teal/30 transition">
            <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{stat.label}</span>
            <div>
              <h3 className={`text-3xl font-bold ${stat.color} leading-none tracking-tight`}>{stat.value}</h3>
              <span className="text-[11px] text-gray-500 font-bold">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-base font-bold text-ug-navy">Disclosure Views vs Expression of Interest (EOI) Clicks</h3>
            <p className="text-[11px] font-semibold text-ug-teal tracking-wide mt-0.5">Recorded engagement data</p>
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
            <p className="max-w-sm text-xs font-medium leading-relaxed text-gray-400">Historical engagement data is not available yet. This chart will populate when dated view and EOI events are recorded.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 text-ug-navy mb-1">
              <Globe size={18} className="text-ug-teal" />
              <h3 className="text-base font-bold text-ug-navy">Geographic Visitor Trends</h3>
            </div>
            <p className="text-[11px] font-semibold text-ug-teal tracking-wide">No visitor location data collected</p>
          </div>
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
            <p className="max-w-xs text-xs font-medium leading-relaxed text-gray-400">Geographic visitor analytics are unavailable because visitor location data is not currently collected.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-ug-navy mb-1">
            <Search size={18} className="text-ug-teal" />
            <h3 className="text-base font-bold text-ug-navy">Top Search Queries & Alert Keywords</h3>
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
            <p className="max-w-sm text-xs font-medium leading-relaxed text-gray-400">Search and alert analytics are not available yet. No query events are currently stored.</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-ug-navy mb-1">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="text-base font-bold text-ug-navy">Most Engaged Research Disclosures</h3>
          </div>
          <p className="text-[11px] font-semibold text-ug-teal tracking-wide">Ranked by Views & EOIs</p>
          <div className="space-y-3">
            {[...projects]
              .sort((a, b) => (b.views ?? 0) - (a.views ?? 0) || (b.expressions_of_interest ?? 0) - (a.expressions_of_interest ?? 0))
              .slice(0, 5)
              .map((project, index) => (
                <div key={project.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 hover:bg-gray-100/60 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-ug-navy text-white text-[11px] font-semibold flex items-center justify-center shrink-0">#{index + 1}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-ug-navy truncate">{project.title}</h4>
                      <span className="text-[11px] font-bold text-gray-400 block truncate">{project.research_area}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">{project.views ?? 0} views</span>
                    <span className="text-ug-teal bg-ug-teal/10 px-2 py-1 rounded-lg border border-ug-teal/20">{project.expressions_of_interest ?? 0} EOIs</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
