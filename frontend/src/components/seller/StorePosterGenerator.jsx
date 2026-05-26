import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { Download, Store } from 'lucide-react';

const StorePosterGenerator = ({ shopName }) => {
  const posterRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Fallback URL to main website since we don't have a direct shop link in this MVP structure
  const storeUrl = `https://mykiranam.in`;

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, // High resolution for printing
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `${(shopName || 'store').replace(/\s+/g, '_')}_MyKiranam_Poster.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Error generating poster:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4">
      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
        <Store className="w-4 h-4 text-kirana-500" />
        <span>Store Promotional Poster</span>
      </h3>
      <p className="text-[10px] text-slate-400 leading-normal">
        Generate and download a printable QR Code poster to place at your storefront. Customers can scan to find you online!
      </p>

      {/* Container for Preview and Button */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
        
        {/* The Poster to capture */}
        <div 
          ref={posterRef}
          className="bg-white border-2 border-kirana-500 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center space-y-5 relative overflow-hidden shadow-sm"
          style={{ width: '320px' }}
        >
          {/* Decorative background blobs */}
          <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 w-32 h-32 bg-kirana-200 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 transform -translate-x-1/3 translate-y-1/3 w-32 h-32 bg-emerald-200 rounded-full blur-2xl pointer-events-none"></div>

          <div className="z-10 w-full mt-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
              Order Online
            </h1>
            <p className="text-xs font-bold text-kirana-600 uppercase tracking-widest">
              From Our Store
            </p>
          </div>

          <div className="z-10 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mt-2 mb-2">
            <QRCode 
              value={storeUrl} 
              size={150} 
              level="H" 
              fgColor="#0f172a" 
            />
          </div>

          <div className="z-10 space-y-1 w-full bg-slate-50 py-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan & Search for:</p>
            <h2 className="text-lg font-black text-slate-800 px-2 line-clamp-2 leading-tight">
              {shopName || 'Your Store Name'}
            </h2>
          </div>

          <div className="z-10 pt-3 border-t border-slate-100 w-full flex items-center justify-center space-x-1.5 pb-1">
            <span className="text-[10px] font-bold text-slate-400">Powered by</span>
            <span className="text-sm font-black text-kirana-600">MyKiranam.in</span>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-5 w-full">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-2 disabled:bg-slate-400"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Generating High-Res Image...' : 'Download Poster (PNG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorePosterGenerator;
