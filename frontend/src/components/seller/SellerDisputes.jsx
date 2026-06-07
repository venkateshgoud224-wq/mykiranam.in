import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, ShieldCheck, HelpCircle, CheckCircle, Clock, FileText, Send, Award, Scale } from 'lucide-react';

const SellerDisputes = () => {
  const { token, apiUrl, extraData, refreshProfile } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);
  const [explanationText, setExplanationText] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // All, Pending, Resolved

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/complaints/shop-disputes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
      } else {
        setError('Failed to fetch disputes log.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error fetching disputes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [apiUrl, token]);

  const handleSubmitExplanation = async (id) => {
    if (!explanationText.trim()) {
      alert('Please enter an explanation first.');
      return;
    }
    setSubmittingId(id);
    try {
      const res = await fetch(`${apiUrl}/complaints/${id}/explanation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ seller_explanation: explanationText })
      });
      if (res.ok) {
        setExplanationText('');
        fetchDisputes();
        refreshProfile();
        alert('Explanation submitted successfully. Administrators will review the dispute.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit explanation.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to dispute engine.');
    } finally {
      setSubmittingId(null);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  const shop = extraData.shop || {};
  const performance = extraData.performanceMetrics || {};
  const trustScore = performance.trust_score !== undefined ? performance.trust_score : 100;
  const warningLevel = shop.warning_level || 'None';
  
  // Averages/Performance variables
  const complaintRate = performance.complaint_rate !== undefined ? performance.complaint_rate : 0.00;
  
  // Warning messages based on Warning Levels
  const getWarningBanner = () => {
    switch (warningLevel) {
      case 'Warning 1':
        return {
          bg: 'bg-amber-50 border-amber-250 text-amber-900',
          title: 'Account Warning 1: Action Required',
          desc: 'Please improve product quality and order fulfillment standards immediately to avoid penalties.'
        };
      case 'Warning 2':
        return {
          bg: 'bg-amber-100 border-amber-300 text-amber-950',
          title: 'Account Warning 2: Trust Score Reduced',
          desc: 'Your store trust score has been reduced due to 5 verified complaints. Please audit your dispute logs.'
        };
      case 'Warning 3':
        return {
          bg: 'bg-orange-50 border-orange-250 text-orange-950',
          title: 'Account Warning 3: Search Rank Demoted',
          desc: 'Warning 3 applied (7 verified complaints). Your store ranking is currently reduced in client searches.'
        };
      case 'Warning 4':
        return {
          bg: 'bg-red-50 border-red-200 text-red-950',
          title: 'Account Warning 4: Store Under Review',
          desc: 'Admin investigation is active. Further customer complaints will result in store suspension.'
        };
      case 'Warning 5':
        return {
          bg: 'bg-red-100 border-red-300 text-red-900',
          title: 'Account Warning 5: Store Temporarily Suspended',
          desc: 'Your store is currently suspended and cannot receive new orders. Please contact customer support.'
        };
      default:
        return null;
    }
  };

  const banner = getWarningBanner();

  const filteredDisputes = disputes.filter(d => {
    if (activeTab === 'Pending') return d.status === 'Pending' || d.status === 'Open';
    if (activeTab === 'Resolved') return d.status === 'Verified' || d.status === 'Rejected' || d.status === 'Closed';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center">
          <Scale className="w-5 h-5 mr-2 text-kirana-600" />
          Disputes & Trust Portal
        </h2>
        <p className="text-xs text-slate-500">Protect your store reputation, respond to disputes, and track Warning levels.</p>
      </div>

      {/* Trust Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trust Score */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Seller Trust Score</span>
            <span className="text-3xl font-black text-slate-900">{trustScore} / 100</span>
            <span className="block text-[9px] text-slate-550 mt-1 font-semibold">Starts at 100. Restored by completed orders.</span>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-sm shadow-inner ${
            trustScore >= 80 ? 'bg-emerald-50 text-emerald-600' : trustScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
          }`}>
            {trustScore}%
          </div>
        </div>

        {/* Warning Level */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Warning Level</span>
            <span className={`text-xl font-black ${warningLevel !== 'None' ? 'text-amber-600' : 'text-slate-800'}`}>
              {warningLevel}
            </span>
            <span className="block text-[9px] text-slate-550 mt-1 font-semibold">Strike warnings generated by verified counts.</span>
          </div>
          <div className="text-2xl">
            {warningLevel === 'None' ? '🛡️' : '⚠️'}
          </div>
        </div>

        {/* Complaint Rate */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Complaint Rate</span>
            <span className="text-3xl font-black text-slate-900">{complaintRate}%</span>
            <span className="block text-[9px] text-slate-550 mt-1 font-semibold">Verified complaints ÷ total orders.</span>
          </div>
          <div className="text-2xl">
            📈
          </div>
        </div>
      </div>

      {/* Warning Level Banner */}
      {banner && (
        <div className={`p-4 border rounded-2xl flex items-start space-x-3 text-xs leading-relaxed ${banner.bg}`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <strong className="font-extrabold">{banner.title}</strong>
            <p className="mt-0.5">{banner.desc}</p>
          </div>
        </div>
      )}

      {/* Dispute log */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-sm text-slate-800">Dispute & Customer Complaint History</h3>
          <div className="flex space-x-1">
            {['All', 'Pending', 'Resolved'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-all ${
                  activeTab === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Refreshing dispute logs...
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-655 text-xs font-bold">
            {error}
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="py-12 bg-white rounded-3xl border border-slate-100 text-center text-xs font-bold text-slate-400">
            No complaints found in this category. You are in good standing!
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDisputes.map(dispute => {
              const images = [];
              try {
                if (dispute.evidence_images) {
                  const parsed = JSON.parse(dispute.evidence_images);
                  if (Array.isArray(parsed)) images.push(...parsed);
                }
              } catch (e) {}

              const isResolved = ['Verified', 'Rejected', 'Closed'].includes(dispute.status);

              return (
                <div key={dispute.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium space-y-4 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{dispute.issue_type}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Order #{dispute.custom_order_id || dispute.order_id} • Customer: {dispute.customer_name} • Date: {new Date(dispute.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      dispute.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      dispute.status === 'Verified' ? 'bg-red-50 text-red-700 border border-red-100' :
                      dispute.status === 'Rejected' ? 'bg-green-50 text-green-700 border border-green-100' :
                      'bg-slate-550 bg-slate-50 text-slate-655 border border-slate-100'
                    }`}>
                      {dispute.status}
                    </span>
                  </div>

                  {/* Customer explanation description */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center">
                      <FileText className="w-3 h-3 mr-1" /> Customer Complaint Description
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl italic leading-relaxed">
                      "{dispute.description}"
                    </p>
                  </div>

                  {/* Evidence Images */}
                  {images.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Customer Evidence Photos</span>
                      <div className="flex space-x-2 overflow-x-auto py-1">
                        {images.map((img, idx) => (
                          <a href={getFullImageUrl(img)} target="_blank" rel="noopener noreferrer" key={idx} className="block hover:opacity-95">
                            <img
                              src={getFullImageUrl(img)}
                              alt="Evidence"
                              className="h-16 w-16 object-cover rounded-xl border border-slate-200"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seller Response/Explanation */}
                  <div className="space-y-3 pt-2 border-t border-slate-50">
                    {dispute.seller_explanation ? (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" /> Your Response Explanation
                        </span>
                        <p className="text-xs text-slate-700 bg-slate-50 border border-slate-150 p-3 rounded-xl leading-relaxed">
                          {dispute.seller_explanation}
                          <span className="block text-[8px] text-slate-400 mt-1 font-bold">
                            Submitted at: {new Date(dispute.seller_response_at).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    ) : isResolved ? (
                      <p className="text-[10px] text-slate-400 italic">Dispute was resolved by system admin without a seller response.</p>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide flex items-center">
                          ✍️ Submit Dispute Explanation
                        </span>
                        <div className="flex gap-2 items-end">
                          <textarea
                            placeholder="Explain your side of the dispute here. E.g. product brand matched perfectly, or item was out of stock and order revised..."
                            value={explanationText}
                            onChange={(e) => setExplanationText(e.target.value)}
                            rows={2}
                            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-kirana-500 focus:outline-none resize-none bg-slate-50/50"
                          />
                          <button
                            onClick={() => handleSubmitExplanation(dispute.id)}
                            disabled={submittingId === dispute.id}
                            className="px-4 py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center space-x-1.5 h-10"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{submittingId === dispute.id ? 'Sending...' : 'Send'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {dispute.status === 'Verified' && (
                    <div className="p-2.5 bg-red-50 border border-red-100 text-[10px] font-extrabold text-red-655 rounded-xl flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                      <span>Admin audit verified this dispute. Point deductions have been applied to your trust score.</span>
                    </div>
                  )}

                  {dispute.status === 'Rejected' && (
                    <div className="p-2.5 bg-green-50 border border-green-100 text-[10px] font-extrabold text-green-700 rounded-xl flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                      <span>Admin audit rejected the complaint. Your trust score is unaffected.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDisputes;
