import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag, CheckCircle, ExternalLink, Search, Filter, SlidersHorizontal, Loader2, Bookmark, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../services/storageService';
import { Project, ProjectStatus, ResearchArea } from '../types';
import { supabase } from '../lib/supabase';
import { useToast } from '../App';
import { Tr } from '../components/Tr';
import { useTranslatedText } from '../services/translationService';

const Products: React.FC = () => {
  const { t } = useTranslation();
  const searchCatalogPlaceholder = useTranslatedText("Search catalog...");
  const [products, setProducts] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
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

  const handleSaveSearchAlert = async () => {
    if (!currentUser) {
      showToast("Authentication Required. Please log in to subscribe to search alerts.", "error");
      return;
    }
    const queryToSave = searchTerm.trim() || (selectedArea !== 'All' ? selectedArea : '');
    if (!queryToSave) {
      showToast("Please enter a keyword or select a research track first to subscribe to alerts.", "info");
      return;
    }
    try {
      await StorageService.saveSearch(currentUser.id, { query: queryToSave, category: selectedArea });
      showToast(`Search alert saved for "${queryToSave}"! You will be notified when matching projects are posted.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save search alert.", "error");
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const allProjects = await StorageService.getProjects();
        const marketReady = allProjects.filter(p => 
          p.status === ProjectStatus.MarketReady || p.status === ProjectStatus.Commercialization
        );
        setProducts(marketReady);
      } catch (err) {
        console.error("Products Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, sortBy]);

  // Filtering
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === 'All' || product.research_area === selectedArea;
    return matchesSearch && matchesArea;
  });

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    if (sortBy === 'title-asc') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);

  const getThumbnail = (urlStr: string) => urlStr && urlStr.trim() !== '' ? urlStr.split('|')[0] : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="text-ug-teal" size={32} />
            <h1 className="text-4xl font-black text-ug-navy"><Tr text="Innovation Catalog" /></h1>
          </div>
          <p className="text-gray-600 max-w-2xl text-lg font-medium">
            <Tr text="Discover commercially validated technologies and products developed by University of Ghana researchers, ready for licensing and deployment." />
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-12">
          <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-2 w-full xl:w-auto">
              <div className="relative w-full xl:w-96">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder={searchCatalogPlaceholder} 
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ug-teal focus:border-transparent transition-all font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

            </div>
            
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
              <div className="relative flex-1 md:flex-none">
                 <select 
                    className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-6 pr-12 rounded-2xl font-black text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-ug-teal transition-all cursor-pointer"
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                 >
                    <option value="All">All Research Tracks</option>
                    {Object.values(ResearchArea).map(area => (
                       <option key={area} value={area}>{area}</option>
                    ))}
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <Filter size={18} />
                 </div>
              </div>

              <div className="relative flex-1 md:flex-none">
                 <select 
                    className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-6 pr-12 rounded-2xl font-black text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-ug-teal transition-all cursor-pointer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                 >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title-asc">Title (A-Z)</option>
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <SlidersHorizontal size={18} />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
             <Loader2 className="animate-spin text-ug-teal mb-4" size={48} />
             <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Loading catalog...</p>
          </div>
        ) : (
          <>
            {/* Catalog Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              {currentProducts.map(product => (
                <div key={product.id} className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group flex flex-col">
                  <div className="h-64 relative overflow-hidden">
                    <img src={getThumbnail(product.image_url)} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                    {currentUser && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(product.id);
                        }}
                        className={`absolute top-4 left-4 p-2.5 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 z-10 ${
                          bookmarkedIds.includes(product.id) 
                            ? 'bg-ug-teal text-white scale-110' 
                            : 'bg-black/40 text-white/80 hover:text-white hover:bg-black/60 hover:scale-110'
                        }`}
                        title={bookmarkedIds.includes(product.id) ? "Remove Bookmark" : "Bookmark Project"}
                      >
                        <Bookmark size={18} className={bookmarkedIds.includes(product.id) ? 'fill-current' : ''} />
                      </button>
                    )}
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest">
                      <Tr text="Market Ready" />
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <span className="text-ug-teal font-black text-[10px] uppercase tracking-[0.2em] mb-3"><Tr text={product.research_area} /></span>
                    <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight group-hover:text-ug-teal transition-colors"><Tr text={product.title} /></h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium flex-1 line-clamp-4">
                      <Tr text={product.description} />
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-auto">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="text-xs font-black uppercase tracking-wider"><Tr text="License Validated" /></span>
                      </div>
                      <button 
                        onClick={() => navigate(`/projects/${product.id}`)}
                        className="flex items-center gap-2 text-ug-navy font-black text-xs uppercase hover:text-ug-teal transition cursor-pointer"
                      >
                        <Tr text="View Specs" /> <ExternalLink size={14} />
                      </button>
                    </div>
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
                  className="px-6 py-3.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-700 hover:text-ug-teal font-black text-xs uppercase tracking-widest disabled:opacity-40 transition shadow-sm"
                >
                  <Tr text="Previous" />
                </button>
                <span className="text-xs font-black text-ug-navy uppercase tracking-widest">
                  <Tr text="Page" /> {currentPage} <Tr text="of" /> {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-6 py-3.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-700 hover:text-ug-teal font-black text-xs uppercase tracking-widest disabled:opacity-40 transition shadow-sm"
                >
                  <Tr text="Next" />
                </button>
              </div>
            )}

            {/* Empty State */}
            {sortedProducts.length === 0 && (
              <div className="bg-white p-20 rounded-[3rem] text-center border border-gray-200 shadow-sm">
                <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" />
                <h3 className="text-2xl font-black text-ug-navy"><Tr text="No products matched criteria." /></h3>
                <p className="text-gray-500 mt-2 font-medium"><Tr text="Try checking other tracks or clearing search terms." /></p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Products;
