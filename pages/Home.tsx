
import React, { useState, useEffect } from 'react';
import { ArrowRight, Microscope, Pill, Syringe, CheckCircle, Send, Loader2, Newspaper, Calendar, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HERO_IMAGES } from '../constants';
import { ProjectStatus, Project, ResearchArea, NewsItem } from '../types';
import { StorageService } from '../services/storageService';
import { Tr } from '../components/Tr';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [marketReadyProducts, setMarketReadyProducts] = useState<Project[]>([]);
  const [showcaseProjects, setShowcaseProjects] = useState<Project[]>([]);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const heroCaptions = [
    { title: "Vaccine Innovation", text: "Pioneering next-generation vaccines for a healthier Africa." },
    { title: "Diagnostic Excellence", text: "Precision tools for rapid and accurate disease detection." },
    { title: "Pharmaceutical Research", text: "Harnessing local biodiversity for global medicine." }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allProjects = await StorageService.getProjects();
        setMarketReadyProducts(allProjects.filter(p => p.status === ProjectStatus.MarketReady || p.status === ProjectStatus.Commercialization));
        setShowcaseProjects(allProjects.filter(p => p.status !== ProjectStatus.MarketReady && p.status !== ProjectStatus.Commercialization).slice(0, 3));
        
        const allNews = await StorageService.getNews();
        setLatestNews(allNews.slice(0, 3));
      } catch (err) {
        console.error("Home Data Load Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);
    }, 6000); 

    return () => clearInterval(interval);
  }, []);

  const handleCategoryClick = (area: ResearchArea) => {
    navigate(`/projects?track=${encodeURIComponent(area)}`);
  };

  const getThumbnail = (urlStr: string) => urlStr ? urlStr.split('|')[0] : '';

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HERO SECTION */}
      <div className="relative bg-ug-navy overflow-hidden h-[500px] sm:h-[650px] md:h-[750px] flex items-center">
        {HERO_IMAGES.map((img, index) => (
           <div 
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-65 scale-100' : 'opacity-0 scale-105'}`}
              style={{ backgroundImage: `url('${img}')` }}
           ></div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-ug-navy via-ug-navy/70 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col h-full justify-center">
          <div className="md:w-2/3 mt-12 sm:mt-20">
            <div className="flex items-center gap-3 mb-4 sm:mb-6 animate-fade-in">
               <span className="h-0.5 w-8 sm:w-12 bg-ug-teal"></span>
               <span className="text-[10px] sm:text-xs font-black text-ug-teal uppercase tracking-[0.3em] sm:tracking-[0.4em]"><Tr text="LIVE TRACK: Innovation Hub" /></span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-3 sm:mb-4">
              <Tr text={heroCaptions[currentImageIndex].title} />
            </h1>
            <p className="text-sm sm:text-xl md:text-2xl text-gray-100 mb-6 sm:mb-10 max-w-2xl font-medium leading-relaxed drop-shadow-md">
              <Tr text={heroCaptions[currentImageIndex].text} />
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/projects" className="bg-ug-teal text-white px-6 py-3.5 sm:px-10 sm:py-5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-white hover:text-ug-teal transition-all shadow-2xl flex items-center gap-2 sm:gap-3">
                <Tr text="Explore The Pipeline" /> <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CORE RESEARCH AREAS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ug-navy tracking-tight"><Tr text="Accelerating Regional Health" /></h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto font-medium text-lg">
              <Tr text="Connecting African ingenuity with global markets through cloud-first collaboration." />
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {/* DIAGNOSTICS CARD */}
            <div 
              onClick={() => handleCategoryClick(ResearchArea.Diagnostics)}
              className="relative overflow-hidden rounded-[2rem] border border-gray-100 shadow-xl cursor-pointer h-[360px] flex flex-col justify-end p-8 group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-out"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1579154204601-01588f351167?auto=format&fit=crop&w=800&q=80')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ug-navy via-ug-navy/85 to-ug-navy/40 mix-blend-multiply group-hover:via-ug-navy/90 transition-all duration-500"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between text-white">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-ug-teal mb-6 group-hover:scale-110 transition duration-500">
                  <Microscope size={30} className="group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight"><Tr text="Diagnostics" /></h3>
                  <p className="text-gray-200 text-sm font-medium leading-relaxed mb-6 group-hover:text-white transition duration-300"><Tr text="Stage 4+ clinical diagnostic platforms for rapid high-throughput screening." /></p>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ug-teal group-hover:text-white transition-colors">
                    <Tr text="View Pipeline" /> <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* PHARMACEUTICAL CARD */}
            <div 
              onClick={() => handleCategoryClick(ResearchArea.Pharmaceutical)}
              className="relative overflow-hidden rounded-[2rem] border border-gray-100 shadow-xl cursor-pointer h-[360px] flex flex-col justify-end p-8 group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-out"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950 via-teal-900/85 to-teal-800/40 mix-blend-multiply group-hover:via-teal-900/90 transition-all duration-500"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between text-white">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-ug-teal mb-6 group-hover:scale-110 transition duration-500">
                  <Pill size={30} className="group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight"><Tr text="Pharmaceutical" /></h3>
                  <p className="text-gray-200 text-sm font-medium leading-relaxed mb-6 group-hover:text-white transition duration-300"><Tr text="Standardizing and validating indigenous traditional herbal medicine profiles." /></p>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ug-teal group-hover:text-white transition-colors">
                    <Tr text="View Pipeline" /> <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* VACCINES CARD */}
            <div 
              onClick={() => handleCategoryClick(ResearchArea.Vaccines)}
              className="relative overflow-hidden rounded-[2rem] border border-gray-100 shadow-xl cursor-pointer h-[360px] flex flex-col justify-end p-8 group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-out"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80')" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-900/85 to-indigo-800/40 mix-blend-multiply group-hover:via-indigo-900/90 transition-all duration-500"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between text-white">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition duration-500">
                  <Syringe size={30} className="group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight"><Tr text="Vaccines" /></h3>
                  <p className="text-gray-200 text-sm font-medium leading-relaxed mb-6 group-hover:text-white transition duration-300"><Tr text="Thermostable antigen delivery and advanced formulations for local immunization." /></p>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 group-hover:text-white transition-colors">
                    <Tr text="View Pipeline" /> <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE PRODUCTS */}
      <section className="py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ug-navy tracking-tight"><Tr text="Market-Ready Innovations" /></h2>
                <p className="mt-2 text-gray-500 font-medium text-sm"><Tr text="Validated and ready for deployment or licensing." /></p>
              </div>
              {isLoading && <Loader2 className="animate-spin text-ug-teal" />}
           </div>
           
           {marketReadyProducts.length > 0 ? (
             <div className="grid md:grid-cols-2 gap-8">
               {marketReadyProducts.map(product => (
                 <div key={product.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row hover:shadow-xl transition group">
                   <div className="md:w-2/5 h-64 md:h-auto overflow-hidden">
                      <img src={getThumbnail(product.image_url)} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                   </div>
                   <div className="p-8 md:w-3/5 flex flex-col justify-center">
                      <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight group-hover:text-ug-teal transition-colors"><Tr text={product.title} /></h3>
                      <p className="text-gray-500 text-sm mb-6 font-medium line-clamp-2 leading-relaxed"><Tr text={product.description} /></p>
                      <button onClick={() => navigate(`/projects/${product.id}`)} className="self-start text-xs font-black text-ug-navy border-b-2 border-ug-navy pb-1 hover:text-ug-teal hover:border-ug-teal transition uppercase tracking-widest"><Tr text="Detail Brief" /></button>
                   </div>
                 </div>
               ))}
             </div>
           ) : !isLoading && (
             <div className="bg-white p-12 rounded-[2.5rem] text-center border border-gray-100">
               <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
               <h4 className="font-black text-lg text-ug-navy mb-1"><Tr text="Catalog Update Pending" /></h4>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest"><Tr text="Check back soon for new commercializations." /></p>
             </div>
           )}
        </div>
      </section>

      {/* FEATURED RESEARCH PIPELINE */}
      <section className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ug-navy tracking-tight"><Tr text="Active Research Pipeline" /></h2>
                <p className="mt-2 text-gray-500 font-medium text-sm"><Tr text="Pioneering discoveries from University of Ghana laboratories." /></p>
              </div>
              <Link to="/projects" className="text-xs font-black text-ug-teal uppercase tracking-widest flex items-center gap-2 hover:text-ug-navy transition-colors">
                <Tr text="View Entire Pipeline" /> <ArrowRight size={16} />
              </Link>
           </div>

           {showcaseProjects.length > 0 ? (
             <div className="grid md:grid-cols-3 gap-8">
               {showcaseProjects.map(project => (
                 <div key={project.id} className="bg-gray-50 rounded-[2.5rem] border border-gray-100 overflow-hidden hover:shadow-xl transition flex flex-col h-full group">
                   <div className="h-48 overflow-hidden relative shrink-0">
                      <img src={getThumbnail(project.image_url)} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute top-4 left-4 bg-ug-teal text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        <Tr text={project.status} />
                      </div>
                   </div>
                   <div className="p-8 flex-1 flex flex-col justify-between">
                     <div>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2"><Tr text={project.department} /></span>
                       <h3 className="text-xl font-black text-gray-900 mb-3 leading-tight group-hover:text-ug-teal transition-colors line-clamp-2"><Tr text={project.title} /></h3>
                       <p className="text-gray-500 text-xs font-medium leading-relaxed mb-6 line-clamp-3"><Tr text={project.description} /></p>
                     </div>
                     <button onClick={() => navigate(`/projects/${project.id}`)} className="w-full py-3.5 bg-ug-navy text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-ug-teal transition flex items-center justify-center gap-2">
                       <Tr text="Explore Case" /> <ArrowRight size={14} />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           ) : !isLoading && (
             <div className="bg-gray-50 p-12 rounded-[2.5rem] text-center border border-gray-100">
               <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
               <h4 className="font-black text-lg text-ug-navy mb-1"><Tr text="Pipeline update in progress" /></h4>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest"><Tr text="Academic blueprints are currently undergoing security review." /></p>
             </div>
           )}
        </div>
      </section>

      {/* LATEST INSIGHTS & DISCOVERIES */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-ug-navy tracking-tight"><Tr text="Discovery Feed" /></h2>
                <p className="mt-2 text-gray-500 font-medium text-sm"><Tr text="Autonomous news and live updates on regional health innovations." /></p>
              </div>
              <Link to="/news" className="text-xs font-black text-ug-navy uppercase tracking-widest flex items-center gap-2 hover:text-ug-teal transition-colors">
                <Tr text="Explore Discovery Feed" /> <ArrowRight size={16} />
              </Link>
           </div>

           {latestNews.length > 0 ? (
             <div className="grid md:grid-cols-3 gap-8">
               {latestNews.map(item => (
                 <div key={item.id} onClick={() => item.external_url && window.open(item.external_url, '_blank', 'noopener,noreferrer')} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden hover:shadow-xl transition flex flex-col h-full group cursor-pointer">
                   <div className="h-44 overflow-hidden shrink-0">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                   </div>
                   <div className="p-8 flex-1 flex flex-col justify-between">
                     <div>
                       <div className="flex items-center gap-3 mb-3">
                         <span className="text-[9px] font-black bg-ug-navy/5 text-ug-navy px-2.5 py-1 rounded-full uppercase tracking-wider">
                           <Tr text={item.category} />
                         </span>
                         <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                           <Calendar size={12} /> {item.published_at}
                         </span>
                       </div>
                       <h3 className="text-lg font-black text-gray-900 mb-3 leading-tight group-hover:text-ug-teal transition-colors line-clamp-2"><Tr text={item.title} /></h3>
                       <p className="text-gray-500 text-xs font-medium leading-relaxed mb-6 line-clamp-3"><Tr text={item.summary} /></p>
                     </div>
                     <span className="text-[10px] font-black text-ug-teal uppercase tracking-widest group-hover:translate-x-2 transition-transform inline-flex items-center gap-1.5 mt-auto">
                       <Tr text="Read Discovery" /> <ChevronRight size={16} />
                     </span>
                   </div>
                 </div>
               ))}
             </div>
           ) : !isLoading && (
             <div className="bg-white p-12 rounded-[2.5rem] text-center border border-gray-100">
               <Newspaper size={48} className="mx-auto text-gray-200 mb-4" />
               <h4 className="font-black text-lg text-ug-navy mb-1"><Tr text="Autonomous Sync Pending" /></h4>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest"><Tr text="Awaiting scheduled background intelligence scouting." /></p>
             </div>
           )}
        </div>
      </section>
    </div>
  );
};

export default Home;
