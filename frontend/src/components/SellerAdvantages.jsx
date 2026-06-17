import React, { useState } from 'react';
import { Coins, Sparkles, Store, Users, TrendingDown, Clock, Zap, FileText, Database, Award } from 'lucide-react';

const SellerAdvantages = () => {
  const [advantagesTab, setAdvantagesTab] = useState('store');

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-6">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
        <div>
          <h3 className="text-base font-black text-slate-900">Why Should Kirana Stores Join MyKiranam?</h3>
          <p className="text-[11px] text-slate-400 font-semibold">Turn your kirana shop into an online store and scale your neighborhood business</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none space-x-2 border-b border-slate-150">
        {[
          { id: 'store', label: '🏪 Store & Sales' },
          { id: 'flexibility', label: '⚡ Flexibility' },
          { id: 'database', label: '🗄️ Price Database' },
          { id: 'growth', label: '📈 Digital Growth' },
          { id: 'operations', label: '📦 Operations' },
          { id: 'benefits', label: '🏆 Key Benefits' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdvantagesTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              advantagesTab === tab.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-50 text-slate-655 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="mt-4 animate-fade-in">
        {advantagesTab === 'store' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Store className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">1. Turn Shop Into Online Store</h4>
                  </div>
                  <p className="text-[11px] text-slate-505 leading-relaxed">
                    Your shop is no longer limited to walk-in customers. Customers in your area discover you online, request quotes, and place grocery orders directly from their phones.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Limited to walk-in physical customers</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Hyperlocal online store discovery</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">2. Reach More Nearby Customers</h4>
                  </div>
                  <p className="text-[11px] text-slate-505 leading-relaxed">
                    Tap into a wider audience of nearby families and tech-savvy households who prefer sending lists and planning pickups online.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Relying on foot traffic near your store</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Expand digital footprint across neighborhood</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingDown className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">3. Increase Sales Without Branches</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Grow your business digitally and receive orders online even when customers are not visiting your physical shop. No expansion overheads.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Costly expansion to open new branches</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Zero-cost digital branch expansion</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'flexibility' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Clock className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">4. Convert Slow Hours Into Revenue</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Many stores experience periods with few walk-ins. Instead of waiting, stay online, accept orders, prepare quotes, and generate additional revenue.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Empty store hours translate to zero sales</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Turn idle hours into active digital revenue</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">5. Go Online/Offline Whenever You Want</h4>
                  </div>
                  <p className="text-[11px] text-slate-555 leading-relaxed">
                    You control your availability. Go online or offline anytime. Accept orders only when it's convenient for you. No rigid fixed schedules.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Tied to fixed, exhausting physical opening timings</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Dynamic online availability toggle</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'database' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><FileText className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">6. No Daily Price Writing On Chittis</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Sellers enter prices manually at first. Over time, products and prices are stored in your system. Update prices once and reuse them for future quotes.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Rewriting prices on paper chittis repeatedly</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Smart digital chitti quotation creator</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Database className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">7. Build Your Own Price Database</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Every quotation helps build your store database. In a few weeks, frequently sold products and previous prices are instantly available, reducing repetitive tasks.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Remembering rates or searching registers</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Automatic catalog & price memory database</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">8. Faster Order Processing</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Use historical product data instead of manually calculating every order. Speed up your billing, quotation creation, and checkout.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Manual calculations taking 5-10 mins per customer</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Lightning fast quotes and billing processing</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'growth' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingDown className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">9. Compete With Large Platforms</h4>
                  </div>
                  <p className="text-[11px] text-slate-555 leading-relaxed">
                    Compete digitally with quick-commerce apps by offering online visibility, digital ordering, customer ratings, and quotations, without losing personal relationships.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Losing business to big online quick-commerce platforms</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Equal digital footing with local edge</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">10. Build A Digital Customer Base</h4>
                  </div>
                  <p className="text-[11px] text-slate-555 leading-relaxed">
                    Let customers find you online, reorder easily, save your shop as a favorite, and rate your service. Over time, this creates a loyal digital customer list.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> No records or way to engage regular shoppers</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Build a traceable, loyal digital database</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Sparkles className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">11. Understand Local Market Trends</h4>
                  </div>
                  <p className="text-[11px] text-slate-555 leading-relaxed">
                    MyKiranam helps you understand frequently requested items, popular products, customer demand, and seasonal demand changes to stock items effectively.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Blocked capital in slow-moving dead inventory</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Optimal inventory stocking via demand insights</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'operations' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">📦</span>
                    <h4 className="text-xs font-bold text-slate-800">12. Pure Pickup Model</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Unlike typical platforms, customer picks up order directly. No extra management, no extra expenses, and no disputes. Focus strictly on order preparation.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> High commissions (15-30%) and logistics hassles</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Zero-commission pickup ecosystem</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">13. Save Time and Energy</h4>
                  </div>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    Avoid repeatedly writing prices, creating quotations manually, and searching for product rates. MyKiranam helps reuse previous data and simplify daily operations.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-150/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><XIcon className="w-3 h-3 mr-1" /> Tiring and repetitive manual coordination</span>
                  <span className="text-emerald-600 font-bold flex items-center"><CheckIcon className="w-3 h-3 mr-1" /> Streamlined digital workflows saving hours daily</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'benefits' && (
          <div className="space-y-6">
            {/* Grid of Main Benefits Checklist */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-800 mb-4 flex items-center">
                <Award className="w-4 h-4 mr-1 text-amber-500" /> Main Benefits For Sellers
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Receive Online Orders',
                  'Increase Daily Sales',
                  'Turn Your Shop Into An Online Store',
                  'Build A Product Price Database',
                  'Save Time Creating Quotations',
                  'Go Online Whenever You Want',
                  'Convert Slow Hours Into Revenue',
                  'Understand Customer Demand',
                  'Compete Digitally',
                  'Grow Without Opening New Branches'
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                    <span className="text-emerald-600 font-extrabold">✅</span>
                    <span className="text-xs font-bold text-slate-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* One Line Summary Banner */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-2xl shadow-md text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Store className="w-24 h-24" />
              </div>
              <span className="block text-[10px] font-black uppercase tracking-widest text-amber-100 mb-1">One Line Summary</span>
              <p className="text-sm font-black md:text-base leading-snug">
                "When there are no customers in your shop, your shop can still receive customers online."
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Fallbacks for icons
const CheckIcon = ({ className }) => (
  <span className={className}>✓</span>
);

const XIcon = ({ className }) => (
  <span className={className}>✗</span>
);

export default SellerAdvantages;
