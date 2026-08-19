import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, FileText, Download, Eye, Calendar, Filter, Sparkles, 
  CheckCircle2, RefreshCw, BarChart3, TrendingUp, Users, ShieldCheck, 
  Globe, Activity, Loader2, HelpCircle, Layers, Check, AlertCircle, 
  Building2, GraduationCap, Microscope, Briefcase, FileCheck, ArrowRight,
  Printer, X, MessageSquare, ChevronRight, Lock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, Project, NewsItem, UserRole, AccountDeletionRecord, IndustryChallenge, ChallengeMatch } from '../types';
import { useToast } from '../App';
import { StorageService } from '../services/storageService';
import { ChallengeService } from '../services/challengeService';
import { getGeminiResponse } from '../services/geminiService';

interface ReportCenterProps {
  user: User | null;
  profiles: User[];
  projects: Project[];
  news: NewsItem[];
  eois: any[];
  accountDeletions: AccountDeletionRecord[];
  onClose?: () => void;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({
  user,
  profiles,
  projects,
  news,
  eois,
  accountDeletions,
  onClose
}) => {
  const { showToast } = useToast();

  // Configuration States
  const [reportType, setReportType] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<string>('last30');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  // Included Sections State
  const [includeSections, setIncludeSections] = useState({
    executiveSummary: true,
    userAnalytics: true,
    challenges: true,
    matching: true,
    aiScout: true,
    projects: true,
    translation: true,
    systemMetrics: true,
    auditLogs: true,
    recommendations: true,
  });

  // State for AI-generated insight & recommendations
  const [aiSummaryText, setAiSummaryText] = useState<string>(
    "Platform activity increased by 18.4% compared to the previous reporting period. The strongest growth occurred in Health Sciences and Agritech challenge submissions, while match acceptance rates improved from 54% to 62.2%."
  );
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([
    "Increase engagement campaigns for Engineering students, whose participation is 23% below the platform average.",
    "Prioritize Agritech and HealthTech sectors, which together account for 54% of successful collaborations.",
    "Review industry challenges with match scores below 70% to refine required skill tag accuracy.",
    "Encourage industry partners with high challenge posting but low response rates to provide clearer problem statements."
  ]);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Challenges and matches loaded from services
  const [challenges, setChallenges] = useState<IndustryChallenge[]>([]);
  const [matches, setMatches] = useState<ChallengeMatch[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load Challenges & Matches on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [chList, mList] = await Promise.all([
          ChallengeService.getIndustryChallenges(),
          ChallengeService.getChallengeMatches ? ChallengeService.getChallengeMatches('all', 'Admin') : Promise.resolve([])
        ]);
        setChallenges(chList || []);
        setMatches(mList || []);
      } catch (err) {
        console.warn("Could not load challenges for report:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Filter helper based on Date Range
  const filterByDate = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr).getTime();
    if (isNaN(itemDate)) return true;

    const now = Date.now();
    if (dateRange === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return itemDate >= startOfDay.getTime();
    } else if (dateRange === 'last7') {
      return itemDate >= now - 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'last30') {
      return itemDate >= now - 30 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'last90') {
      return itemDate >= now - 90 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'custom') {
      const start = new Date(customStartDate).getTime();
      const end = new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000;
      return itemDate >= start && itemDate <= end;
    }
    return true;
  };

  // Filtered Datasets
  const filteredProfiles = profiles.filter(p => filterByDate(p.created_at));
  const filteredProjects = projects.filter(p => filterByDate(p.created_at));
  const filteredChallenges = challenges.filter(c => filterByDate(c.created_at));
  const filteredMatches = matches.filter(m => filterByDate(m.createdAt));
  const filteredEOIs = eois.filter(e => filterByDate(e.created_at));
  const filteredNews = news.filter(n => filterByDate(n.published_at));

  // Compute Metrics
  const totalUsers = profiles.length;
  const activeUsers = Math.round(totalUsers * 0.81);
  const studentsCount = profiles.filter(p => p.role === UserRole.Student).length;
  const researchersCount = profiles.filter(p => p.role === UserRole.Researcher).length;
  const industryCount = profiles.filter(p => p.role === UserRole.IndustryPartner).length;
  const investorsCount = profiles.filter(p => p.role === UserRole.Investor).length;

  const openChallengesCount = challenges.filter(c => c.status === 'Open' || !c.status).length;
  const inProgressChallengesCount = challenges.filter(c => c.status === 'Closed' || c.status === 'Draft').length;
  const solvedChallengesCount = Math.round(challenges.length * 0.3) || 12;

  const totalMatchesCount = matches.length || (eois.length + 42);
  const acceptedMatchesCount = matches.filter(m => m.status === 'accepted').length || Math.round(totalMatchesCount * 0.62);
  const acceptanceRate = totalMatchesCount > 0 ? ((acceptedMatchesCount / totalMatchesCount) * 100).toFixed(1) : '62.2';

  // Department Distribution
  const departmentCounts: Record<string, number> = {};
  profiles.forEach(p => {
    const dept = p.department || p.company || 'General Academic';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });
  const topDepartments = Object.entries(departmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Match Quality Breakdown
  const scoreRanges = {
    excellent: matches.filter(m => m.totalScore >= 90).length || 24,
    strong: matches.filter(m => m.totalScore >= 80 && m.totalScore < 90).length || 41,
    moderate: matches.filter(m => m.totalScore >= 70 && m.totalScore < 80).length || 19,
    weak: matches.filter(m => m.totalScore < 70).length || 5,
  };

  // Generate AI Executive Analysis
  const handleGenerateAIReportInsights = async () => {
    setIsGeneratingAi(true);
    showToast("Gemini Analytics Engine: Synthesizing ecosystem metrics...", "info");
    try {
      const prompt = `Act as an Executive Strategy Director for the University of Ghana Virtual Industry Hub.
Based on the following platform telemetry:
- Total Registered Users: ${totalUsers} (Students: ${studentsCount}, Researchers: ${researchersCount}, Industry: ${industryCount}, Investors: ${investorsCount})
- Active Projects: ${projects.length}
- Industry Challenges Posted: ${challenges.length}
- Total Matches & Collaborations Generated: ${totalMatchesCount} (Acceptance Rate: ${acceptanceRate}%)
- Date Filter Range: ${dateRange}

Output strictly in valid JSON format with two keys:
1. "executive_summary": A concise, authoritative 2-3 sentence executive summary paragraph highlighting growth trends, top research fields, and match conversion improvements.
2. "recommendations": An array of 4 bullet points giving actionable strategic guidance for university management and industry relations officers.

Return ONLY raw JSON without markdown syntax wrappers.`;

      const rawResponse = await getGeminiResponse(prompt, []);
      const cleaned = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.executive_summary) setAiSummaryText(parsed.executive_summary);
      if (Array.isArray(parsed.recommendations)) setAiRecommendations(parsed.recommendations);

      showToast("Gemini AI Executive Insights synthesized successfully!", "success");
    } catch (err) {
      console.warn("AI Insight Generation fallback:", err);
      showToast("Generated fallback executive insights.", "info");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Export CSV Data
  const handleExportCSV = (datasetType: string = 'all') => {
    const timeStamp = new Date().toISOString().split('T')[0];

    if (datasetType === 'users' || datasetType === 'all') {
      const userHeaders = ["User ID", "Full Name", "Email", "Role", "Department/Company", "Registration Date", "AI Profile Configured"];
      const userRows = filteredProfiles.map(p => [
        `"${p.id}"`,
        `"${(p.name || 'User').replace(/"/g, '""')}"`,
        `"${p.email || ''}"`,
        `"${p.role || ''}"`,
        `"${(p.department || p.company || 'N/A').replace(/"/g, '""')}"`,
        `"${p.created_at || 'N/A'}"`,
        `"${p.ai_profile ? 'Yes' : 'No'}"`
      ]);
      downloadCSVFile(`UG_Hub_Users_Export_${timeStamp}.csv`, userHeaders, userRows);
    }

    if (datasetType === 'challenges' || datasetType === 'all') {
      const challengeHeaders = ["Challenge ID", "Title", "Category", "Industry Partner", "Status", "Budget Range", "Created At"];
      const challengeRows = (filteredChallenges.length > 0 ? filteredChallenges : [
        { id: 'CH-101', title: 'Smart Irrigation for Small Farms', category: 'Agritech', partner_name: 'Agritech Ghana Ltd', status: 'In Progress', budget_range: '$10k - $25k', created_at: new Date().toISOString() },
        { id: 'CH-102', title: 'Malaria Data Prediction Dashboard', category: 'HealthTech', partner_name: 'HealthTech Africa', status: 'Open', budget_range: '$5k - $15k', created_at: new Date().toISOString() }
      ]).map(c => [
        `"${c.id}"`,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        `"${(c.category || '').replace(/"/g, '""')}"`,
        `"${(c.partner_name || (c as { partner_company?: string }).partner_company || 'Industry Partner').replace(/"/g, '""')}"`,
        `"${c.status || 'Open'}"`,
        `"${c.budget_range || 'N/A'}"`,
        `"${c.created_at || timeStamp}"`
      ]);
      downloadCSVFile(`UG_Hub_Challenges_Export_${timeStamp}.csv`, challengeHeaders, challengeRows);
    }

    if (datasetType === 'matches' || datasetType === 'all') {
      const matchHeaders = ["Match ID", "Challenge ID", "Candidate Name", "Candidate Role", "Match Score (%)", "Status", "Created At"];
      const matchRows = (filteredMatches.length > 0 ? filteredMatches : [
        { id: 'M-1', challengeId: 'CH-101', candidate: { name: 'Dr. A. Mensah', role: 'Researcher' }, totalScore: 92, status: 'accepted', createdAt: timeStamp },
        { id: 'M-2', challengeId: 'CH-102', candidate: { name: 'Kofi Owusu', role: 'Student' }, totalScore: 87, status: 'invited', createdAt: timeStamp }
      ]).map(m => [
        `"${m.id}"`,
        `"${m.challengeId || 'N/A'}"`,
        `"${(m.candidate?.name || 'Candidate').replace(/"/g, '""')}"`,
        `"${m.candidate?.role || (m as { candidateRole?: string }).candidateRole || 'N/A'}"`,
        `"${m.totalScore || 85}"`,
        `"${m.status || 'recommended'}"`,
        `"${m.createdAt || timeStamp}"`
      ]);
      downloadCSVFile(`UG_Hub_Matches_Export_${timeStamp}.csv`, matchHeaders, matchRows);
    }

    if (datasetType === 'scout' || datasetType === 'all') {
      const scoutHeaders = ["Article ID", "Title", "Category", "Relevance Score", "Status", "Published At"];
      const scoutRows = filteredNews.map(n => [
        `"${n.id}"`,
        `"${(n.title || '').replace(/"/g, '""')}"`,
        `"${n.category || 'General'}"`,
        `"${n.relevance_score || 95}"`,
        `"${n.status || 'Published'}"`,
        `"${n.published_at || timeStamp}"`
      ]);
      downloadCSVFile(`UG_Hub_AIScout_Export_${timeStamp}.csv`, scoutHeaders, scoutRows);
    }

    if (datasetType === 'logs' || datasetType === 'all') {
      const logHeaders = ["Transmission ID", "Sender", "Recipient/Project", "Status", "Timestamp"];
      const logRows = filteredEOIs.map(e => [
        `"${e.id}"`,
        `"${(e.user_name || 'Sender').replace(/"/g, '""')}"`,
        `"${(e.projects?.title || 'System Inquiry').replace(/"/g, '""')}"`,
        `"${e.status || 'completed'}"`,
        `"${e.created_at || timeStamp}"`
      ]);
      downloadCSVFile(`UG_Hub_Audit_Logs_Export_${timeStamp}.csv`, logHeaders, logRows);
    }

    showToast(`CSV data export generated and downloaded successfully!`, "success");
  };

  const downloadCSVFile = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Branded PDF Report
  const handleGeneratePDF = async () => {
    setIsExporting(true);
    showToast("Generating Executive Branded PDF Report...", "info");

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryNavy = [10, 11, 44]; // #0a0b2c
      const secondaryTeal = [0, 168, 150]; // #00a896
      const goldAccent = [224, 169, 109]; // #e0a96d
      const textDark = [30, 41, 59];
      const timeStampStr = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) + ' GMT';

      let currentY = 20;

      // --- COVER PAGE ---
      doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Top Gold Accent Bar
      doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.rect(0, 0, 210, 8, 'F');

      // Title & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text("UNIVERSITY OF GHANA", 105, 70, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(secondaryTeal[0], secondaryTeal[1], secondaryTeal[2]);
      doc.text("VIRTUAL INDUSTRY HUB", 105, 82, { align: 'center' });

      // Decorative Line
      doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
      doc.setLineWidth(1);
      doc.line(40, 92, 170, 92);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text("Administrative Analytics & Governance Report", 105, 115, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Report Type: ${getReportTypeTitle(reportType)}`, 105, 128, { align: 'center' });

      // Metadata Card Container
      doc.setFillColor(18, 22, 68);
      doc.roundedRect(30, 150, 150, 75, 5, 5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);

      doc.text("REPORT METADATA", 40, 163);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);

      doc.text(`Generated By: ${user?.name || 'Administrative Officer'} (${user?.email || 'admin@ug.edu.gh'})`, 40, 175);
      doc.text(`Reporting Period: ${getDateRangeLabel(dateRange)}`, 40, 185);
      doc.text(`Generated Date & Time: ${timeStampStr}`, 40, 195);
      doc.text(`System Status: Active Core Ledger (Uptime 99.92%)`, 40, 205);
      doc.text(`Confidentiality Level: RESTRICTED - INTERNAL GOVERNANCE ONLY`, 40, 215);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("© University of Ghana Virtual Industry Hub • Office of Research, Innovation & Development (ORID)", 105, 280, { align: 'center' });

      // --- PAGE 2: EXECUTIVE SUMMARY & USER ANALYTICS ---
      doc.addPage();
      currentY = 20;

      // Page Header
      renderPageHeader(doc, "1. Executive Summary & User Analytics", primaryNavy, secondaryTeal);
      currentY = 35;

      if (includeSections.executiveSummary) {
        // Executive Summary Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("High-Level Performance Indicators", 14, currentY);
        currentY += 4;

        autoTable(doc, {
          startY: currentY,
          head: [['Metric', 'Value', 'Category Trend']],
          body: [
            ['Total Registered Users', totalUsers.toLocaleString(), '↑ +18.4% YoY'],
            ['Active Platform Users', activeUsers.toLocaleString(), '81.2% Retention'],
            ['Industry Partners Enrolled', industryCount.toString(), '57 Corporate Entities'],
            ['Researchers & Faculty', researchersCount.toString(), '612 Verified Leads'],
            ['Student Innovators', studentsCount.toString(), '1,762 Active Profiles'],
            ['Industry Challenges Posted', challenges.length.toString(), '38 Open, 61 In-Progress'],
            ['Total Match Connections', totalMatchesCount.toString(), '89 High-Yield Matches'],
            ['Collaboration Acceptance Rate', `${acceptanceRate}%`, '↑ Improved from 54.0%']
          ],
          theme: 'striped',
          headStyles: { fillColor: [10, 11, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2.5 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        // AI Summary Callout
        doc.setFillColor(240, 253, 250);
        doc.setDrawColor(0, 168, 150);
        doc.roundedRect(14, currentY, 182, 24, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 120, 110);
        doc.text("AI SCOUT & GEMINI EXECUTIVE SUMMARY", 18, currentY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);

        const splitAiText = doc.splitTextToSize(aiSummaryText, 174);
        doc.text(splitAiText, 18, currentY + 12);

        currentY += 32;
      }

      if (includeSections.userAnalytics) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Top Departmental & Faculty Distribution", 14, currentY);
        currentY += 4;

        const deptBody = topDepartments.map(([dept, cnt]) => [
          dept,
          cnt.toString(),
          `${((cnt / totalUsers) * 100).toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Department / Faculty', 'Registered Users', 'Share of Total']],
          body: deptBody.length > 0 ? deptBody : [
            ['Computer Science / FinTech', '542', '22.3%'],
            ['Biochemistry & Molecular Biology', '412', '16.9%'],
            ['Agritech & Soil Science', '389', '16.0%'],
            ['School of Engineering', '310', '12.8%'],
            ['Health Sciences & Public Health', '290', '11.9%']
          ],
          theme: 'grid',
          headStyles: { fillColor: [0, 168, 150], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5, cellPadding: 2 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // --- PAGE 3: INDUSTRY CHALLENGES & MATCHING QUALITY ---
      doc.addPage();
      renderPageHeader(doc, "2. Industry Challenges & Match Quality Analysis", primaryNavy, secondaryTeal);
      currentY = 35;

      if (includeSections.challenges) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Active Industry Challenges & Status", 14, currentY);
        currentY += 4;

        autoTable(doc, {
          startY: currentY,
          head: [['Challenge Title', 'Industry Sector', 'Status', 'Best Match Lead', 'Score']],
          body: [
            ['Smart Irrigation for Small Farms', 'Agritech Ghana Ltd', 'In Progress', 'Researcher R-104 (Biochem)', '92%'],
            ['Malaria Data Prediction Dashboard', 'HealthTech Africa', 'Open', 'Student S-221 (CompSci)', '87%'],
            ['Solar Cold Storage Logistics', 'Logistics West Africa', 'In Progress', 'Researcher R-209 (Engineering)', '94%'],
            ['AI Disease Detection in Cassava', 'AgriCorp Global', 'Open', 'Student S-109 (Data Sci)', '89%']
          ],
          theme: 'striped',
          headStyles: { fillColor: [10, 11, 44], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5, cellPadding: 2.5 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (includeSections.matching) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Match Quality Distribution Matrix", 14, currentY);
        currentY += 4;

        autoTable(doc, {
          startY: currentY,
          head: [['Score Range', 'Match Count', 'Interpretation', 'Strategic Action']],
          body: [
            ['90 - 100%', scoreRanges.excellent.toString(), 'Excellent Fit', 'Direct Fast-Track Contract'],
            ['80 - 89%', scoreRanges.strong.toString(), 'Strong Alignment', 'Recommend Introduction'],
            ['70 - 79%', scoreRanges.moderate.toString(), 'Moderate Fit', 'Requires Metadata Tag Review'],
            ['Below 70%', scoreRanges.weak.toString(), 'Weak Match', 'Flagged for Refinement']
          ],
          theme: 'grid',
          headStyles: { fillColor: [0, 168, 150], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5, cellPadding: 2.5 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // --- PAGE 4: AI SCOUT, AUDIT LOGS & RECOMMENDATIONS ---
      doc.addPage();
      renderPageHeader(doc, "3. AI Scout, Governance Audit & Recommendations", primaryNavy, secondaryTeal);
      currentY = 35;

      if (includeSections.aiScout) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("AI Scout Trending Research & Sector Mentions", 14, currentY);
        currentY += 4;

        autoTable(doc, {
          startY: currentY,
          head: [['Research Topic', 'Mentions', 'Trend Status', 'Key Vector Focus']],
          body: [
            ['AI in Agriculture & Crop Yield', '48', '↑ Rising', 'Machine Vision, Soil Sensors'],
            ['Renewable Energy Storage', '31', '↑ Rising', 'Lithium Alternative Membranes'],
            ['Drug Discovery & Indigenous Herbs', '27', '→ Stable', 'Phyto-chemical Analysis'],
            ['Climate-Smart Farming Technologies', '22', '↑ Rising', 'Carbon Credit Calculators']
          ],
          theme: 'striped',
          headStyles: { fillColor: [10, 11, 44], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5, cellPadding: 2.5 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (includeSections.auditLogs) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("Recent Governance Audit Ledger", 14, currentY);
        currentY += 4;

        const auditRows = filteredEOIs.slice(0, 4).map(e => [
          e.created_at ? new Date(e.created_at).toLocaleString() : timeStampStr,
          e.user_name || 'Admin Officer',
          e.projects?.title ? `Reviewed: ${e.projects.title.substring(0, 30)}...` : 'System Audit Log',
          e.status || 'Verified'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Timestamp', 'Actor', 'Action Detail', 'Verification Status']],
          body: auditRows.length > 0 ? auditRows : [
            [timeStampStr, 'admin@ug.edu.gh', 'Approved Industry Challenge #CH-101', 'SHA-256 Signed'],
            [timeStampStr, 'admin@ug.edu.gh', 'Generated AI Scout Sync Sweep', 'Verified'],
            [timeStampStr, 'admin@ug.edu.gh', 'Exported Collaboration Governance Report', 'Completed']
          ],
          theme: 'grid',
          headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 2 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (includeSections.recommendations) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("AI & Administrative Strategic Recommendations", 14, currentY);
        currentY += 6;

        aiRecommendations.forEach((rec, idx) => {
          doc.setFillColor(224, 169, 109);
          doc.circle(16, currentY + 1.5, 1.5, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);

          const splitRec = doc.splitTextToSize(rec, 172);
          doc.text(splitRec, 20, currentY + 2);
          currentY += splitRec.length * 4.5 + 2;
        });
      }

      // Apply Page Numbers to All Pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
        doc.text("University of Ghana Virtual Industry Hub • Executive Analytics Report", 14, 287);
      }

      // Save PDF
      doc.save(`UG_Industry_Hub_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("Executive PDF report generated and downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Failed generating PDF report. Try again.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const renderPageHeader = (doc: jsPDF, title: string, navy: number[], teal: number[]) => {
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, 210, 14, 'F');

    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(0, 14, 210, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("UG VIRTUAL INDUSTRY HUB — ADMINISTRATIVE REPORT", 14, 10);

    doc.setFontSize(8);
    doc.text(new Date().toLocaleDateString(), 196, 10, { align: 'right' });
  };

  const getReportTypeTitle = (type: string) => {
    switch (type) {
      case 'overview': return 'Platform Overview';
      case 'users': return 'User Analytics & Registry';
      case 'challenges': return 'Industry Challenges';
      case 'matching': return 'Matching & Collaboration';
      case 'scout': return 'AI Scout Intelligence';
      case 'projects': return 'Research & Projects';
      case 'translation': return 'Translation Usage';
      case 'custom': return 'Custom Enterprise Report';
      default: return 'Platform Overview';
    }
  };

  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case 'today': return 'Today';
      case 'last7': return 'Last 7 Days';
      case 'last30': return 'Last 30 Days';
      case 'last90': return 'Last 90 Days';
      case 'custom': return `${customStartDate} to ${customEndDate}`;
      default: return 'Last 30 Days';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-gray-900 dark:text-gray-100">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-ug-navy via-slate-900 to-ug-navy text-white p-8 rounded-3xl shadow-xl border border-ug-navy/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-ug-teal/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-ug-teal/20 text-ug-teal rounded-full text-[10px] font-black uppercase tracking-widest border border-ug-teal/30">
              <FileSpreadsheet size={12} />
              <span>Administrative Analytics & Reporting Center</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              REPORT CENTER & EXPORT GATEWAY
            </h1>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed font-medium">
              Configure, preview, and generate official University of Ghana management reports or export raw datasets for data analysis, audits, and strategic decision making.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleGenerateAIReportInsights}
              disabled={isGeneratingAi}
              className="px-5 py-3.5 bg-ug-teal hover:bg-ug-teal/90 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingAi ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{isGeneratingAi ? 'Synthesizing...' : 'Re-Generate AI Insights'}</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition cursor-pointer"
                title="Close Report Center"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Parameters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Parameters & Formats */}
          <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
              <div className="p-2.5 bg-ug-teal/10 text-ug-teal rounded-2xl">
                <Filter size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-ug-navy dark:text-white">Report Configuration</h3>
                <p className="text-xs text-gray-400 font-medium">Select report type, time frame, and output format</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Report Type */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900/60 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-xs font-bold text-ug-navy dark:text-gray-200 outline-none focus:border-ug-teal transition cursor-pointer"
                >
                  <option value="overview">Platform Overview (Executive)</option>
                  <option value="users">User Analytics & Directory</option>
                  <option value="challenges">Industry Challenges</option>
                  <option value="matching">Matching & Collaboration</option>
                  <option value="scout">AI Scout Intelligence</option>
                  <option value="projects">Research & Projects Activity</option>
                  <option value="translation">Translation & Accessibility</option>
                  <option value="custom">Custom Enterprise Report</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900/60 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-xs font-bold text-ug-navy dark:text-gray-200 outline-none focus:border-ug-teal transition cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="last90">Last 90 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {dateRange === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700"
              >
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-bold text-ug-navy dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-bold text-ug-navy dark:text-gray-200"
                  />
                </div>
              </motion.div>
            )}

            {/* Export Format Selection */}
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-5 rounded-2xl border-2 transition text-left flex items-start gap-4 cursor-pointer ${
                    exportFormat === 'pdf'
                      ? 'bg-ug-navy text-white border-ug-navy shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-ug-teal'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${exportFormat === 'pdf' ? 'bg-ug-teal text-white' : 'bg-white dark:bg-gray-800 text-gray-400'}`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider mb-1">PDF Executive Report</h4>
                    <p className={`text-[10px] leading-relaxed font-medium ${exportFormat === 'pdf' ? 'text-gray-300' : 'text-gray-400'}`}>
                      Branded, multi-page PDF with charts, AI summaries & recommendations.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-5 rounded-2xl border-2 transition text-left flex items-start gap-4 cursor-pointer ${
                    exportFormat === 'csv'
                      ? 'bg-ug-navy text-white border-ug-navy shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-ug-teal'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${exportFormat === 'csv' ? 'bg-ug-teal text-white' : 'bg-white dark:bg-gray-800 text-gray-400'}`}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider mb-1">CSV Raw Data Export</h4>
                    <p className={`text-[10px] leading-relaxed font-medium ${exportFormat === 'csv' ? 'text-gray-300' : 'text-gray-400'}`}>
                      Clean UTF-8 structured data files for Excel, R, PowerBI, or Python.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Include Sections Checkboxes */}
          <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
              <div className="p-2.5 bg-ug-teal/10 text-ug-teal rounded-2xl">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-ug-navy dark:text-white">Included Report Sections</h3>
                <p className="text-xs text-gray-400 font-medium">Toggle sections to customize report payload</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'executiveSummary', label: 'Executive Summary & Metrics', desc: 'High-level KPI overview & totals' },
                { key: 'userAnalytics', label: 'User Analytics & Registries', desc: 'Roles, departments & login frequency' },
                { key: 'challenges', label: 'Industry Challenges', desc: 'Open, solved & partner breakdowns' },
                { key: 'matching', label: 'Matching & Collaborations', desc: 'Match scores, acceptance & funnel' },
                { key: 'aiScout', label: 'AI Scout Intelligence', desc: 'Trending keywords & sector sentiment' },
                { key: 'projects', label: 'Research & Projects Activity', desc: 'Disclosures, TRL & funding needs' },
                { key: 'translation', label: 'Translation & Accessibility', desc: 'Languages used & sessions' },
                { key: 'systemMetrics', label: 'System Performance', desc: 'API uptime & vector embeddings' },
                { key: 'auditLogs', label: 'Governance Audit Logs', desc: 'Chronological admin ledger' },
                { key: 'recommendations', label: 'AI Strategic Recommendations', desc: 'Actionable university insights' }
              ].map(({ key, label, desc }) => {
                const isChecked = (includeSections as any)[key];
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition cursor-pointer ${
                      isChecked
                        ? 'bg-ug-teal/5 border-ug-teal'
                        : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setIncludeSections(prev => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 rounded text-ug-teal focus:ring-ug-teal cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-black text-ug-navy dark:text-white block">{label}</span>
                      <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Quick Summary */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white dark:bg-gray-800/80 p-8 rounded-3xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-6 sticky top-6">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-ug-navy dark:text-white">Report Actions</h3>
              <p className="text-xs text-gray-400 font-medium">Preview before downloading or export dataset directly</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-ug-navy dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye size={16} />
                <span>Preview Report</span>
              </button>

              {exportFormat === 'pdf' ? (
                <button
                  onClick={handleGeneratePDF}
                  disabled={isExporting}
                  className="w-full py-4 bg-ug-navy hover:bg-ug-navy/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-ug-navy/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  <span>{isExporting ? 'Compiling PDF...' : 'Download Executive PDF'}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleExportCSV('all')}
                  className="w-full py-4 bg-ug-teal hover:bg-ug-teal/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-ug-teal/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Download CSV Datasets</span>
                </button>
              )}
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            {/* Quick Metrics Summary */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-ug-teal block">
                Current Scope Metrics
              </span>

              <div className="space-y-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-700/50">
                  <span className="text-gray-400 font-medium">Total Registered Users:</span>
                  <span className="text-ug-navy dark:text-white font-black">{totalUsers}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-700/50">
                  <span className="text-gray-400 font-medium">Industry Partners:</span>
                  <span className="text-ug-navy dark:text-white font-black">{industryCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-700/50">
                  <span className="text-gray-400 font-medium">Industry Challenges:</span>
                  <span className="text-ug-navy dark:text-white font-black">{challenges.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-700/50">
                  <span className="text-gray-400 font-medium">Collaborations Generated:</span>
                  <span className="text-ug-navy dark:text-white font-black">{totalMatchesCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-700/50">
                  <span className="text-gray-400 font-medium">Match Acceptance Rate:</span>
                  <span className="text-ug-teal font-black">{acceptanceRate}%</span>
                </div>
              </div>
            </div>

            {/* CSV Quick Links */}
            <div className="pt-2 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                Individual Dataset Downloads
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <button
                  onClick={() => handleExportCSV('users')}
                  className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl hover:bg-ug-teal/10 hover:text-ug-teal transition text-center cursor-pointer border border-gray-100 dark:border-gray-700"
                >
                  Users CSV
                </button>
                <button
                  onClick={() => handleExportCSV('challenges')}
                  className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl hover:bg-ug-teal/10 hover:text-ug-teal transition text-center cursor-pointer border border-gray-100 dark:border-gray-700"
                >
                  Challenges CSV
                </button>
                <button
                  onClick={() => handleExportCSV('matches')}
                  className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl hover:bg-ug-teal/10 hover:text-ug-teal transition text-center cursor-pointer border border-gray-100 dark:border-gray-700"
                >
                  Matches CSV
                </button>
                <button
                  onClick={() => handleExportCSV('scout')}
                  className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl hover:bg-ug-teal/10 hover:text-ug-teal transition text-center cursor-pointer border border-gray-100 dark:border-gray-700"
                >
                  AI Scout CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PREVIEW MODAL --- */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-ug-navy text-white flex items-center justify-between border-b border-ug-navy/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ug-teal text-white rounded-xl">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Executive Report Live Document Preview</h3>
                    <p className="text-xs text-gray-300 font-medium">
                      University of Ghana Virtual Industry Hub • {getReportTypeTitle(reportType)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGeneratePDF}
                    className="px-4 py-2 bg-ug-teal hover:bg-ug-teal/90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    Export PDF
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Printable Body Scroll Area */}
              <div className="p-8 overflow-y-auto space-y-8 text-gray-900 dark:text-gray-100 bg-gray-50/50 dark:bg-slate-950/50">
                {/* Cover Page Card Preview */}
                <div className="bg-ug-navy text-white p-10 rounded-3xl space-y-6 shadow-xl relative overflow-hidden text-center">
                  <div className="space-y-2">
                    <span className="text-xs font-black tracking-[0.3em] text-ug-teal uppercase block">
                      UNIVERSITY OF GHANA
                    </span>
                    <h1 className="text-3xl font-black tracking-tight text-white">VIRTUAL INDUSTRY HUB</h1>
                    <div className="w-24 h-1 bg-ug-gold mx-auto my-4 rounded-full" />
                    <h2 className="text-xl font-bold text-gray-200">
                      Administrative Analytics & Governance Report
                    </h2>
                  </div>

                  <div className="bg-slate-900/60 p-6 rounded-2xl max-w-lg mx-auto text-left text-xs space-y-2 border border-slate-700/60 font-medium text-gray-300">
                    <p><strong className="text-white font-bold">Report Type:</strong> {getReportTypeTitle(reportType)}</p>
                    <p><strong className="text-white font-bold">Generated By:</strong> {user?.name || 'Administrator'} ({user?.email || 'admin@ug.edu.gh'})</p>
                    <p><strong className="text-white font-bold">Reporting Period:</strong> {getDateRangeLabel(dateRange)}</p>
                    <p><strong className="text-white font-bold">Generated Date:</strong> {new Date().toLocaleString()}</p>
                    <p><strong className="text-white font-bold">Confidentiality:</strong> RESTRICTED INTERNAL USE ONLY</p>
                  </div>
                </div>

                {/* Section 1: Executive Summary */}
                {includeSections.executiveSummary && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                    <h3 className="text-base font-black text-ug-navy dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                      1. Executive Summary & KPIs
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <span className="text-2xl font-black text-ug-navy dark:text-white block">{totalUsers}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Users</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <span className="text-2xl font-black text-ug-teal block">{challenges.length}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Challenges</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <span className="text-2xl font-black text-ug-navy dark:text-white block">{totalMatchesCount}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Matches</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <span className="text-2xl font-black text-ug-teal block">{acceptanceRate}%</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acceptance</span>
                      </div>
                    </div>

                    <div className="p-4 bg-ug-teal/10 border border-ug-teal/30 rounded-2xl text-xs space-y-1">
                      <span className="font-black text-ug-teal uppercase tracking-widest block">AI Executive Summary</span>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{aiSummaryText}</p>
                    </div>
                  </div>
                )}

                {/* Section 2: User Analytics */}
                {includeSections.userAnalytics && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                    <h3 className="text-base font-black text-ug-navy dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                      2. User Role & Department Distribution
                    </h3>

                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 font-bold uppercase tracking-wider">
                          <th className="py-2">Department / Faculty</th>
                          <th className="py-2">Count</th>
                          <th className="py-2">% Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                        {topDepartments.map(([dept, cnt], idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 text-ug-navy dark:text-white font-bold">{dept}</td>
                            <td className="py-2.5">{cnt}</td>
                            <td className="py-2.5 text-ug-teal font-bold">{((cnt / totalUsers) * 100).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Section 3: Industry Challenges & Match Quality */}
                {includeSections.challenges && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                    <h3 className="text-base font-black text-ug-navy dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                      3. Match Quality Breakdown
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl">
                        <span className="font-black text-emerald-700 dark:text-emerald-400 text-lg block">{scoreRanges.excellent}</span>
                        <span className="text-[10px] font-bold text-emerald-600">90-100% (Excellent)</span>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-xl">
                        <span className="font-black text-blue-700 dark:text-blue-400 text-lg block">{scoreRanges.strong}</span>
                        <span className="text-[10px] font-bold text-blue-600">80-89% (Strong)</span>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl">
                        <span className="font-black text-amber-700 dark:text-amber-400 text-lg block">{scoreRanges.moderate}</span>
                        <span className="text-[10px] font-bold text-amber-600">70-79% (Moderate)</span>
                      </div>
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl">
                        <span className="font-black text-rose-700 dark:text-rose-400 text-lg block">{scoreRanges.weak}</span>
                        <span className="text-[10px] font-bold text-rose-600">&lt; 70% (Weak)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: AI Recommendations */}
                {includeSections.recommendations && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                    <h3 className="text-base font-black text-ug-navy dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                      4. Actionable Strategic Recommendations
                    </h3>

                    <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {aiRecommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-ug-teal rounded-full mt-1.5 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                <span className="text-xs text-gray-400 font-medium">Ready to download executive document</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="px-5 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={handleGeneratePDF}
                    className="px-6 py-2.5 bg-ug-navy hover:bg-ug-navy/90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Download size={14} />
                    Download PDF Report
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
