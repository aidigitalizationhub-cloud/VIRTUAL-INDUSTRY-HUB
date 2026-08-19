import React from 'react';
import { Shield, Lock, Eye, Server } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-ug-teal/10 text-ug-teal rounded-2xl">
              <Shield size={32} />
            </div>
            <h1 className="text-4xl font-black text-ug-navy">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-lg text-gray-600 max-w-none space-y-8 font-medium">
            <p>Last Updated: October 2024</p>
            
            <section>
              <h2 className="text-2xl font-black text-ug-navy mb-4 flex items-center gap-2"><Lock size={20} className="text-ug-teal" /> Data Protection Overview</h2>
              <p>The University of Ghana Virtual Industry Hub is committed to protecting the intellectual property (IP) and personal information of our researchers and partners. This policy outlines how we handle sensitive research disclosures and corporate identification data.</p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-ug-navy mb-4 flex items-center gap-2"><Eye size={20} className="text-ug-teal" /> Information We Collect</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Researcher Profiles:</strong> Academic credentials, departmental affiliations, and project history.</li>
                <li><strong>Corporate Profiles:</strong> Tax identifiers, industry focus areas, and partnership objectives.</li>
                <li><strong>Project Disclosures:</strong> Technical abstracts, maturity stage documentation, and funding requirements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-ug-navy mb-4 flex items-center gap-2"><Server size={20} className="text-ug-teal" /> How We Use Your Data</h2>
              <p>We use your information exclusively for facilitating academic-industrial partnerships. We do not sell data to third-party advertisers. Disclosures marked as "Internal" or "Draft" are encrypted and visible only to authorized Office of Research, Innovation and Development (ORID) staff.</p>
            </section>

            <div className="p-8 bg-blue-50 rounded-2xl border border-blue-100 text-blue-900 italic">
              "Encryption and confidentiality are the bedrock of our innovation pipeline. We adhere strictly to the Ghana Data Protection Act (Act 843)."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;