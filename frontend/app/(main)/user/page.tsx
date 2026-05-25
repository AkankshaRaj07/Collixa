'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  MessageCircle, Star, MapPin, Briefcase, Calendar, 
  ArrowLeft, ArrowUpRight, Loader2, QrCode, Target, Layers,
  Share2, Copy, Send, X, Check, CreditCard
} from 'lucide-react'
import Badge from '@/components/Badge'
import Avatar from '@/components/Avatar'
import AchievementsSection from '@/components/AchievementsSection'
import ShareCreditsModal from '@/components/ShareCreditsModal'
import { useAuth } from '@/app/context/AuthContext'
import { Intent, storageService, conversationService, skillService } from '@/lib/supabase'
import { notify } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const getLevelLabel = (level: number = 1) => {
  const labels: Record<number, string> = {
    1: 'Nomad',
    2: 'Architect',
    3: 'Luminary',
    4: 'Oracle',
    5: 'Master'
  }
  return labels[level] || 'Nomad'
}

export default function UserViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileUid = searchParams.get('uid')
  const { user, token, refreshUser } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'intents' | 'skills' | 'reviews' | 'achievements'>('intents')
  const [profileUser, setProfileUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [userIntents, setUserIntents] = useState<Intent[]>([])
  const [loadingIntents, setLoadingIntents] = useState(false)
  const [userSkills, setUserSkills] = useState<any[]>([])
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  // Sharing & Transfer States
  const [showShareModal, setShowShareModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const profileShareUrl = profileUid ? `${origin}/user?uid=${profileUid}` : '';

  useEffect(() => {
    if (!profileUid) {
      router.push('/dashboard')
      return
    }

    if (user && profileUid === user.id) {
        router.replace('/profile')
        return
    }

    const fetchProfile = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/api/auth/public/${profileUid}`)
        const data = await response.json()
        if (response.ok && data.data) {
          setProfileUser(data.data)
          fetchUserIntents(profileUid)
          fetchUserSkills(profileUid)
          fetchUserReviews(profileUid)
        } else {
          notify.error('User not found')
          router.push('/dashboard')
        }
      } catch (err) {
        console.error(err)
        notify.error('Error loading profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [profileUid, user])

  const fetchUserIntents = async (userId: string) => {
    setLoadingIntents(true)
    try {
      const response = await fetch(`${API_URL}/api/intents/user/${userId}`)
      const data = await response.json()
      if (response.ok) {
        setUserIntents(data.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingIntents(false)
    }
  }

  const fetchUserSkills = async (userId: string) => {
    setLoadingSkills(true)
    try {
      const res = await skillService.getUserSkills(userId)
      if (res.success) {
        setUserSkills(res.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSkills(false)
    }
  }

  const fetchUserReviews = async (userId: string) => {
    setLoadingReviews(true)
    try {
      const response = await fetch(`${API_URL}/api/reviews/user/${userId}`)
      const data = await response.json()
      if (response.ok) {
        setReviews(data.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleStartChat = async () => {
    if (!user || !profileUser) return
    try {
      const conversation = await conversationService.getOrCreateDirectConversation(user.id, profileUser.id)
      if (conversation) {
        router.push(`/chat?id=${conversation.id}`)
      }
    } catch (err) {
      console.error('Failed to start chat:', err)
      notify.error('Could not initiate chat.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const joinDate = profileUser?.created_at 
    ? `Joined ${new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : 'Member'

  return (
    <div className="space-y-12 mt-0">
      <main className="flex-1">
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-6">
            <div className="bg-[var(--color-bg-secondary)] bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-secondary)] to-[#021A54]/5 border border-[var(--color-border)] p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl shadow-[#021A54]/5 relative overflow-hidden group/main">
              
              {/* Dynamic Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#021A54]/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
              
              {/* Top Bar Actions */}
              <div className="absolute top-8 right-8 flex items-center gap-3 z-20">
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl text-[var(--color-text-primary)] hover:bg-[#021A54] hover:text-white transition-all shadow-sm flex items-center gap-2 group/share"
                >
                  <Share2 size={16} className="group-hover/share:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Share Identity</span>
                </button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 relative z-10">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="relative shrink-0">
                       <Avatar
                        name={profileUser?.name || 'User'}
                        src={profileUser?.avatar_url ? (profileUser.avatar_url.startsWith('http') ? profileUser.avatar_url : storageService.getPublicUrl(profileUser.avatar_url)) : undefined}
                        size="xl"
                        className="ring-4 ring-[#021A54]/10"
                      />
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#021A54] text-white text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                        Verified Identity
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                      <div className="space-y-2">
                        <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight leading-none text-[#021A54] dark:text-white">
                          {profileUser?.name}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                          <div className="px-4 py-1.5 bg-[#021A54] text-white rounded-full shadow-md border border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                              <Target size={12} className="text-pink-400" />
                              Level {profileUser?.level || 1} • {getLevelLabel(profileUser?.level)}
                            </span>
                          </div>
                          {(profileUser?.gender || profileUser?.age) && (
                            <div className="px-4 py-1.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-full text-[var(--color-text-secondary)]">
                               <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                 {profileUser?.gender || ''}{profileUser?.age ? ` • ${profileUser.age} Years` : ''}
                               </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3">
                        <p className="text-[10px] font-medium tracking-[0.1em] text-[#021A54] opacity-60 lowercase font-mono">{profileUser?.email || 'community member'}</p>
                        {profileUser?.avg_rating > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-[#021A54]/10 rounded-full shadow-sm shrink-0">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-[11px] font-black text-[#021A54] dark:text-white">{profileUser.avg_rating.toFixed(1)} Rating</span>
                          </div>
                        )}
                        {profileUser?.location && (
                          <div className="flex items-center gap-1.5 opacity-60">
                             <MapPin size={12} />
                             <span className="text-[10px] font-black uppercase tracking-widest">{profileUser.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {profileUser?.bio && (
                    <div className="border-l-4 border-[#021A54] pl-6 py-2 bg-[#021A54]/5 rounded-r-3xl mt-6">
                      <p className="text-xs md:text-sm text-[#021A54] dark:text-white font-medium italic opacity-80 leading-relaxed max-w-2xl">
                        "{profileUser.bio}"
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    {profileUser?.interests?.length > 0 && (
                      <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                        {profileUser.interests.map((interest: string, idx: number) => (
                          <span key={idx} className="px-4 py-1.5 bg-pink-50/50 border border-pink-200 text-pink-600 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all cursor-default">
                            # {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {profileUser?.target_goal && (
                    <div className="bg-white border border-[#021A54]/10 p-5 md:p-6 rounded-[2rem] mt-6 relative group/goal overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/goal:opacity-10 transition-opacity">
                        <Target size={64} className="text-[#021A54]" />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#021A54] opacity-70 mb-4">Collaborative Mission</p>
                      <div className="border-l-2 border-pink-500 pl-5 py-0.5">
                        <p className="text-sm md:text-base text-[#021A54] dark:text-white font-serif font-black italic leading-relaxed">
                          "{profileUser.target_goal}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:w-[340px] space-y-6 shrink-0 pt-4 lg:pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-[#021A54]/10 text-center flex flex-col justify-center aspect-square transition-all hover:border-[#021A54] shadow-sm group">
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 group-hover:text-[#021A54] transition-colors">Reviews</p>
                      <p className="text-3xl font-serif font-black text-[#021A54]">{Math.max(reviews.length, profileUser?.total_reviews ?? 0)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-[#021A54]/10 text-center flex flex-col justify-center aspect-square transition-all hover:border-[#021A54] shadow-sm group">
                      <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 group-hover:text-[#021A54] transition-colors">Reserve</p>
                      <div className="flex flex-col items-center gap-1">
                         <div className="p-2 bg-pink-50 rounded-full mb-1">
                           <CreditCard size={16} className="text-pink-500" />
                         </div>
                         <p className="text-2xl font-serif font-black text-[#021A54]">{profileUser?.credits || 0}</p>
                         <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Creds</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleStartChat}
                      className="w-full py-5 bg-pink-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-pink-500/20 hover:bg-pink-600 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                    >
                      <MessageCircle size={18} /> Send Message
                    </button>
                    
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="w-full py-5 bg-pink-50 border-2 border-pink-500 text-pink-600 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-pink-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                      <Send size={18} /> Transfer Credits
                    </button>

                    <div className="pt-6 border-t border-[#021A54]/10 space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#021A54] opacity-50">Collaboration Impact</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Groups Involved</p>
                          <p className="text-sm font-serif font-black text-[#021A54]">{profileUser?.collaboration_stats?.total_groups || 0}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tribes & Intents</p>
                          <p className="text-sm font-serif font-black text-[#021A54]">
                            {(profileUser?.collaboration_stats?.total_tribes || 0) + (profileUser?.collaboration_stats?.total_intents || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-10">
            <div className="flex gap-5 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded-xl px-4 overflow-x-auto no-scrollbar whitespace-nowrap">
              {['intents', 'skills', 'reviews', 'achievements'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-3 text-[10px] font-black uppercase tracking-[0.3em] border-b-2 transition-all flex-shrink-0 ${activeTab === tab
                      ? 'text-[#021A54] border-[#021A54]'
                      : 'text-slate-400 border-transparent hover:text-[#021A54]'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-8 min-h-[400px]">
              {activeTab === 'intents' && (
                <div className="grid grid-cols-1 gap-6">
                  {loadingIntents ? (
                    [1, 2].map((i) => <div key={i} className="h-32 bg-[var(--color-bg-secondary)] rounded-[2rem] border animate-pulse" />)
                  ) : userIntents.length > 0 ? (
                    userIntents.map((intent) => (
                      <div
                        key={intent.id}
                        className="group bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-6 md:p-8 rounded-[2.5rem] hover:shadow-2xl hover:border-[#021A54]/20 transition-all cursor-pointer"
                        onClick={() => router.push(`/intent/${intent.id}`)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                          <div className="space-y-4 flex-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-pink-500">{intent.category || 'General'}</span>
                            <h3 className="text-2xl font-serif font-black text-[#021A54] dark:text-white group-hover:text-pink-500 transition-colors">{intent.title}</h3>
                          </div>
                          <ArrowUpRight size={28} className="text-[#021A54] opacity-20 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all hidden md:block" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-24 text-center italic opacity-30 flex flex-col items-center gap-6">
                      <Layers size={48} className="text-[#021A54]" />
                      <p className="text-[11px] font-black uppercase tracking-[0.5em]">Zero Broadcasts Originating from this Identity</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {loadingSkills ? (
                    [1, 2].map((i) => <div key={i} className="h-48 bg-[var(--color-bg-secondary)] rounded-[2rem] border animate-pulse" />)
                  ) : userSkills.length > 0 ? (
                    userSkills.map((skill) => (
                      <div key={skill.id} className="bg-white border border-[#021A54]/10 p-8 rounded-[2.5rem] hover:border-[#021A54] transition-all group flex flex-col justify-between shadow-sm hover:shadow-md">
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 bg-[#021A54]/5 border border-[#021A54]/10 rounded-full text-[#021A54]">
                              {skill.category}
                            </span>
                          </div>
                          <h4 className="text-2xl font-serif font-black text-[#021A54] group-hover:text-pink-500 transition-colors">{skill.name}</h4>
                          <p className="text-xs text-slate-500 italic mt-4 line-clamp-3 opacity-80 leading-relaxed">"{skill.description}"</p>
                        </div>
                        <div className="mt-8 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-[#021A54] opacity-40">Verified Proficiency</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-24 text-center italic opacity-30 flex flex-col items-center gap-6">
                      <Briefcase size={48} className="text-[#021A54]" />
                      <p className="text-[11px] font-black uppercase tracking-[0.5em]">No proficiency records indexed for this identity.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-8">
                  {reviews.length > 0 && (
                    <div className="bg-[#021A54] border border-[#021A54] p-10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                      
                      <div className="flex items-center gap-10 relative z-10">
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center min-w-[140px] shadow-xl">
                          <p className="text-6xl font-serif font-black text-white">
                            {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mt-2 italic">Avg. Reputation</p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5">
                            {[...Array(5)].map((_, i) => {
                              const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
                              return (
                                <Star key={i} size={24} className={i < Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'} />
                              )
                            })}
                          </div>
                          <p className="text-[12px] font-serif italic text-white/60 tracking-wide">Synthesized Consensus from {reviews.length} community sessions</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {loadingReviews ? (
                      [1, 2].map((i) => <div key={i} className="h-32 bg-[var(--color-bg-secondary)] rounded-[2rem] border animate-pulse" />)
                    ) : reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.id} className="bg-white border border-[#021A54]/10 p-10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-5 mb-6">
                             <Avatar name={review.reviewer?.name} src={review.reviewer?.avatar_url ? storageService.getPublicUrl(review.reviewer.avatar_url) : undefined} size="sm" />
                             <div>
                               <p className="text-[11px] font-black uppercase tracking-widest text-[#021A54]">{review.reviewer?.name}</p>
                               <div className="flex items-center gap-1 mt-1">
                                 {[...Array(5)].map((_, i) => (
                                   <Star key={i} size={10} className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200'} />
                                 ))}
                               </div>
                             </div>
                             <div className="ml-auto opacity-30 text-[9px] font-black uppercase tracking-widest">
                               {new Date(review.created_at).toLocaleDateString()}
                             </div>
                          </div>
                          <p className="text-sm italic text-slate-600 leading-relaxed">"{review.comment}"</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center italic opacity-30 flex flex-col items-center gap-6">
                        <Star size={48} className="text-[#021A54]" />
                        <p className="text-[11px] font-black uppercase tracking-[0.5em]">No public feedback records indexed for this identity.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'achievements' && (
                <AchievementsSection userId={profileUid} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Share Identity Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#021A54]/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-sm bg-white border border-[#021A54]/20 rounded-[3rem] p-10 text-center space-y-8 shadow-[0_30px_100px_rgba(2,26,84,0.3)] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-black italic text-[#021A54]">Identity Link</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="relative p-6 bg-[#021A54] rounded-[2.5rem] shadow-2xl">
               <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(profileShareUrl)}&color=ffffff&bgcolor=021A54`}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[8px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full shadow-lg border-2 border-[#021A54]">
                Secure QR Code
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profileShareUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                  notify.success('Identity URL Copied!')
                }}
                className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-[0.2em] text-[10px] ${copied ? 'bg-emerald-500 text-white' : 'bg-[#021A54] text-white hover:bg-black'}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied to Archive' : 'Copy Identity Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Transfer Modal */}
      {showTransferModal && profileUser && (
        <ShareCreditsModal
          isOpen={showTransferModal}
          recipientId={profileUser.id}
          recipientName={profileUser.name}
          onClose={() => {
            setShowTransferModal(false)
            refreshUser()
          }}
        />
      )}
    </div>
  )
}
