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

  const handleVerify = async (id) => {
    setActionLoading(id);
    try {
      const response = await fetch(`${apiUrl}/admin/complaints/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action_notes: verificationNotes })
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(`Complaint verified! Seller warning level is now: ${data.new_warning_level}`);
        setSelectedComplaintId(null);
        setVerificationNotes('');
        fetchComplaints();
      } else {
        alert(data.error || 'Failed to verify complaint.');
      }
    } catch (err) {
      console.error('Error verifying complaint:', err);
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
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {complaint.issue_type}
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

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 italic">
                  "{complaint.description}"
                </div>

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

                {complaint.status === 'Open' && (
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    {selectedComplaintId === complaint.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={verificationNotes}
                          onChange={(e) => setVerificationNotes(e.target.value)}
                          placeholder="Admin notes (e.g. Strike applied)..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-kirana-500 outline-none h-16 resize-none"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleVerify(complaint.id)}
                            disabled={actionLoading === complaint.id}
                            className="flex-1 py-2 bg-crimson text-white text-xs font-bold rounded-lg hover:bg-crimson/90 transition-colors"
                          >
                            {actionLoading === complaint.id ? 'Processing...' : 'Verify & Apply Strike'}
                          </button>
                          <button
                            onClick={() => setSelectedComplaintId(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
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
                        Verify Complaint (Seller Strike)
                      </button>
                    )}
                  </div>
                )}

                {complaint.status === 'Closed' && complaint.is_verified && (
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Verified & Seller Strike Applied</span>
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
