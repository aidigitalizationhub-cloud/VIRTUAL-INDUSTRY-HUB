import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, MapPin, Globe, ExternalLink, Linkedin, Twitter, Facebook } from 'lucide-react';
import { Tr } from './Tr';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-ug-navy text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand & Institution Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 px-1.5 py-0.5 rounded-xl bg-white flex items-center justify-center shadow-md border border-white/20 shrink-0 overflow-hidden">
                <img 
                  src="/logo.svg" 
                  alt="University of Ghana Logo" 
                  className="h-full w-auto max-w-[120px] object-contain"
                />
              </div>
              <div>
                <h3 className="text-white text-base font-bold tracking-tight leading-tight">
                  <Tr text="Institute of Applied Science and Technology (IAST)" />
                </h3>
                <p className="text-xs text-ug-gold font-semibold tracking-wider uppercase">
                  <Tr text="University of Ghana • Virtual Industry Hub" />
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              <Tr text="Promoting industry-academic partnerships, commercialization of research, and technology transfer for sustainable national development." />
            </p>

            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://iast.ug.edu.gh/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ug-teal hover:text-teal-300 transition-colors"
              >
                <span><Tr text="Visit iast.ug.edu.gh" /></span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">
              <Tr text="Quick Links" />
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#/projects" className="hover:text-ug-teal transition-colors">
                  <Tr text="Research Projects" />
                </a>
              </li>
              <li>
                <a href="#/products" className="hover:text-ug-teal transition-colors">
                  <Tr text="Intellectual Property & Products" />
                </a>
              </li>
              <li>
                <a href="#/news" className="hover:text-ug-teal transition-colors">
                  <Tr text="Industry Discovery & News" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">
              <Tr text="Contact IAST" />
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-ug-teal shrink-0 mt-0.5" />
                <span><Tr text="Legon Campus, University of Ghana, Accra, Ghana" /></span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-ug-teal shrink-0" />
                <a href="mailto:iast@ug.edu.gh" className="hover:text-ug-teal transition-colors">
                  iast@ug.edu.gh
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Globe size={14} className="text-ug-teal shrink-0" />
                <a
                  href="https://iast.ug.edu.gh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ug-teal transition-colors"
                >
                  https://iast.ug.edu.gh/
                </a>
              </li>
            </ul>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a href="#" aria-label="LinkedIn" className="text-slate-400 hover:text-ug-teal transition-colors">
                <Linkedin size={16} />
              </a>
              <a href="#" aria-label="Twitter" className="text-slate-400 hover:text-ug-teal transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" aria-label="Facebook" className="text-slate-400 hover:text-ug-teal transition-colors">
                <Facebook size={16} />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} <Tr text="Institute of Applied Science and Technology, University of Ghana. All rights reserved." />
          </p>
          <div className="flex items-center gap-4 text-xs">
            <a href="#/privacy" className="hover:text-slate-200 transition-colors"><Tr text="Privacy Policy" /></a>
            <span>•</span>
            <a href="#/terms" className="hover:text-slate-200 transition-colors"><Tr text="Terms of Service" /></a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

