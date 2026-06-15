import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, X, Package, Database, HelpCircle, AlertCircle, PlusCircle, Upload, CheckCircle2, FileText } from 'lucide-react';

const MyProducts = () => {
  const { token, apiUrl } = useAuth();
  const { playSoundAlert } = useSocket();

  // Catalog State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    price: '',
    quantity: '',
    unit: 'KG'
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Catalog Upload States
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // View mode: 'catalog' or 'analytics'
  const [viewMode, setViewMode] = useState('catalog');

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({ todaySummary: { todayProductsSold: 0, todayRevenue: 0, todayOrders: 0 }, report: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('Today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDownloadSample = () => {
    const headers = ['Product Name', 'Category', 'Price', 'Quantity', 'Unit'];
    const rows = [
      ['Rice', 'Groceries', '60', '100', 'KG'],
      ['Sugar', 'Groceries', '45', '50', 'KG'],
      ['Oil', 'Groceries', '150', '30', 'Liter']
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kiranam_sample_catalog.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCatalogUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');
    setValidationErrors([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiUrl}/seller-products/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setUploadSuccess(data.message || 'Catalog uploaded successfully!');
        playSoundAlert('success');
        fetchProducts(); // Refresh products list instantly!
      } else {
        setUploadError(data.error || 'Failed to upload catalog.');
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details);
        }
      }
    } catch (err) {
      console.error('Error uploading catalog:', err);
      setUploadError('Network connection error.');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const units = ['KG', 'Gram', 'Litre', 'Packet', 'Piece', 'Dozen', 'Box'];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        category: selectedCategory,
        page: page.toString(),
        limit: '10'
      });

      const response = await fetch(`${apiUrl}/seller-products/my-products?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        dateFilter,
        startDate,
        endDate
      });

      const response = await fetch(`${apiUrl}/seller-products/sales-analytics?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error fetching sales analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const queryParams = new URLSearchParams({
        dateFilter,
        startDate,
        endDate
      });

      const response = await fetch(`${apiUrl}/seller-products/download-report?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SalesReport_${dateFilter.replace(/\s+/g, '_')}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        playSoundAlert('success');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to download report.');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Error downloading report.');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter, startDate, endDate]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setFormData({
      product_name: '',
      category: 'Groceries',
      price: '',
      quantity: '',
      unit: 'KG'
    });
    setFormError('');
    setSuccessMsg('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      product_name: product.product_name,
      category: product.category || 'General',
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      unit: product.unit
    });
    setFormError('');
    setSuccessMsg('');
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.price || !formData.quantity || !formData.unit) {
      setFormError('All fields except category are mandatory.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const response = await fetch(`${apiUrl}/seller-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || 'Product added successfully!');
        playSoundAlert('success');
        setTimeout(() => {
          setShowAddModal(false);
          fetchProducts();
        }, 1200);
      } else {
        setFormError(data.error || 'Failed to add product.');
      }
    } catch (err) {
      setFormError('Network connection error.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.price || !formData.quantity || !formData.unit) {
      setFormError('All fields except category are mandatory.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const response = await fetch(`${apiUrl}/seller-products/${currentProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message || 'Product updated successfully!');
        playSoundAlert('success');
        setTimeout(() => {
          setShowEditModal(false);
          fetchProducts();
        }, 1200);
      } else {
        setFormError(data.error || 'Failed to update product.');
      }
    } catch (err) {
      setFormError('Network connection error.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this product from your catalog?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/seller-products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        playSoundAlert('success');
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete product.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 px-2 sm:px-4">
      
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">My Product Catalog</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Manage stock availability and retail prices</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-2.5 px-4 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.98] flex items-center space-x-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4 text-amber-400" />
          <span>Add Custom Product</span>
        </button>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Products Sold */}
        <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 hover:from-indigo-500/10 hover:to-purple-500/10 border border-slate-100 rounded-3xl p-5 shadow-sm transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Products Sold</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{analyticsData.todaySummary?.todayProductsSold || 0} Items</div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10 border border-slate-100 rounded-3xl p-5 shadow-sm transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Revenue</span>
            <div className="text-2xl font-black text-slate-900 mt-1">₹{(analyticsData.todaySummary?.todayRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
            <span className="text-xl font-bold">₹</span>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10 border border-slate-100 rounded-3xl p-5 shadow-sm transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Orders</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{analyticsData.todaySummary?.todayOrders || 0} Orders</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* View Mode Toggles */}
      <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md">
        <button
          onClick={() => setViewMode('catalog')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'catalog'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Inventory Catalog
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            viewMode === 'analytics'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>📊 Product Sales Report</span>
        </button>
      </div>

      {viewMode === 'catalog' ? (
        <>
          {/* Product Catalog Management Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-amber-500" />
              <span>Product Catalog Management</span>
            </h3>

            <p className="text-[11px] text-slate-500 leading-normal">
              Upload your inventory spreadsheet (Excel or CSV) to instantly publish prices and stock details to customer order screens. Existing products will be updated, and new ones will be added.
            </p>

            {uploadError && (
              <div className="p-3.5 bg-red-50 border border-red-150 rounded-2xl space-y-1.5 text-left">
                <div className="flex items-center space-x-1.5 text-red-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
                {validationErrors.length > 0 && (
                  <div className="max-h-36 overflow-y-auto pl-5 space-y-1 text-[10px] text-red-600 font-semibold border-t border-red-200/50 pt-1.5">
                    {validationErrors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {uploadSuccess && (
              <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-150 p-3 rounded-2xl text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleCatalogUpload}
                  disabled={uploadLoading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                  id="catalog-upload-input"
                />
                <button
                  type="button"
                  disabled={uploadLoading}
                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{uploadLoading ? 'Uploading...' : 'Upload Catalog'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-800 font-extrabold rounded-xl border border-slate-200 text-xs transition-all active:scale-[0.98] flex items-center justify-center space-x-1.5"
              >
                <FileText className="w-4 h-4 text-slate-550" />
                <span>Download Sample Excel / CSV</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs sm:text-sm focus:border-amber-500 focus:outline-none placeholder-slate-400 text-slate-800"
              />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-2">Filter Category:</span>
              <button
                onClick={() => { setSelectedCategory('All'); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategory === 'All'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Table Card */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-md overflow-hidden">
            {loading ? (
              <div className="py-24 text-center text-xs font-bold text-slate-400 animate-pulse">
                Fetching store catalog products...
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center space-y-3 p-6">
                <Database className="w-10 h-10 text-slate-250 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Your Catalog is Empty</h4>
                <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
                  Complete customer orders to automatically build your catalog from sales history, add products manually above, or upload an Excel catalog spreadsheet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Product Name</th>
                      <th className="py-4 px-6 text-center">Stock Quantity</th>
                      <th className="py-4 px-6 text-right">Retail Price</th>
                      <th className="py-4 px-6 text-center">Last Updated</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-extrabold text-slate-900">{prod.product_name}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[9px] uppercase font-bold">
                              {prod.category || 'General'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center font-bold">
                          {prod.quantity} {prod.unit}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-slate-900">
                          ₹{parseFloat(prod.price || 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-500 font-bold">
                          {prod.updated_at ? new Date(prod.updated_at).toLocaleDateString('en-IN') : prod.created_at ? new Date(prod.created_at).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="p-2 border border-slate-150 hover:bg-slate-50 hover:text-amber-600 text-slate-455 rounded-xl transition-all"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(prod.id)}
                              className="p-2 border border-slate-150 hover:bg-red-50 hover:text-red-650 text-slate-455 rounded-xl transition-all"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Panel */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">
                  Showing page {page} of {totalPages} ({total} items)
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Date Filter & Excel Download Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-2">Date Filter:</span>
                {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Custom Date Range'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      dateFilter === filter
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                onClick={handleDownloadExcel}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.98] flex items-center space-x-1.5 shadow-sm"
              >
                <Upload className="w-4 h-4 text-emerald-250 rotate-180" />
                <span>📥 Download Excel Report</span>
              </button>
            </div>

            {dateFilter === 'Custom Date Range' && (
              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/55 max-w-md">
                <div className="space-y-1 flex-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none text-slate-800"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sales Report Table */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-md overflow-hidden">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 p-5 border-b border-slate-50 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Product Sales Report</span>
            </h3>

            {analyticsLoading ? (
              <div className="py-24 text-center text-xs font-bold text-slate-400 animate-pulse">
                Generating Sales Report...
              </div>
            ) : analyticsData.report?.length === 0 ? (
              <div className="py-20 text-center space-y-3 p-6">
                <Database className="w-10 h-10 text-slate-250 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Sales in Selected Period</h4>
                <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
                  Try choosing a different date range or complete customer orders to generate sales data.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Product</th>
                      <th className="py-4 px-6 text-center">Price per Unit</th>
                      <th className="py-4 px-6 text-center">Qty Sold</th>
                      <th className="py-4 px-6 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {analyticsData.report?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-slate-900">{row.product_name}</td>
                        <td className="py-4 px-6 text-center text-slate-650 font-bold">
                          ₹{parseFloat(row.unit_price || 0).toFixed(2)} / {row.unit}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200/50 rounded-xl font-bold uppercase text-[10px]">
                            {row.quantity_sold} {row.unit}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-slate-900 font-extrabold">₹{parseFloat(row.revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- ADD PRODUCT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <span>Add Product Manually</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-150 rounded-2xl flex items-center space-x-1.5 text-red-750 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center space-x-1.5 text-emerald-700 text-xs font-semibold">
                  <Package className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sugar, Fortune Mustard Oil"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Vegetables, Dairy"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="e.g. 45.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unit of Measurement *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none text-slate-800 font-semibold"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {formLoading ? 'Saving product...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT PRODUCT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Edit2 className="w-4 h-4 text-amber-500" />
                <span>Edit Product Details</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-150 rounded-2xl flex items-center space-x-1.5 text-red-750 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-650 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-center space-x-1.5 text-emerald-700 text-xs font-semibold">
                  <Package className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sugar, Fortune Mustard Oil"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Groceries, Vegetables, Dairy"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="e.g. 45.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none placeholder-slate-300 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unit of Measurement *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-amber-500 focus:outline-none text-slate-800 font-semibold"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-950 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {formLoading ? 'Updating product...' : 'Update Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProducts;
