import React, { useState } from 'react';
import { User, Sparkles, Coins, X, Check, Zap, Clock, FileText, Ban, TrendingDown, Eye, CheckCircle2, RefreshCw, Users, Heart, ShieldCheck, Star, Award, ShoppingBag } from 'lucide-react';

const CustomerAdvantages = () => {
  const [advantagesTab, setAdvantagesTab] = useState('comparison');

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md space-y-6">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
        <div>
          <h3 className="text-base font-black text-slate-900">Why Choose MyKiranam?</h3>
          <p className="text-[11px] text-slate-400 font-semibold">Your complete customer value proposition & smart shopping advantages</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none space-x-2 border-b border-slate-150">
        {[
          { id: 'comparison', label: '⚖️ Price Comparison' },
          { id: 'money', label: '💰 Money Saving' },
          { id: 'time', label: '⚡ Time Saving' },
          { id: 'impulse', label: '🎯 No Impulse' },
          { id: 'quality', label: '🛡️ Quality' },
          { id: 'returns', label: '🔄 Returns' },
          { id: 'trust', label: '🤝 Trust & Local' },
          { id: 'difference', label: '⚖️ The Difference' }
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

        {advantagesTab === 'money' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">1. No Convenience Fees</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pick up your ready order from the nearby shop. Pay only for the groceries you purchase.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Convenience/Handling/Surge Fees on Other Apps</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> MyKiranam: Zero Hidden Charges</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">2. No Hidden Charges</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Know the exact price of your items before you visit the store with our transparent quotation system.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Extra Packaging/Platform/Surge Fees</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Transparent Quote upfront</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><PercentIcon className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">3. Local Kirana Pricing</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Receive competitive pricing directly from nearby stores. Compare prices across neighborhood sellers.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Support neighborhood local merchants</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Best local prices & shop comparison</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">4. No Membership Charges</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No premium plans or monthly subscription traps. Every feature is available for free.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Subscription required for features</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> 100% Free access for all users</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'time' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">5. No Long Shopping Trips</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Instead of traveling, finding parking, searching for items, and standing in queues, just pick up a ready-packed order.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Traditional trips: 30 mins to 2 hours</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> MyKiranam: 5 to 15 minutes quick pickup</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Clock className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">6. No Waiting In Billing Queues</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Skip the weekend crowds and endless queues at supermarkets. Your items are pre-billed and packed.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Standing in billing queues for hours</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Order ready in advance, grab and go</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">7. No Searching Through Aisles</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No need to wander around looking for items. Simply submit your grocery list once, and let the seller compile it for you.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Finding products in huge aisles</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Submit list, seller collects all items</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><FileText className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">8. Digital Grocery Planning</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Create clean digital lists. Avoid paper list clutter, prevent forgetting items, and repeat orders with a single tap.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Zero lost paper slips or forgotten list items</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Easy template repeats & instant sharing</span>
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">9. No App Browsing & Comparison Fatigue</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Stop wasting hours browsing products, checking availability, and comparing prices across 3-4 different delivery apps. Submit your list once, and get instant quotes directly from nearby shops.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Switching between multiple apps to compare items & prices</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> One-time list submission, receive direct local quotations</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'impulse' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingDown className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">10. Avoid Unplanned Purchases</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Supermarkets are designed to trigger impulse purchases like snacks, chocolates, and drinks near checkout. Stick strictly to your list on MyKiranam.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Entering for ₹2,000, leaving with ₹3,000 bill</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Spend exactly what you budgeted</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">11. No Quantity Regret</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Don\'t fall for "Buy 5kg and save 10%" deals when you only need 1kg. Buy only the exact quantity you require.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Forced bulk offers wasting money</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Custom precise quantities</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">12. No surprise Billing Shock</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Know the final amount in advance. In supermarkets, you only find out the total when items are scanned at checkout.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Surprise total of ₹3,200 (estimated ₹2,000)</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> View and accept quote before purchase</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'quality' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Eye className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">13. Inspect Before Paying</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Check the physical condition, brands, and expiry dates of products at the counter before handing over any payment.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Discovering bad items after delivery driver leaves</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Verify physical condition prior to payment</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">14. Verify Product Quality Personally</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ensure freshness of items like vegetables, eggs, and dairy products. If you are not satisfied, reject the product instantly.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Spoiled/bruised goods delivered in opaque bags</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Direct tactile/visual inspection</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Sparkles className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">15. Verify Correct Brand</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sellers might substitute brands on standard delivery apps without asking. At the kirana, reject unauthorized brand replacements immediately.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Unwanted brand swaps by delivery app packers</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Keep original requested brands only</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Clock className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">16. Verify Expiry Date</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Check the manufacturing and expiry date of packaged foods yourself, avoiding near-expiry items that delivery packers clear out.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Near-expiry inventory dumped on online orders</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Pick fresh stocks with peace of mind</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'returns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><RefreshCw className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">17. No Waiting For Refunds</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Issues are caught before purchase. Since you inspect goods at pickup before paying, no refund tickets need to be raised.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Waiting 3-5 days for online refund approvals</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Zero-refund process, zero wallet lockup</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">18. Minimal Refund Disputes</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Because physical verification happens at the counter, payment is completed after full satisfaction. Disputes are virtually eliminated.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Arguing with customer support bots</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Mutual agreement directly with shop owner</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><RefreshCw className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">19. Instant Replacement</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    If an item is damaged or incorrect, the shopkeeper can swap it immediately from their shelves while you are at the shop.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Scheduling replacement courier slots</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Instant swap at checkout counter</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Zap className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">20. Faster Problem Resolution</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No middleman customer service agents. Resolve quantity or item changes instantly by talking directly to the shop owner.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Exchanging tickets and waiting hours for replies</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Real-time human interaction</span>
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">21. No Return Pickup Delays</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Since you haven't taken the product home yet, returning unsatisfactory items requires zero return pick-up arrangements.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Staying home waiting for a return pickup agent</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Leave unwanted items at the store instantly</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'trust' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Star className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">22. Seller Ratings</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Customers rate shops based on accuracy, pricing, and speed. Top-rated reliable stores receive higher visibility on the app.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Direct feedback Loop rewards good service</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">23. Customer Ratings & Trust Score</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sellers also rate buyers. Keeping pickups prompt and avoiding false order cancellations increases your priority queue ranking.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> High-trust customers get faster quote response</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">24. Balanced Marketplace</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A fair ecosystem where both buyer and seller are accountable for their actions, creating mutual trust and community bonding.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Prevents fraud or abuse from either side</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Heart className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">25. Support Local Kirana Stores</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Your money stays within the local community, supporting neighborhood economy and local shopkeepers instead of corporate giants.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Keep 100% money in the local economy</span>
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300 sm:col-span-2">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><User className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">26. Trusted Nearby Sellers</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Buy groceries from shops you already know, run by friendly neighbors whom you trust and interact with daily.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Personalized service from familiar faces</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'difference' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl">
              <h4 className="text-xs font-bold text-amber-900 mb-3 flex items-center"><Sparkles className="w-4 h-4 mr-1 text-amber-600" /> The MyKiranam Difference</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red side */}
                <div className="bg-white p-4 rounded-xl border border-red-100 space-y-2.5">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block bg-red-50 px-2 py-0.5 rounded-lg w-max">Instead Of:</span>
                  <ul className="space-y-2 text-[11px] text-slate-655 font-medium">
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Long, tiring supermarket visits</li>
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> High convenience charges & surge pricing</li>
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Platform fees & packing charges</li>
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Slow, frustrating online refund delays</li>
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Unplanned impulse spending at checkout</li>
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Surprise billing shocks</li>
                    <li className="flex items-start"><X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" /> Wasting time comparing 3-4 delivery apps</li>
                  </ul>
                </div>

                {/* Green side */}
                <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-2.5 shadow-sm shadow-emerald-50">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block bg-emerald-50 px-2 py-0.5 rounded-lg w-max">MyKiranam Provides:</span>
                  <ul className="space-y-2 text-[11px] text-slate-800 font-bold">
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Planned, budget-controlled shopping</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Transparent quotations before purchase</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Ready-for-pickup orders prepared for you</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Direct product verification before payment</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Zero convenience or hidden fees</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Smart spending & better budget control</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Rapid pickup saving your valuable time</li>
                    <li className="flex items-start"><Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" /> Supporting local neighborhood shops</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {advantagesTab === 'comparison' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><TrendingUpIcon className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">1. Instant Local Estimates</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Our AI Price Engine searches recent order histories to estimate basket costs across neighborhood stores instantly.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-slate-550 flex items-center"><Check className="w-3 h-3 mr-1" /> Estimated quotes without bothering sellers</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Coins className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">2. Find the Cheapest Shop</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Identify which nearby merchant offers the absolute lowest total estimate for your specific list of items.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Compare full basket prices side-by-side</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Ban className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">3. Save Time & Avoid App Fatigue</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Stop wasting hours browsing products and checking availability across 3-4 different quick-commerce apps. Submit your list once.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-red-500 flex items-center"><X className="w-3 h-3 mr-1" /> Manual app switching comparison</span>
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> One-click comprehensive analysis</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">4. Support Local Merchants</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Empower friendly neighborhood shopkeepers digitally while keeping your hard-earned money in the local economy.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Healthy, community-centric commerce</span>
                </div>
              </div>

              {/* Card 5 */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all duration-300">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><ShoppingBag className="w-4 h-4" /></span>
                    <h4 className="text-xs font-bold text-slate-800">5. Online App Benchmarks</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Compare estimated local store quotes against quick-commerce apps (including handling charges) to visualize your savings.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-155/50 flex flex-col space-y-1 text-[10px]">
                  <span className="text-emerald-600 font-bold flex items-center"><Check className="w-3 h-3 mr-1" /> Clear visibility into real-time savings</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Fallback/Alias icons for non-existent lucide icons if any
const PercentIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19"></line>
    <circle cx="6.5" cy="6.5" r="2.5"></circle>
    <circle cx="17.5" cy="17.5" r="2.5"></circle>
  </svg>
);

const TrendingUpIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

export default CustomerAdvantages;
