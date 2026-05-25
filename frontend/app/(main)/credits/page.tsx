'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, ArrowRight, ArrowUpRight, TrendingUp, History, 
  CreditCard, Send, Sparkles, Clock, ChevronRight,
  ShieldCheck, Loader2, Filter, Download, Award, Star, Compass, Layout, Flame, Eye, CheckCircle2, Shield, Gift, Ticket
} from 'lucide-react'
import { useAuth } from '@/app/context/AuthContext'
import { creditService, storageService } from '@/lib/supabase'
import Badge from '@/components/Badge'
import Avatar from '@/components/Avatar'
import CreditPurchaseModal from '@/components/CreditPurchaseModal'
import ShareCreditsModal from '@/components/ShareCreditsModal'

const TIERS = [
  { 
    name: 'Nomad', 
    level: '1+', 
    tagline: 'The Journey Begins',
    details: { fee: '10%', bonus: '0%', intents: '10', tribes: '3' },
    icon: Compass, 
    color: 'bg-blue-500' 
  },
  { 
    name: 'Architect', 
    level: '10+', 
    tagline: 'Master of Structure',
    details: { fee: '8%', bonus: '2%', intents: '20', tribes: '5' },
    icon: Layout, 
    color: 'bg-emerald-500' 
  },
  { 
    name: 'Luminary', 
    level: '25+', 
    tagline: 'Vanguard of Influence',
    details: { fee: '5%', bonus: '5%', intents: '30', tribes: '8' },
    icon: Flame, 
    color: 'bg-orange-500' 
  },
  { 
    name: 'Oracle', 
    level: '50+', 
    tagline: 'Soul of the Network',
    details: { fee: '2%', bonus: '10%', intents: '40', tribes: '12' },
    icon: Eye, 
    color: 'bg-[#FF85BB]' 
  },
]

