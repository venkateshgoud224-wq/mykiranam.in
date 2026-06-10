import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, CheckCircle, Search, Filter } from 'lucide-react';
import ImageModal from '../common/ImageModal';

const ComplaintsManagement = () => {
  const { token, apiUrl } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [filter, setFilter] = useState('All'); // All, Open, Closed
  const [verificationNotes, setVerificationNotes] = useState('');
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/admin/complaints`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setComplaints(data);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    const interval = setInterval(fetchComplaints, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id, isVerify) => {
    setActionLoading(id);
    try {
      const endpoint = isVerify ? 'verify' : 'reject';
      const response = await fetch(`${apiUrl}/admin/complaints/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action_notes: verificationNotes })
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(isVerify ? `Complaint verified! Seller warning level is now: ${data.new_warning_level}` : 'Complaint rejected successfully!');
        setSelectedComplaintId(null);
        setVerificationNotes('');
        fetchComplaints();
      } else {
        alert(data.error || 'Failed to update complaint.');
      }
    } catch (err) {
      console.error('Error processing action:', err);
      alert('An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${apiUrl.replace('/api', '')}${path}`;
  };

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'All') return true;
    return c.status === filter;
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-crimson" />
            Quality Control & Complaints
          </h2>
          <p className="text-sm text-slate-500">Manage customer complaints and seller strikes.</p>
        </div>
        <div className="flex space-x-2">
          {['All', 'Open', 'Closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && complaints.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Loading complaints...
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="py-12 bg-white rounded-3xl border border-slate-100 p-8 text-center text-xs font-bold text-slate-400 shadow-sm">
          No complaints found in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map(complaint => {
            const images = [];
            try {
              if (complaint.evidence_images) {
                const parsed = JSON.parse(complaint.evidence_images);
                if (Array.isArray(parsed)) images.push(...parsed);
              }
            } catch (e) {}

            return (
              <div key={complaint.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-premium flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      {complaint.issue_type}
                      {complaint.status === 'Escalated' && (
                        <span className="px-1.5 py-0.5 bg-kirana-50 text-kirana-700 text-[9px] uppercase rounded border border-kirana-200">
                          🤖 AI Escalated
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">Order: #{complaint.custom_order_id || complaint.order_id} • Shop: <span className="font-bold">{complaint.shop_name}</span></p>
                    <p className="text-[10px] text-slate-400">Customer: {complaint.customer_name} • Date: {new Date(complaint.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${
                    complaint.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {complaint.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Customer Description</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 italic">
                    "{complaint.description}"
                  </div>
                </div>

                {/* AI Agent Insights Panel */}
                {(complaint.ai_priority && complaint.ai_priority !== 'None') && (
                  <div className="bg-kirana-50/50 border border-kirana-100 rounded-xl p-3 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-kirana-700 uppercase tracking-wide flex items-center gap-1">
                        🤖 AI Agent Investigation
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg uppercase ${
                        complaint.ai_priority === 'High' ? 'bg-crimson text-white' : 
                        complaint.ai_priority === 'Medium' ? 'bg-amber-500 text-white' : 
                        'bg-blue-500 text-white'
                      }`}>
                        {complaint.ai_priority} Priority
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-800 font-medium">
                        <span className="text-slate-500 mr-1">Recommendation:</span>
                        {complaint.ai_recommendation}
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 font-bold uppercase mb-0.5">Risk Score</span>
                        <span className={`text-lg font-black ${complaint.ai_risk_score > 70 ? 'text-crimson' : 'text-amber-500'}`}>
                          {complaint.ai_risk_score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {complaint.seller_explanation && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Seller Explanation</span>
                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 text-xs text-slate-750 italic">
                      "{complaint.seller_explanation}"
                      <span className="block text-[8px] text-slate-400 mt-1 font-bold">
                        Submitted at: {new Date(complaint.seller_response_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="flex space-x-3 overflow-x-auto py-2">
                    {images.map((img, idx) => (
                      <img
                        key={idx}
                        src={getFullImageUrl(img)}
                        alt={`Evidence ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImage(getFullImageUrl(img))}
                      />
                    ))}
                  </div>
                )}

                {['Pending', 'Open', 'Seller Responded', 'Escalated'].includes(complaint.status) && (
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    {selectedComplaintId === complaint.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={verificationNotes}
                          onChange={(e) => setVerificationNotes(e.target.value)}
                          placeholder="Admin action notes..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-kirana-500 outline-none h-16 resize-none"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAction(complaint.id, true)}
                            disabled={actionLoading === complaint.id}
                            className="flex-1 py-2 bg-crimson text-white text-xs font-bold rounded-lg hover:bg-crimson/90 transition-colors"
                          >
                            {actionLoading === complaint.id ? 'Processing...' : 'Verify & Strike'}
                          </button>
                          <button
                            onClick={() => handleAction(complaint.id, false)}
                            disabled={actionLoading === complaint.id}
                            className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            {actionLoading === complaint.id ? 'Processing...' : 'Reject Complaint'}
                          </button>
                          <button
                            onClick={() => setSelectedComplaintId(null)}
                            className="px-4 py-2 bg-slate-105 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedComplaintId(complaint.id);
                          setVerificationNotes('');
                        }}
                        className="w-full py-2.5 border-2 border-crimson/20 text-crimson hover:bg-crimson/5 text-xs font-bold rounded-xl transition-all"
                      >
                        Audit & Take Action
                      </button>
                    )}
                  </div>
                )}

                {(complaint.status === 'Closed' || complaint.status === 'Verified') && complaint.is_verified && (
                  <div className="flex items-center space-x-1.5 text-[10px] text-red-700 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                    <CheckCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>Verified & Seller Strike Applied</span>
                  </div>
                )}

                {complaint.status === 'Rejected' && !complaint.is_verified && (
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dispute Audited & Rejected (Clear)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewImage && (
        <ImageModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};

export default ComplaintsManagement;
