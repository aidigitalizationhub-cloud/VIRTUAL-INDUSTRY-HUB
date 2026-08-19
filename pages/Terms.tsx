import React from 'react';
import { Scale, FileText, Gavel, Award } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-ug-navy/10 text-ug-navy rounded-2xl">
              <Scale size={32} />
            </div>
            <h1 className="text-4xl font-black text-ug-navy">Terms of Service</h1>
          </div>
          
          <div className="prose prose-lg text-gray-600 max-w-none space-y-8 font-medium">
            <p>Welcome to the University of Ghana Virtual Industry Hub. By accessing this platform, you agree to the following legally binding terms regarding IP and collaboration.</p>
            
            <section>
              <h2 className="text-2xl font-black text-ug-navy mb-4 flex items-center gap-2"><Award size={20} className="text-ug-teal" /> Intellectual Property (IP) Ownership</h2>
              <p>Unless otherwise stated in a separate written agreement, all research outputs showcased on this platform remain the intellectual property of the University of Ghana and the respective researchers. Use of this platform does not constitute a license to use, reproduce, or commercialize any displayed innovation.</p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-ug-navy mb-4 flex items-center gap-2"><FileText size={20} className="text-ug-teal" /> Non-Disclosure Agreement (NDA)</h2>
              <p>Access to technical disclosures at Stage 4 and above requires the execution of a digital NDA. Users agree not to disclose technical details obtained through this platform to external parties without express written consent from the University's Legal Counsel.</p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-ug-navy mb-4 flex items-center gap-2"><Gavel size={20} className="text-ug-teal" /> Conflict of Interest</h2>
              <p>All users must disclose any financial or professional conflicts of interest before engaging in partnership negotiations. The University reserves the right to terminate access if a conflict is found to jeopardize the integrity of the research.</p>
            </section>

            <div className="p-8 bg-gray-900 text-white rounded-2xl shadow-xl">
              <p className="text-sm font-black uppercase tracking-widest text-ug-teal mb-2">Legal Jurisdiction</p>
              <p>These terms are governed by the laws of the Republic of Ghana. Any disputes shall be subject to the exclusive jurisdiction of the courts of Accra.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;