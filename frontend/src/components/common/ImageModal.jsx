import React from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

const ImageModal = ({ imageUrl, altText = "Image preview", onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fadeIn">
      {/* Top right actions */}
      <div className="absolute top-4 right-4 flex space-x-3">
        <a 
          href={imageUrl}
          download
          target="_blank"
          rel="noreferrer"
          className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors shadow-lg"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors shadow-lg"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image container */}
      <div className="max-w-5xl w-full h-[85vh] flex items-center justify-center relative bg-transparent rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt={altText}
          className="max-w-full max-h-full object-contain drop-shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default ImageModal;
