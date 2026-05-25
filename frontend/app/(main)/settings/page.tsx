'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronLeft, Bell, Lock, User, Shield, LogOut, Camera, 
  Globe, Mail, MapPin, Save, ShieldCheck 
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Card from '@/components/Card'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/context/AuthContext'
import { notify } from '@/lib/utils'

export default function SettingsPage() {
  const { user, updateUser, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile')
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    location: '',
    bio: '',
    hourlyRate: '',
    interests: [] as string[]
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        title: user.bio?.split('|')[0]?.trim() || '', // Assuming bio stores title|bio
        location: user.location || '',
        bio: user.bio?.split('|')[1]?.trim() || user.bio || '',
        hourlyRate: '$0',
        interests: user.interests || []
      })
    }
  }, [user])

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    newMessages: true,
    newApplications: true,
    weeklyDigest: true,
    marketingEmails: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      // In a real app, you would call an API here
      // For now, we simulate success
      await new Promise(r => setTimeout(r, 1000))
      notify.success('Core specifications updated successfully')
    } catch (err) {
      notify.error('Failed to update specifications')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tighter italic">Command Center</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-2">Adjust your presence in the ecosystem</p>
        </div>
        <div className="flex gap-4">
           <Button variant="outline" className="rounded-xl px-6 h-12 text-[10px] uppercase font-black tracking-widest bg-white/5 border-white/10 hover:bg-white/10">Discard</Button>
           <Button onClick={handleSaveProfile} loading={isSaving} className="rounded-xl px-8 h-12 text-[10px] uppercase font-black tracking-[0.2em] bg-[var(--color-accent)] text-black shadow-xl shadow-[var(--color-accent)]/20">Commit Changes</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--color-bg-secondary)] p-2 rounded-2xl md:rounded-full border border-[var(--color-border)] mx-4">
        {[
          { id: 'profile', label: 'Identity', icon: User },
          { id: 'notifications', label: 'Signals', icon: Bell },
          { id: 'security', label: 'Shield', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-3 py-3 md:py-4 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)] shadow-xl'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* Profile Avatar Section */}
              <Card className="p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border-[var(--color-border)] rounded-[3rem]">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <Globe size={200} />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                  <div className="relative group">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[var(--color-accent)] shadow-2xl relative">
                       <Avatar src={user?.avatar_url} name={formData.name} size="xl" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera size={24} className="text-white" />
                       </div>
                    </div>
                  </div>
                  <div className="text-center md:text-left space-y-4">
                    <h3 className="text-2xl font-serif font-black tracking-tight">{formData.name}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                       <span className="bg-[var(--color-accent-soft)] text-[var(--color-accent)] text-[9px] font-black px-3 py-1.5 rounded-full border border-[var(--color-accent)]/20 uppercase tracking-widest">{user?.role || 'Citizen'}</span>
                       <span className="bg-white/5 text-[var(--color-text-secondary)] text-[9px] font-black px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest">Lvl {user?.level || 1} Pioneer</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Personal Info */}
              <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-8 md:p-12 rounded-[3rem]">
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-accent)] mb-12">Core Specifications</h2>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <Input
                    label="Full Identity"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                  />
                  <Input
                    label="Communication Node"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                  />
                  <Input
                    label="Professional Designation"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Lead Architect"
                  />
                  <Input
                    label="Geographic Anchor"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                  />
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)] ml-2">Mission Log (Bio)</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-6 text-sm min-h-[150px] outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                      placeholder="Share your purpose..."
                    />
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
               <Card className="p-8 md:p-12 bg-[var(--color-bg-secondary)] border-[var(--color-border)] rounded-[3rem]">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-accent)] mb-10 text-center md:text-left">Signal Configuration</h2>
                  <div className="space-y-6">
                    {[
                      { id: 'emailNotifications', label: 'Direct Messages', desc: 'Get updates on messages and applications' },
                      { id: 'pushNotifications', label: 'Ecosystem Alerts', desc: 'Real-time signals from the network' },
                      { id: 'weeklyDigest', label: 'Weekly Debrief', desc: 'Condensed summary of your weekly impact' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-6 bg-[var(--color-bg-primary)] rounded-[2rem] border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all group">
                        <div className="space-y-1">
                          <p className="text-sm font-bold group-hover:text-[var(--color-accent)] transition-colors">{item.label}</p>
                          <p className="text-[10px] font-bold text-[var(--color-text-secondary)] opacity-60 uppercase tracking-widest">{item.desc}</p>
                        </div>
                        <div 
                          className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'bg-[var(--color-accent)]' : 'bg-white/10'}`}
                          onClick={() => setNotificationSettings(p => ({ ...p, [item.id]: !p[item.id as keyof typeof notificationSettings] }))}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'translate-x-6' : ''}`} />
                        </div>
                      </div>
                    ))}
                  </div>
               </Card>
            </motion.div>
          )}

          {activeTab === 'security' && (
             <motion.div
              key="security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
               <div className="bg-[var(--color-inverse-bg)] text-white p-10 md:p-16 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                  <div className="absolute -left-10 -bottom-10 opacity-5 pointer-events-none">
                     <Shield size={300} />
                  </div>
                  <div className="relative z-10 text-center space-y-8 max-w-xl mx-auto">
                     <div className="w-20 h-20 bg-[var(--color-accent)] text-black rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-[var(--color-accent)]/40 mb-4">
                        <ShieldCheck size={32} />
                     </div>
                     <h2 className="text-4xl font-serif font-black italic tracking-tighter">Encrypted Core</h2>
                     <p className="text-xs text-white/60 font-medium leading-relaxed">Your data is secured with AES-256 equivalent standards via Supabase authentication protocols. Access remains exclusive to your verified handshake.</p>
                     <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <Button variant="outline" className="rounded-xl border-white/20 hover:bg-white/10 h-14 px-8 text-[10px] uppercase font-black tracking-widest">Update Cipher Key</Button>
                        <Button className="rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white h-14 px-8 text-[10px] uppercase font-black tracking-widest transition-all">Deactivate Node</Button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}
