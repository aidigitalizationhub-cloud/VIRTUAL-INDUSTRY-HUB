import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, ArrowRight, Loader2, Bookmark, X, ChevronDown, RotateCcw, UserCheck, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../services/storageService';
import { Project, ProjectStatus, ResearchArea } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../App';
import { Tr } from '../components/Tr';
import { useTranslatedText } from '../services/translationService';

const Projects: React.FC = () => {
  const { t } = useTranslation();
  const searchProjectsPlaceholder = useTranslatedText("Search projects, topics, or researcher names...");
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedResearcher, setSelectedResearcher] = useState<string>('All');
  const [researcherQuery, setResearcherQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 6;
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        StorageService.getBookmarks(session.user.id).then(bookmarkedProjects => {
          setBookmarkedIds(bookmarkedProjects.map(p => p.id));
        });
      }
    });
  }, []);

  const handleToggleBookmark = async (projectId: string) => {
    if (!currentUser) {
      showToast("Authentication Required. Please log in to bookmark projects.", "error");
      return;
    }
    try {
      const result = await StorageService.toggleBookmark(currentUser.id, projectId);
      if (result) {
        setBookmarkedIds(prev => [...prev, projectId]);
        showToast("Project saved to bookmarks.", "success");
      } else {
        setBookmarkedIds(prev => prev.filter(id => id !== projectId));
        showToast("Project removed from bookmarks.", "info");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to toggle bookmark", "error");
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const data = await StorageService.getProjects();
        setProjects(data);

        // Check for track or researcher parameter in URL
        const trackParam = searchParams.get('track');
        if (trackParam && Object.values(ResearchArea).includes(trackParam as ResearchArea)) {
          setSelectedArea(trackParam);
        }
        
        const researcherParam = searchParams.get('researcher') || searchParams.get('author');
        if (researcherParam) {
          setSelectedResearcher(researcherParam);
        }
      } catch (err) {
        console.error("Projects Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [searchParams]);

  // Extract unique researchers from loaded projects
  const uniqueResearchers = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (p.owner_name && p.owner_name.trim() !== '') {
        names.add(p.owner_name.trim());
      }
    });
    return Array.from(names).sort();
  }, [projects]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedStatus, selectedResearcher, sortBy]);

  const filteredProjects = projects.filter(project => {
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch = project.title.toLowerCase().includes(sTerm) || 
                          project.description.toLowerCase().includes(sTerm) ||
                          project.department.toLowerCase().includes(sTerm) ||
                          (project.owner_name && project.owner_name.toLowerCase().includes(sTerm));

    const matchesArea = selectedArea === 'All' || project.research_area === selectedArea;
    const matchesStatus = selectedStatus === 'All' || project.status === selectedStatus;
    const matchesResearcher = selectedResearcher === 'All' || 
      (project.owner_name && project.owner_name.toLowerCase().includes(selectedResearcher.toLowerCase()));
    
    return matchesSearch && matchesArea && matchesStatus && matchesResearcher;
  });

  // Sorting Logic
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    if (sortBy === 'budget-desc') {
      const getBudgetValue = (bStr: string) => {
        const clean = bStr.replace(/[^0-9]/g, '');
        return clean ? parseInt(clean, 10) : 0;
      };
      return getBudgetValue(b.budget) - getBudgetValue(a.budget);
    }
    return 0;
  });

  // Pagination Calculations
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = sortedProjects.slice(indexOfFirstItem, indexOfLastItem);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Concept: return 'bg-gray-100 text-gray-800 border-gray-200';
      case ProjectStatus.ProofOfConcept: return 'bg-blue-50 text-blue-700 border-blue-100';
      case ProjectStatus.Prototype: return 'bg-purple-50 text-purple-700 border-purple-100';
      case ProjectStatus.Validation: return 'bg-orange-50 text-orange-700 border-orange-100';
      case ProjectStatus.Commercialization: return 'bg-ug-teal/10 text-ug-teal border-ug-teal/20';
      case ProjectStatus.MarketReady: return 'bg-green-50 text-green-700 border-green-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getThumbnail = (urlStr: string) => urlStr && urlStr.trim() !== '' ? urlStr.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80';

  const activeFiltersCount = [
    selectedArea !== 'All',
    selectedStatus !== 'All',
    selectedResearcher !== 'All',
    sortBy !== 'newest'
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-ug-navy tracking-tight"><Tr text="Research Pipeline" /></h1>
          <p className="mt-2 text-gray-600 font-medium text-lg"><Tr text="Browse groundbreaking research from University of Ghana scholars." /></p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 mb-8 relative">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={searchProjectsPlaceholder} 
              className="w-full pl-12 pr-28 sm:pr-36 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal focus:border-transparent transition-all font-bold text-gray-900 placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 py-2 px-3 sm:px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-ug-teal text-white shadow-sm'
                  : 'bg-ug-navy hover:bg-ug-teal text-white'
              }`}
            >
              <Filter size={14} className={showFilters ? 'scale-110' : ''} />
              <span className="hidden sm:inline"><Tr text="Filters" /></span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-white text-ug-navy rounded-full flex items-center justify-center text-[9px] font-black leading-none shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1"><Tr text="Active Filters:" /></span>
              
              {selectedResearcher !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ug-teal/10 text-ug-teal border border-ug-teal/20 text-xs font-bold">
                  <UserCheck size={13} />
                  <span><Tr text="Researcher:" /> {selectedResearcher}</span>
                  <button 
                    onClick={() => {
                      setSelectedResearcher('All');
                      setSearchParams(prev => { prev.delete('researcher'); return prev; });
                    }}
                    className="hover:bg-ug-teal/20 rounded-full p-0.5 transition cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedArea !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                  <span>{selectedArea}</span>
                  <button onClick={() => setSelectedArea('All')} className="hover:bg-blue-100 rounded-full p-0.5 transition cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedStatus !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                  <span>{selectedStatus}</span>
                  <button onClick={() => setSelectedStatus('All')} className="hover:bg-purple-100 rounded-full p-0.5 transition cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              <button 
                onClick={() => {
                  setSelectedArea('All');
                  setSelectedStatus('All');
                  setSelectedResearcher('All');
                  setSortBy('newest');
                  setSearchTerm('');
                  setSearchParams({});
                }}
                className="text-xs font-bold text-gray-400 hover:text-red-500 underline ml-2 cursor-pointer"
              >
                <Tr text="Clear All" />
              </button>
            </div>
          )}

          {/* Floating Dropdown Filter Panel */}
          {showFilters && (
            <div className="absolute right-4 md:right-6 top-full mt-3 w-[calc(100%-2rem)] sm:w-[460px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-5 z-50 transition-all duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-black uppercase tracking-widest text-ug-navy dark:text-white"><Tr text="Filter Research Pipeline" /></span>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <button 
                      onClick={() => {
                        setSelectedArea('All');
                        setSelectedStatus('All');
                        setSelectedResearcher('All');
                        setSortBy('newest');
                        setResearcherQuery('');
                      }}
                      className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      <Tr text="Reset" />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Search by Researcher / Author Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                    <User size={12} className="text-ug-teal" />
                    <Tr text="Search by Lead Researcher / Author" />
                  </label>
                  
                  {/* Researcher Select Dropdown */}
                  <div className="relative mb-2">
                    <select 
                      className="appearance-none w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 py-2.5 px-4 pr-10 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-ug-teal transition-all cursor-pointer"
                      value={selectedResearcher}
                      onChange={(e) => setSelectedResearcher(e.target.value)}
                    >
                      <option value="All">All Researchers & Authors</option>
                      {uniqueResearchers.map(rName => (
                        <option key={rName} value={rName}>{rName}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>

                  {/* Or Manual Name Input search */}
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Or type researcher name..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 py-2 px-3 text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-ug-teal"
                      value={researcherQuery}
                      onChange={(e) => {
                        setResearcherQuery(e.target.value);
                        setSelectedResearcher(e.target.value.trim() === '' ? 'All' : e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* Research track */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block"><Tr text="Research Track" /></label>
                  <div className="relative">
                    <select 
                      className="appearance-none w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 py-2.5 px-4 pr-10 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-ug-teal transition-all cursor-pointer"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      <option value="All">All Research Tracks</option>
                      {Object.values(ResearchArea).map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* Development stage */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block"><Tr text="Development Stage" /></label>
                  <div className="relative">
                    <select 
                      className="appearance-none w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 py-2.5 px-4 pr-10 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-ug-teal transition-all cursor-pointer"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      {Object.values(ProjectStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {/* Sort order */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block"><Tr text="Sort Projects" /></label>
                  <div className="relative">
                    <select 
                      className="appearance-none w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 py-2.5 px-4 pr-10 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-ug-teal transition-all cursor-pointer"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="budget-desc">Budget (High to Low)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-ug-navy hover:bg-ug-teal text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-sm cursor-pointer"
                >
                  <Tr text="Apply Filters" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
             <Loader2 className="animate-spin text-ug-teal mb-4" size={48} />
             <p className="text-gray-400 text-xs font-black uppercase tracking-widest"><Tr text="Loading scientific database..." /></p>
          </div>
        ) : (
          <>
            {/* Results Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentProjects.map((project) => (
                <div key={project.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full border border-gray-100 group animate-fade-in-up">
                  <div className="h-64 relative overflow-hidden">
                     <img 
                        src={getThumbnail(project.image_url)} 
                        alt={project.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                     {currentUser && (
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handleToggleBookmark(project.id);
                         }}
                         className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 z-10 ${
                           bookmarkedIds.includes(project.id) 
                             ? 'bg-ug-teal text-white scale-110' 
                             : 'bg-black/40 text-white/80 hover:text-white hover:bg-black/60 hover:scale-110'
                         }`}
                         title={bookmarkedIds.includes(project.id) ? "Remove Bookmark" : "Bookmark Project"}
                       >
                         <Bookmark size={18} className={bookmarkedIds.includes(project.id) ? 'fill-current' : ''} />
                       </button>
                     )}
                     <div className="absolute bottom-4 left-6 text-white">
                        <div className="text-xs opacity-90 font-bold uppercase tracking-widest"><Tr text={project.department} /></div>
                     </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight group-hover:text-ug-teal transition-colors">
                      <Tr text={project.title} />
                    </h3>

                    {/* Researcher / Author Name Badge */}
                    {project.owner_name && (
                      <div className="mb-4 flex items-center gap-2">
                        {project.owner_avatar ? (
                          <img 
                            src={project.owner_avatar} 
                            alt={project.owner_name} 
                            className="w-6 h-6 rounded-full object-cover border border-ug-teal/30"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-ug-teal/10 text-ug-teal flex items-center justify-center font-bold text-[10px]">
                            {project.owner_name.charAt(0)}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedResearcher(project.owner_name || '')}
                          className="text-xs font-bold text-gray-600 hover:text-ug-teal transition-colors flex items-center gap-1 group/author cursor-pointer"
                          title={`Click to view all projects by ${project.owner_name}`}
                        >
                          <span>{project.owner_name}</span>
                          <span className="text-[10px] text-ug-teal opacity-0 group-hover/author:opacity-100 transition-opacity font-semibold">
                            (Filter)
                          </span>
                        </button>
                      </div>
                    )}

                    <p className="text-gray-500 text-sm mb-6 line-clamp-3 flex-1 leading-relaxed font-medium">
                      <Tr text={project.description} />
                    </p>
                    
                    <div className="mt-4 space-y-4 pt-6 border-t border-gray-100">
                       <div className="flex justify-between text-xs items-center">
                          <span className="text-gray-400 font-bold uppercase tracking-widest"><Tr text="Commercialization Stage" /></span>
                          <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(project.status)} shadow-sm`}>
                            <Tr text={project.status} />
                          </span>
                       </div>
                       <div className="flex justify-between text-xs items-center">
                          <span className="text-gray-400 font-bold uppercase tracking-widest"><Tr text="Budget Range" /></span>
                          <span className="font-black text-ug-navy">{project.budget}</span>
                       </div>
                    </div>

                    <button 
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="mt-8 w-full py-4 bg-ug-navy text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-ug-teal hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-ug-navy/10 flex items-center justify-center gap-2 cursor-pointer"
                    >
                       <Tr text="View Project Details" /> <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-16">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-6 py-3.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-700 hover:text-ug-teal font-black text-xs uppercase tracking-widest disabled:opacity-40 transition shadow-sm cursor-pointer"
                >
                  <Tr text="Previous" />
                </button>
                <span className="text-xs font-black text-ug-navy uppercase tracking-widest">
                  <Tr text="Page" /> {currentPage} <Tr text="of" /> {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-6 py-3.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-700 hover:text-ug-teal font-black text-xs uppercase tracking-widest disabled:opacity-40 transition shadow-sm cursor-pointer"
                >
                  <Tr text="Next" />
                </button>
              </div>
            )}

            {/* Empty State */}
            {sortedProjects.length === 0 && (
               <div className="text-center py-32 animate-fade-in">
                  <div className="inline-block p-8 rounded-[2rem] bg-gray-100 mb-6 shadow-inner">
                     <Search size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-black text-ug-navy"><Tr text="No results found" /></h3>
                  <p className="text-gray-500 mt-2 font-medium"><Tr text="Try refining your research keywords, author names, or changing filters." /></p>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Projects;
