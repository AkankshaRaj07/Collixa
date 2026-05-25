'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  MapPin,
  Clock,
  DollarSign,
  Target,
  FileUp,
  Send,
  FolderKanban,
  BookOpen,
  Dumbbell,
  Plane,
  CalendarDays,
  Rocket,
  Network,
  Lightbulb,
  UsersRound,
  Layers,
  Calendar,
  ShieldCheck
} from 'lucide-react'
import CustomDatePicker from '@/components/CustomDatePicker'
import { useAuth } from '@/app/context/AuthContext'
import { storageService } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import Badge from '@/components/Badge'
import Button from '@/components/Button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const CATEGORIES = [
  { name: 'Intents', icon: FolderKanban },
  { name: 'Study', icon: BookOpen },
  { name: 'Fitness', icon: Dumbbell },
  { name: 'Travel', icon: Plane },
  { name: 'Events', icon: CalendarDays },
  { name: 'Startup', icon: Rocket },
  { name: 'Networking', icon: Network },
  { name: 'Creative', icon: Lightbulb },
  { name: 'Social', icon: UsersRound },
  { name: 'Other', icon: Layers }
]

function CreateIntentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const { token, user, isAuthenticated, loading: authLoading } = useAuth()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Design',
    customCategory: '',
    location: '',
    timeline: '',
    budget: '',
    goal: '',
    collaborator_limit: 1,
  })

  const getCategoryIcon = (name: string) => {
    const cat = CATEGORIES.find(c => c.name === name)
    return cat?.icon || Layers
  }

  // State Management
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(!!editId)

  // Fetch intent data if in edit mode
  useEffect(() => {
    if (editId && token) {
      const fetchIntent = async () => {
        try {
          const response = await fetch(`${API_URL}/api/intents/${editId}`)
          const data = await response.json()
          if (response.ok && data.data) {
            const intent = data.data
            setFormData({
              title: intent.title || '',
              description: intent.description || '',
              category: intent.category || 'Design',
              customCategory: '',
              location: intent.location || '',
              timeline: intent.timeline ? new Date(intent.timeline).toISOString().slice(0, 16) : '',
              budget: intent.budget || '',
              goal: intent.goal || '',
              collaborator_limit: intent.collaborator_limit || 1,
            })
          } else {
            setSubmitError('Failed to load project for editing')
          }
        } catch (err) {
          setSubmitError('Error connecting to server')
        } finally {
          setIsInitialLoading(false)
        }
      }
      fetchIntent()
    }
  }, [editId, token])

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [authLoading, isAuthenticated, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      const newErrors = { ...errors }
      delete newErrors[name]
      setErrors(newErrors)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

    if (!allowedTypes.includes(file.type)) {
      setFileError('Allowing only images (JPG, PNG, WebP) and PDFs.')
      setUploadedFile(null)
      return
    }
    if (file.size > maxSize) {
      setFileError('File size must be under 5MB.')
      setUploadedFile(null)
      return
    }
    setFileError(null)
    setUploadedFile(file)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required.'
    if (!formData.description.trim()) newErrors.description = 'Description is required.'
    if (!formData.location.trim()) newErrors.location = 'Location is required.'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
       // Scroll to top of list if errors exist
       window.scrollTo({ top: 0, behavior: 'smooth' })
       return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let attachmentPath = ''
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const storagePath = `intents/${fileName}`
        const uploadedPath = await storageService.uploadFile('attachments', storagePath, uploadedFile)
        if (uploadedPath) attachmentPath = uploadedPath
      }

      const { customCategory, ...restFormData } = formData
      const payload = {
        ...restFormData,
        category: formData.category === 'Other' && formData.customCategory
          ? formData.customCategory
          : formData.category,
        timeline: formData.timeline ? new Date(formData.timeline).toISOString() : new Date().toISOString(),
        // Only set status to 'looking' for new posts
        ...(!editId && { status: 'looking' }),
        created_by: user?.id || '',
        collaborator_limit: Number(formData.collaborator_limit),
        ...(attachmentPath && { attachment_name: attachmentPath })
      }

      const response = await fetch(editId ? `${API_URL}/api/intents/${editId}` : `${API_URL}/api/intents`, {
        method: editId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        
        // Handle express-validator style errors array
        if (data.errors && Array.isArray(data.errors)) {
          const newErrors: Record<string, string> = {}
          data.errors.forEach((err: any) => {
            newErrors[err.path || err.param] = err.msg
          })
          setErrors(newErrors)
          throw new Error('Please correct the highlighted errors.')
        }

        throw new Error(data.error || 'Failed to post project')
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        router.push(editId ? `/intent/${editId}` : '/dashboard')
      }, 2000)

    } catch (err: any) {
      setSubmitError(err.message || 'Error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Marketplace', href: '/dashboard' },
    { icon: FileText, label: 'My Intents', href: '/my-collaborations' },
    { icon: MessageSquare, label: 'Messages', href: '/chat' },
    { icon: Users, label: 'Community', href: '/skills' },
  ]

  if (authLoading) return null

  return (
    <div className="space-y-8 mt-0">
        <main className="flex-1 max-w-4xl">
          
          <div className="mb-6 md:mb-8 space-y-3 md:space-y-4 bg-[var(--color-bg-secondary)]/70 border border-[var(--color-border)] rounded-2xl md:rounded-[2rem] p-4 sm:p-5 md:p-8">
            <Badge variant="accent" className="uppercase tracking-[0.3em]">Intent Creation</Badge>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-serif font-black tracking-tight">
              {editId ? 'Refine your project.' : 'Post your vision.'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] font-medium">Simple. Direct. Collaborative. List your project in seconds.</p>
          </div>

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-sm">
            <AnimatePresence mode="wait">
              {submitSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 md:py-24 text-center space-y-8"
                >
                   {/* Creative Pulsing Orb */}
                   <div className="relative">
                     <motion.div 
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="absolute inset-0 bg-[var(--color-accent)] blur-3xl rounded-full"
                     />
                     <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-[var(--color-bg-primary)] border-2 border-[var(--color-accent)] flex items-center justify-center text-[var(--color-accent)] shadow-2xl shadow-[var(--color-accent)]/20">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                        >
                          <Clock size={40} className="md:w-12 md:h-12" />
                        </motion.div>
                     </div>
                   </div>

                   <div className="space-y-4 max-w-md mx-auto">
                     <h3 className="text-2xl md:text-3xl font-serif font-black tracking-tight">Message Received.</h3>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]">Verification in Progress</p>
                        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                          Your intent is now being analyzed by **Collixa Architects**. We ensure every project meets our quality standards before it hits the marketplace.
                        </p>
                     </div>
                   </div>
                   
                   <div className="pt-4">
                      <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest opacity-40">
                         <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                         Finalizing handshake...
                      </div>
                   </div>
                </motion.div>
              ) : isInitialLoading ? (
                <div className="flex flex-col items-center justify-center py-16 md:py-32 space-y-5 md:space-y-6">
                   <Loader2 className="animate-spin text-[var(--color-accent)]" size={48} />
                   <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Loading details...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-7 md:space-y-10">
                  
                  {/* --- UNIFIED FORM SECTION --- */}
                  <div className="space-y-8">
                    {/* Intent Title */}
                    <div className="space-y-3">
                      <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                        <FileText size={18} className="text-[var(--color-accent)]" /> Intent Title
                      </label>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="e.g. Building an AI Skill Marketplace"
                        className="editorial-input !font-serif !font-medium"
                      />
                      {errors.title && <p className="text-[10px] font-bold text-red-500">{errors.title}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                        <FileText size={16} className="text-[var(--color-accent)]" /> Description & Context
                      </label>
                      <textarea
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe your vision and who you're looking for..."
                        className="editorial-textarea"
                      />
                      {errors.description && <p className="text-[10px] font-bold text-red-500">{errors.description}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-3">
                      <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                        <Layers size={16} className="text-[var(--color-accent)]" /> Category
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => {
                          const Icon = cat.icon
                          return (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, category: cat.name }))}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                                formData.category === cat.name
                                ? 'bg-[var(--color-accent)] text-white shadow-md'
                                : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
                              }`}
                            >
                              <Icon size={14} />
                              {cat.name}
                            </button>
                          )
                        })}
                      </div>
                      {formData.category === 'Other' && (
                        <div className="pt-2">
                          <input
                            name="customCategory"
                            value={formData.customCategory}
                            onChange={handleChange}
                            placeholder="Please specify your category..."
                            className="editorial-input !font-serif !font-medium"
                          />
                        </div>
                      )}
                    </div>

                    {/* Location & Deadline Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                          <MapPin size={16} className="text-[var(--color-accent)]" /> Location
                        </label>
                        <input
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Remote or Specific City"
                          className="editorial-input"
                        />
                        {errors.location && <p className="text-[10px] font-bold text-red-500">{errors.location}</p>}
                      </div>
                      <div className="space-y-3">
                        <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                          <Clock size={16} className="text-[var(--color-accent)]" /> Target Deadline
                        </label>
                        <CustomDatePicker
                          selected={formData.timeline ? new Date(formData.timeline) : null}
                          onChange={(date) => setFormData(prev => ({ ...prev, timeline: date ? date.toISOString() : '' }))}
                          placeholderText="Select deadline..."
                        />
                      </div>
                    </div>

                    {/* Budget & Attachment Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                          <DollarSign size={16} className="text-[var(--color-accent)]" /> Budget / Exchange
                        </label>
                        <input
                          name="budget"
                          value={formData.budget}
                          onChange={handleChange}
                          placeholder="e.g. $500 - $1000 or 'Skill Exchange'"
                          className="editorial-input"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                          <FileUp size={16} className="text-[var(--color-accent)]" /> Attachment
                        </label>
                        {!uploadedFile ? (
                          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-full px-4 py-3 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]/20 transition-all cursor-pointer bg-[var(--color-bg-primary)] group">
                            <Plus size={18} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)]" />
                            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Add File</span>
                            <input type="file" onChange={handleFileUpload} className="hidden" />
                          </label>
                        ) : (
                          <div className="px-4 py-3 bg-[var(--color-accent-soft)]/20 border border-[var(--color-accent)]/20 rounded-full flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle size={16} className="text-[var(--color-accent)]" />
                              <span className="text-xs font-medium truncate max-w-[150px]">{uploadedFile.name}</span>
                            </div>
                            <button type="button" onClick={() => setUploadedFile(null)} className="text-[9px] font-black uppercase text-red-500 hover:underline">Remove</button>
                          </div>
                        )}
                        {fileError && <p className="text-[10px] font-bold text-red-500">{fileError}</p>}
                      </div>
                    </div>

                    {/* Ultimate Objective */}
                    <div className="space-y-3">
                      <label className="text-base md:text-lg font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                        <Target size={16} className="text-[var(--color-accent)]" /> Ultimate Objective
                      </label>
                      <input
                        name="goal"
                        value={formData.goal}
                        onChange={handleChange}
                        placeholder="What defines success for this project?"
                        className="editorial-input"
                      />
                    </div>

                    {/* Collaborator Limit - SLIM CREATIVE SLIDER */}
                    <div className="space-y-3 bg-[var(--color-bg-primary)]/40 p-4 sm:p-5 rounded-2xl md:rounded-[2rem] border border-[var(--color-border)] shadow-sm">
                      <div className="flex justify-between items-center">
                        <label className="text-sm md:text-base font-serif font-bold italic text-[var(--color-text-primary)] flex items-center gap-2">
                          <Users size={16} className="text-[var(--color-accent)]" /> Expected Collaborators
                        </label>
                        <input
                          type="number"
                          name="collaborator_limit"
                          min="1"
                          max="50"
                          value={formData.collaborator_limit}
                          onChange={(e) => {
                            const val = Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                            setFormData(prev => ({ ...prev, collaborator_limit: val }))
                          }}
                          className="w-20 bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-xl px-2 py-2 text-xl font-serif font-black italic text-[var(--color-accent)] text-center focus:outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]/30 transition-all shadow-sm hover:border-[var(--color-text-secondary)]/30"
                        />
                      </div>
                      
                      {/* Visualizer - Reduced Height */}
                      <div className="flex flex-wrap gap-1 h-6 items-center justify-center overflow-hidden">
                        <AnimatePresence>
                          {Array.from({ length: Math.min(Number(formData.collaborator_limit), 50) }).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="w-2 hs-2 md:w-2.5 md:h-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_5px_rgba(var(--color-accent-rgb),0.3)]"
                            />
                          ))}
                        </AnimatePresence>
                        {Number(formData.collaborator_limit) === 0 && (
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-20">Slide to define scale</p>
                        )}
                      </div>

                      {/* Slider Track - Tighter spacing */}
                      <div className="relative">
                        <input
                          type="range"
                          name="collaborator_limit"
                          min="1"
                          max="50"
                          step="1"
                          value={formData.collaborator_limit}
                          onChange={handleChange}
                          className="w-full h-1 bg-[var(--color-border)] rounded-full appearance-none cursor-pointer accent-[var(--color-accent)] focus:outline-none custom-slider"
                        />
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 italic">Solo</span>
                          <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-30 italic">Community (50)</span>
                        </div>
                      </div>
                    </div>

                    {errors.collaborator_limit && <p className="text-[10px] font-bold text-red-500">{errors.collaborator_limit}</p>}

                    {submitError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                        <AlertCircle size={18} />
                        <p className="text-sm font-medium">{submitError}</p>
                      </div>
                    )}
                  </div>

                  {/* Submission Controls */}
                  <div className="flex items-center justify-between pt-6 md:pt-8 border-t border-[var(--color-border)]">
                     <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all flex items-center gap-2"
                     >
                       <ArrowLeft size={14} /> Cancel
                     </button>

                     <Button
                       type="submit"
                       disabled={isSubmitting}
                      className="px-5 sm:px-8 md:px-12 py-3.5 sm:py-4 md:py-5 rounded-xl md:rounded-2xl flex items-center gap-2 sm:gap-3 bg-[var(--color-accent)] shadow-xl shadow-[var(--color-accent)]/20 text-[10px] sm:text-xs md:text-sm"
                     >
                       {isSubmitting ? (
                         <>
                           <Loader2 className="animate-spin" size={18} /> Processing...
                         </>
                       ) : (
                         <>
                           {editId ? 'Save Changes' : 'Post Intent'} <Send size={18} />
                         </>
                       )}
                     </Button>
                  </div>
                </form>
              )}
            </AnimatePresence>
          </div>
        </main>
    </div>
  )
}

export default function CreateIntentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
         <Loader2 className="animate-spin text-[var(--color-accent)]" size={48} />
      </div>
    }>
       <CreateIntentContent />
    </Suspense>
  )
}