export default function CreditsPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isLedgerOpen, setIsLedgerOpen] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [showTierComparison, setShowTierComparison] = useState(false)
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [fetchingRedemptions, setFetchingRedemptions] = useState(true)

  const fetchTransactions = async () => {
    try {
      const data = await creditService.getMyTransactions()
      setTransactions(data || [])
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRedemptions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/credits/redemptions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setRedemptions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch redemptions:', err)
    } finally {
      setFetchingRedemptions(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
    fetchRedemptions()
  }, [])

  const handleActionSuccess = () => {
    refreshUser()
    fetchTransactions()
  }

  if (!user) return null

  const currentTier = TIERS.find(t => t.name === (user.tier || 'Nomad')) || TIERS[0]
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1]

  return (
    <div className="max-w-[1500px] mx-auto space-y-12 pb-20 mt-0 px-2 md:px-0">
      
      {/* ─── WALLET HERO ─── */}
      <section className="relative overflow-hidden rounded-[3rem] bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)] p-8 md:p-16 border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[var(--color-accent)]/20 to-transparent rounded-full blur-[120px] opacity-40 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF85BB]/10 rounded-full blur-[100px] opacity-20 pointer-events-none" />        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-12">
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-accent)] block mb-4 italic opacity-80">Available Capital</span>
              <div className="flex items-baseline gap-4 justify-center lg:justify-start">
                <h1 className="text-8xl md:text-[10rem] font-serif font-black italic tracking-tighter leading-none">
                  {user.credits || 0}
                </h1>
                <span className="text-xl md:text-3xl font-serif font-black uppercase tracking-tight opacity-40">Creds</span>
              </div>
            </div>

             <div className="flex flex-wrap md:flex-nowrap gap-3 justify-center lg:justify-start mt-10 md:mt-14">
                <button 
                  onClick={() => setIsPurchaseOpen(true)}
                  className="w-full md:w-auto px-6 py-4 bg-[var(--color-accent)] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 order-1"
                >
                  <Zap size={14} fill="currentColor" />
                  Top Up
                </button>
                <button 
                  onClick={() => setIsShareOpen(true)}
                  className="flex-1 md:flex-none px-6 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 order-2"
                >
                  <Send size={14} />
                  Transfer
                </button>
                <button 
                  onClick={() => router.push('/credits/exchange')}
                  className="flex-1 md:flex-none px-6 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 order-3"
                >
                  <Gift size={14} />
                  Redeem
                </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:max-w-md mt-6 lg:mt-0">
             <div className="bg-white/5 backdrop-blur-md p-4 md:p-10 rounded-2xl md:rounded-[3rem] border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--color-accent-soft)]/20 rounded-xl md:rounded-2xl flex items-center justify-center text-[var(--color-accent)] mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                   <TrendingUp size={20} className="md:w-6 md:h-6" />
                </div>
                <p className="text-xl md:text-3xl font-serif font-black italic tracking-tight text-white">Lvl {user.level || 1}</p>
                <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mt-1 md:mt-2">Reputation</p>
             </div>
             <div className="bg-white/5 backdrop-blur-md p-4 md:p-10 rounded-2xl md:rounded-[3rem] border border-white/10 hover:border-white/20 transition-all group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-white/60 mb-3 md:md:mb-6 group-hover:scale-110 transition-transform">
                   <Shield size={20} className="md:w-6 md:h-6" />
                </div>
                <p className="text-xl md:text-3xl font-serif font-black italic tracking-tight text-white">{user.tier || 'Nomad'}</p>
                <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mt-1 md:mt-2">Economic</p>
             </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFTSIDE: TRANSACTION HISTORY */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-[var(--color-accent-soft)]/20 rounded-2xl">
                    <History size={24} className="text-[var(--color-accent)]" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-serif font-black tracking-tight text-[var(--color-text-primary)]">Ledger.</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)] opacity-40 mt-1">Transaction Feed</p>
                 </div>
              </div>
           </div>

           <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[3rem] overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-[var(--color-border)]">
                       <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-text-secondary)] opacity-50">Identity / Operation</th>
                       <th className="hidden md:table-cell px-8 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-text-secondary)] opacity-50">Category</th>
                       <th className="hidden sm:table-cell px-8 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-text-secondary)] opacity-50">Date</th>
                       <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-text-secondary)] opacity-50 text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[var(--color-border)]">
                     {loading ? (
                        [1,2,3,4].map(i => (
                           <tr key={i} className="animate-pulse">
                              <td colSpan={4} className="px-8 py-8"><div className="h-4 bg-[var(--color-bg-primary)] rounded w-full opacity-50" /></td>
                           </tr>
                        ))
                     ) : transactions.length === 0 ? (
                        <tr>
                           <td colSpan={4} className="px-8 py-20 text-center">
                              <div className="max-w-xs mx-auto space-y-4 opacity-30 text-[var(--color-text-secondary)]">
                                 <History size={48} className="mx-auto" />
                                 <p className="text-xs font-black uppercase tracking-widest">No activity recorded yet.</p>
                              </div>
                           </td>
                        </tr>
                     ) : (
                       transactions.slice(0, 10).map((tx) => (
                         <tr key={tx.id} className="hover:bg-[var(--color-bg-primary)]/50 transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                   tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                 }`}>
                                    {tx.amount > 0 ? <ArrowRight size={18} /> : <Send size={18} />}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text-primary)]">{tx.type.replace('_', ' ')}</p>
                                    <p className="text-[10px] text-[var(--color-text-secondary)] opacity-60 uppercase">ID: {tx.id.toString().slice(-8).toUpperCase()}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="hidden md:table-cell px-8 py-6">
                              <Badge 
                                variant={tx.type === 'PURCHASE' ? 'accent' : 'secondary'} 
                                className="text-[8px] font-black uppercase tracking-widest"
                              >
                                 {tx.type}
                              </Badge>
                           </td>
                           <td className="hidden sm:table-cell px-8 py-6">
                              <p className="text-[10px] font-bold text-[var(--color-text-secondary)]">
                                 {new Date(tx.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                 })}
                              </p>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <span className={`text-sm font-black tracking-tighter ${
                                tx.amount > 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                 {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </span>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                </table>
             </div>
             {transactions.length > 0 && (
                <div className="p-8 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/30 flex items-center justify-center">
                   <button 
                     onClick={() => setIsLedgerOpen(true)}
                     className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] flex items-center gap-2 hover:gap-4 transition-all"
                   >
                      View full ledger <ChevronRight size={14} />
                   </button>
                </div>
             )}
           </div>
        </div>

        {/* RIGHTSIDE: RANK ECOSYSTEM */}
        <div className="space-y-6">
           <div className="bg-[var(--color-bg-secondary)] rounded-[2.5rem] p-8 space-y-8 shadow-2xl border border-[var(--color-border)] relative overflow-hidden group">
              {/* Creative Background Elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[var(--color-accent)]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--color-accent)]/20 transition-all duration-1000" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)] rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-500">
                         <Ticket size={28} />
                      </div>
                      <div>
                         <h3 className="text-xl font-serif font-black text-[var(--color-text-primary)] tracking-tighter uppercase italic">Voucher Vault</h3>
                         <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]">Your Digital Assets</p>
                      </div>
                  </div>
                  <div className="flex -space-x-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                     <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]/30 ml-1" />
                  </div>
              </div>

              <div className="space-y-6 pt-2 relative z-10">
                 {fetchingRedemptions ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                       <div className="w-10 h-10 border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] rounded-full animate-spin" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] opacity-40">Decrypting Vault...</span>
                    </div>
                 ) : redemptions.length > 0 ? (
                    <div className="space-y-4">
                       {redemptions.slice(0, 3).map((r, idx) => (
                          <motion.div 
                            key={r.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative bg-[var(--color-bg-primary)] p-5 rounded-[1.5rem] border border-[var(--color-border)] group/item cursor-pointer hover:border-[var(--color-accent)]/30 hover:shadow-lg transition-all"
                            onClick={() => router.push('/credits/exchange')}
                          >
                             {/* Physical ticket punch hole look */}
                             <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--color-bg-secondary)] rounded-full border border-[var(--color-border)]" />
                             <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--color-bg-secondary)] rounded-full border border-[var(--color-border)]" />
                             
                             <div className="flex justify-between items-center">
                                <div>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-primary)] group-hover/item:text-[var(--color-accent)] transition-colors">{r.provider}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                      <code className="text-[11px] font-mono font-black text-[var(--color-text-secondary)] tracking-wider">
                                         {r.voucher_code.slice(0, 4)}••••{r.voucher_code.slice(-4)}
                                      </code>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-2xl font-serif font-black italic text-[var(--color-text-primary)] leading-none">{r.amount}</p>
                                   <p className="text-[7px] font-black uppercase tracking-widest text-[var(--color-accent)] mt-1">CR Magnitude</p>
                                </div>
                             </div>
                          </motion.div>
                       ))}
                    </div>
                 ) : (
                    <div className="py-12 bg-[var(--color-bg-primary)] rounded-[2rem] border border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-center px-6">
                       <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-[var(--color-border)]">
                          <Gift size={32} className="text-[var(--color-accent)] opacity-40" />
                       </div>
                       <h4 className="text-xs font-serif font-black text-[var(--color-text-primary)] opacity-40 italic">Vault is Offline.</h4>
                       <p className="text-[9px] font-medium text-[var(--color-text-secondary)] opacity-40 mt-1">Exchange credits to populate your asset repository.</p>
                    </div>
                 )}
              </div>

              <button 
                onClick={() => router.push('/credits/exchange')}
                className="w-full py-5 bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)] text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl hover:bg-[var(--color-accent)] hover:text-black transition-all shadow-xl shadow-black/5 group-hover:shadow-[var(--color-accent)]/10 active:scale-95 flex items-center justify-center gap-3"
              >
                Access Marketplace <ArrowRight size={14} />
              </button>
           </div>

           <div className="bg-[#001233] rounded-[2.5rem] p-8 relative overflow-hidden group border border-white/5">
              <Sparkles size={28} className="text-[var(--color-accent)] mb-6 group-hover:rotate-12 transition-transform" />
              <h4 className="text-xl font-serif font-black italic tracking-tight text-white mb-3">Upgrade Path.</h4>
              <p className="text-[10px] font-medium text-white/50 leading-relaxed mb-6">
                 Growth on Collixa is purely Meritocratic. Perform Intents, gain XP, and let your reputation mineralize into economic power. 
              </p>
              <div className="space-y-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-accent)]">Key Rewards:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white/5 text-white/40 border-white/10 text-[7px] uppercase">Governance</Badge>
                  <Badge variant="secondary" className="bg-white/5 text-white/40 border-white/10 text-[7px] uppercase">0% Fees</Badge>
                  <Badge variant="secondary" className="bg-white/5 text-white/40 border-white/10 text-[7px] uppercase">Priority</Badge>
                </div>
              </div>
           </div>
        </div>

      </div>

      {/* ─── TIER COMPARISON MODAL ─── */}
      <AnimatePresence>
        {showTierComparison && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTierComparison(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
               <div className="p-10 border-b border-black/5 bg-[#F8F9FA] flex justify-between items-center">
                  <div>
                    <h2 className="text-4xl font-serif font-black tracking-tight italic text-[#001233]">The Ascent Protocol.</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black/30 mt-2">MERITOCRATIC RANKING & BENEFITS ENGINE</p>
                  </div>
                  <button onClick={() => setShowTierComparison(false)} className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
                    <X size={20} className="text-black/40" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TIERS.map((t) => (
                      <div key={t.name} className={`p-6 rounded-[2.5rem] border transition-all ${user.tier === t.name ? 'bg-[#001233] border-[#001233] shadow-2xl' : 'bg-white border-black/5'}`}>
                        <div className={`w-12 h-12 rounded-2xl ${user.tier === t.name ? 'bg-[var(--color-accent)] text-black' : 'bg-black/5 text-black/40'} flex items-center justify-center mb-6`}>
                           <t.icon size={24} />
                        </div>
                        <h3 className={`text-2xl font-serif font-black italic mb-1 ${user.tier === t.name ? 'text-[var(--color-accent)]' : 'text-black'}`}>{t.name}</h3>
                        <p className={`text-[8px] font-black uppercase tracking-widest ${user.tier === t.name ? 'text-white/40' : 'text-black/20'}`}>Lvl {t.level} Access</p>
                        
                        <div className="mt-8 space-y-4">
                           <BenefitCompact label="Fee" value={t.details.fee} active={user.tier === t.name} />
                           <BenefitCompact label="Bonus" value={t.details.bonus} active={user.tier === t.name} />
                           <BenefitCompact label="Limits" value={`${t.details.intents}/mo`} active={user.tier === t.name} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#001233] p-10 rounded-[3rem] text-white">
                     <div className="grid md:grid-cols-3 gap-12">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Process.</h4>
                           <p className="text-[12px] font-medium text-white/50 leading-relaxed italic">"Credits are earned by provide value. XP is gained by consistent engagement."</p>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Benefits.</h4>
                           <p className="text-[12px] font-medium text-white/50 leading-relaxed">Higher levels reduce your platform overhead by up to 80% and unlock administrative governance powers.</p>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Rewards.</h4>
                           <p className="text-[12px] font-medium text-white/50 leading-relaxed">Early access to beta intents, prioritized support, and direct influence on the protocol's evolution.</p>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODALS ─── */}
      <CreditPurchaseModal isOpen={isPurchaseOpen} onClose={() => { setIsPurchaseOpen(false); handleActionSuccess(); }} />
      <ShareCreditsModal isOpen={isShareOpen} onClose={() => { setIsShareOpen(false); handleActionSuccess(); }} />
      
      {/* ─── FULL LEDGER MODAL ─── */}
      <AnimatePresence>
        {isLedgerOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/5 backdrop-blur-md" onClick={() => setIsLedgerOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="relative w-full max-w-6xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="flex items-center justify-between p-8 md:p-10 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/50">
                  <div>
                    <h2 className="text-4xl font-serif font-black tracking-tight italic text-[var(--color-text-primary)]">Full Ledger.</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--color-text-secondary)] opacity-40 mt-2">Complete transaction archival</p>
                  </div>
                  <button onClick={() => setIsLedgerOpen(false)} className="w-12 h-12 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-primary)] transition-colors">
                     <ArrowRight size={20} className="rotate-45" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] opacity-50">Operation</th>
                        <th className="hidden md:table-cell px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] opacity-50">Context</th>
                        <th className="hidden sm:table-cell px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] opacity-50">Date</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.4em] opacity-50 text-right">Magnitude</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/30">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[var(--color-bg-primary)]/50 transition-colors">
                          <td className="px-6 py-6 font-black text-[var(--color-text-primary)] uppercase tracking-widest text-[10px]">{tx.type}</td>
                          <td className="hidden md:table-cell px-6 py-6 text-[10px] text-[var(--color-text-secondary)]">ID: {tx.id.toString().toUpperCase()}</td>
                          <td className="hidden sm:table-cell px-6 py-6 text-[10px] font-bold text-[var(--color-text-secondary)]">{new Date(tx.created_at).toLocaleString()}</td>
                          <td className={`px-6 py-6 text-right text-base font-serif font-black italic ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BenefitRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-black/[0.03]">
       <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{label}</span>
       <span className="text-[11px] font-black text-[#001233]">{value}</span>
    </div>
  )
}

function BenefitCompact({ label, value, active }: any) {
  return (
    <div className="flex justify-between items-center">
       <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-white/40' : 'text-black/30'}`}>{label}</span>
       <span className={`text-[11px] font-black ${active ? 'text-[var(--color-accent)]' : 'text-[#001233]'}`}>{value}</span>
    </div>
  )
}

function X({ size, className }: any) {
  return <ArrowRight size={size} className={`rotate-45 ${className}`} />
}
