import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
                     bottom-4 right-4
                     w-[95vw] max-w-[430px]
                     h-[80vh] max-h-[720px]
                     sm:bottom-6 sm:right-6"
        >
          {/* Header */}
          <div className="bg-ug-navy text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">
                Ask InnoGuide
              </h3>

              <p className="text-xs text-gray-300">
                AI Research Assistant
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 hover:bg-white/10 transition"
              aria-label="Close chatbot"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chatbot */}
          <iframe
            src="https://innoguid.netlify.app"
            title="InnoGuide Chatbot"
            className="w-full border-0"
            style={{
              height: "calc(100% - 68px)",
            }}
            loading="lazy"
            allow="clipboard-write"
          />
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chatbot"
          className="
            fixed
            bottom-5
            right-5
            sm:bottom-6
            sm:right-6
            z-[9999]
            bg-ug-navy
            border-2
            border-ug-teal
            text-white
            w-16
            h-16
            rounded-full
            shadow-xl
            hover:scale-105
            active:scale-95
            transition-all
            duration-300
            flex
            items-center
            justify-center
          "
        >
          <MessageSquare size={28} />
        </button>
      )}
    </>
  );
};

export default AIAssistant;