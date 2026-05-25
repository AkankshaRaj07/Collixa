'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Coins, Plus, Minus, Search, ArrowRight, CheckCircle2, X, ChevronDown, User, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: string
  description: string
  created_at: string
  user: {
    name: string
    email: string
  }
}

export default function AdminCredits() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [creditAmount, setCreditAmount] = useState(10)
  const [creditReason, setCreditReason] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeductModal, setShowDeductModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const { refreshUser } = useAuth()
  
  const formatDescription = (tx: CreditTransaction) => {
    if (!tx.description) {
      if (tx.type === 'PURCHASE') return 'Credit Purchase'
      if (tx.type === 'ACHIEVEMENT') return 'Achievement Reward'
      if (tx.type === 'TRANSFER') return 'Peer Credit Transfer'
      if (tx.type === 'EARN') return 'Earned from intent'
      if (tx.type === 'SPEND') return 'Spent on intent'
      if (tx.type === 'ADMIN_ADD') return 'Admin Credit Addition'
      if (tx.type === 'ADMIN_DEDUCT') return 'Admin Credit Deduction'
      return tx.type || 'Transaction'
    }

    if (tx.description.trim().startsWith('{') && tx.description.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(tx.description)
        if (parsed.isRedemption) {
          const provider = parsed.provider || 'Gift Card'
          const cardId = parsed.cardId ? `(${parsed.cardId})` : ''
          return `Redeemed ${provider} ${cardId}`
        }
        if (parsed.achievementTitle) {
          return `Achievement: ${parsed.achievementTitle}`
        }
        if (parsed.intentTitle) {
          return `Intent: ${parsed.intentTitle}`
        }
        if (parsed.reason) {
          return parsed.reason
        }
      } catch (e) {
        // Fail silently, return fallback
      }
    }

    return tx.description
  }

  const fetchData = async () => {
    try {
      const [transactionsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/credits`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch(`${API_URL}/api/admin/users`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      ])

      if (transactionsRes.ok) {
        const transData = await transactionsRes.json()
        setTransactions(transData.data)
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`${API_URL}/api/admin/credits/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId: selectedUser,
          amount: creditAmount,
          reason: creditReason
        })
      })

      const data = await response.json()

      if (response.ok) {
        const user = users.find(u => u.id === selectedUser)
        
        setLastTransaction({
          amount: creditAmount,
          userName: user?.name || 'User',
          reason: creditReason,
          type: 'ADD'
        })
        
        setShowAddModal(false)
        setSelectedUser('')
        setCreditAmount(10)
        setCreditReason('')
        setShowSuccessModal(true)
        
        // Wait 300ms for DB to catch up, then refresh all UI components
        setTimeout(() => {
          fetchData()
          refreshUser()
        }, 300)
      } else {
        setFormError(data.error || data.message || 'Failed to add credits')
      }
    } catch (error) {
      console.error('Error adding credits:', error)
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const deductCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`${API_URL}/api/admin/credits/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId: selectedUser,
          amount: creditAmount,
          reason: creditReason
        })
      })

      const data = await response.json()

      if (response.ok) {
        const user = users.find(u => u.id === selectedUser)
        
        setLastTransaction({
          amount: creditAmount,
          userName: user?.name || 'User',
          reason: creditReason,
          type: 'DEDUCT'
        })
        
        setShowDeductModal(false)
        setSelectedUser('')
        setCreditAmount(10)
        setCreditReason('')
        setShowSuccessModal(true)
        
        setTimeout(() => {
          fetchData()
          refreshUser()
        }, 300)
      } else {
        setFormError(data.error || data.message || 'Failed to deduct credits')
      }
    } catch (error) {
      console.error('Error deducting credits:', error)
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredTransactions = transactions.filter(t =>
    t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const selectedUserData = users.find(u => u.id === selectedUser)

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-[var(--color-bg-secondary)]/10 rounded w-1/4" />
          <div className="h-64 bg-[var(--color-bg-secondary)]/10 rounded" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-serif font-black text-[var(--color-text-primary)]">Credit Management</h2>
            <p className="text-[var(--color-text-secondary)] text-sm">Manage user credits and view transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedUser('')
                setUserSearchQuery('')
                setShowDeductModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/5 transition-all"
            >
              <Minus size={16} />
              Deduct Credits
            </button>
            <button
              onClick={() => {
                setSelectedUser('')
                setUserSearchQuery('')
                setShowAddModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-accent)]/80 transition-all"
            >
              <Plus size={16} />
              Add Credits
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 border border-[var(--color-border)]">
            <p className="text-[var(--color-text-secondary)] text-sm">Total Transactions</p>
            <p className="text-3xl font-black text-[var(--color-text-primary)]">{transactions.length}</p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 border border-[var(--color-border)]">
            <p className="text-[var(--color-text-secondary)] text-sm">Credits Added (Admin)</p>
            <p className="text-3xl font-black text-green-500">
              +{transactions.filter(t => t.type === 'ADMIN_ADD').reduce((sum, t) => sum + t.amount, 0)}
            </p>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 border border-[var(--color-border)]">
            <p className="text-[var(--color-text-secondary)] text-sm">Credits Deducted (Admin)</p>
            <p className="text-3xl font-black text-red-500">
              {transactions.filter(t => t.type === 'ADMIN_DEDUCT').reduce((sum, t) => sum + t.amount, 0)}
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-sm focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          <div className="overflow-hidden w-full">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">User</th>
                  <th className="hidden md:table-cell px-6 py-4 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)] text-center">Type</th>
                  <th className="px-4 sm:px-6 py-4 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)] text-center">Amount</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">Description</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)] text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredTransactions.slice(0, 50).map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-[var(--color-bg-secondary)]/10 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-[10px] font-bold">
                          {transaction.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{transaction.user?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-2 md:hidden">
                            <span className="text-[9px] text-[var(--color-text-secondary)] truncate">{transaction.type}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight ${
                        transaction.type === 'ADMIN_ADD' ? 'bg-green-500/10 text-green-500' :
                        transaction.type === 'ADMIN_DEDUCT' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      } border border-current opacity-80 uppercase`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <span className={`text-sm font-black ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-xs text-[var(--color-text-secondary)] italic">
                      {formatDescription(transaction)}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-right">
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Coins size={48} className="mx-auto text-[var(--color-text-secondary)] mb-4" />
              <p className="text-[var(--color-text-secondary)]">No transactions found</p>
            </div>
          )}
        </div>

        {/* Add Credits Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setIsUserDropdownOpen(false)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2.5rem] p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-accent)] to-transparent opacity-50" />
                
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-[var(--color-accent)] block italic mb-1">Administration</span>
                    <h3 className="text-3xl font-serif font-black tracking-tighter italic text-[var(--color-text-primary)]">Add Credits.</h3>
                  </div>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-primary)] transition-all bg-[var(--color-bg-primary)]/50"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={addCredits} className="space-y-6">
                  <div className="space-y-2 relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-2">Select Recipient</label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
                        <input
                          type="text"
                          value={selectedUserData ? `${selectedUserData.name} (${selectedUserData.email})` : userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value)
                            if (selectedUser) setSelectedUser('')
                            setIsUserDropdownOpen(true)
                          }}
                          onFocus={() => setIsUserDropdownOpen(true)}
                          placeholder="Search by name or email..."
                          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl pl-12 pr-10 py-4 text-xs font-bold focus:border-[var(--color-accent)] outline-none transition-all"
                          required={!selectedUser}
                        />
                        {selectedUser && (
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedUser('')
                              setUserSearchQuery('')
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {!selectedUser && (
                           <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} size={16} />
                        )}
                      </div>

                      <AnimatePresence>
                        {isUserDropdownOpen && !selectedUser && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-[110] max-h-60 overflow-y-auto"
                          >
                            {filteredUsers.length > 0 ? (
                              filteredUsers.map(user => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser(user.id)
                                    setIsUserDropdownOpen(false)
                                    setUserSearchQuery('')
                                  }}
                                  className="w-full p-4 flex items-center gap-3 hover:bg-[var(--color-bg-primary)] transition-colors text-left border-b border-[var(--color-border)] last:border-0"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-black text-xs">
                                    {user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-[var(--color-text-primary)] truncate">{user.name}</p>
                                    <p className="text-[8px] font-medium text-[var(--color-text-secondary)] truncate uppercase tracking-widest">{user.email}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-serif font-black text-[var(--color-accent)]">{user.credits || 0}</p>
                                    <p className="text-[7px] font-black uppercase text-[var(--color-text-secondary)] opacity-50">Creds</p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-8 text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">No users found</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-2">Allocation Amount</label>
                    <div className="relative group">
                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)]" size={16} />
                        <input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                        min="1"
                        placeholder="0"
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl pl-12 pr-5 py-4 text-sm font-mono font-bold focus:border-[var(--color-accent)] outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-2">Protocol Note / Reason</label>
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="e.g., Bonus, Correction, etc."
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-xs font-bold focus:border-[var(--color-accent)] outline-none transition-all"
                      required
                    />
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-500 text-center w-full">{formError}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting || !selectedUser}
                      className="w-full py-5 bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)] rounded-3xl text-[9px] font-black uppercase tracking-[0.5em] hover:bg-[var(--color-accent)] transition-all shadow-xl shadow-black/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Execute Addition
                          <Plus size={14} className="group-hover:scale-125 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Deduct Credits Modal */}
        <AnimatePresence>
          {showDeductModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setIsUserDropdownOpen(false)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--color-bg-secondary)] border border-red-500/20 rounded-[2.5rem] p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-50" />
                
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-[0.5em] text-red-500 block italic mb-1">Administrative Correction</span>
                    <h3 className="text-3xl font-serif font-black tracking-tighter italic text-[var(--color-text-primary)]">Deduct.</h3>
                  </div>
                  <button 
                    onClick={() => setShowDeductModal(false)}
                    className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-primary)] transition-all bg-[var(--color-bg-primary)]/50"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={deductCredits} className="space-y-6">
                  <div className="space-y-2 relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-2">Select User</label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={16} />
                        <input
                          type="text"
                          value={selectedUserData ? `${selectedUserData.name} (${selectedUserData.email})` : userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value)
                            if (selectedUser) setSelectedUser('')
                            setIsUserDropdownOpen(true)
                          }}
                          onFocus={() => setIsUserDropdownOpen(true)}
                          placeholder="Search by name or email..."
                          className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl pl-12 pr-10 py-4 text-xs font-bold focus:border-red-500 outline-none transition-all"
                          required={!selectedUser}
                        />
                        {selectedUser && (
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedUser('')
                              setUserSearchQuery('')
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                        {!selectedUser && (
                           <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} size={16} />
                        )}
                      </div>

                      <AnimatePresence>
                        {isUserDropdownOpen && !selectedUser && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-[110] max-h-60 overflow-y-auto"
                          >
                            {filteredUsers.length > 0 ? (
                              filteredUsers.map(user => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser(user.id)
                                    setIsUserDropdownOpen(false)
                                    setUserSearchQuery('')
                                  }}
                                  className="w-full p-4 flex items-center gap-3 hover:bg-[var(--color-bg-primary)] transition-colors text-left border-b border-[var(--color-border)] last:border-0"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-black text-xs">
                                    {user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-[var(--color-text-primary)] truncate">{user.name}</p>
                                    <p className="text-[8px] font-medium text-[var(--color-text-secondary)] truncate uppercase tracking-widest">{user.email}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-serif font-black text-red-500">{user.credits || 0}</p>
                                    <p className="text-[7px] font-black uppercase text-[var(--color-text-secondary)] opacity-50">Creds</p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-8 text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">No users found</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-2">Deduction Amount</label>
                    <div className="relative group">
                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={16} />
                        <input
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                        min="1"
                        placeholder="0"
                        className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl pl-12 pr-5 py-4 text-sm font-mono font-bold focus:border-red-500 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-2">Deduction Reason</label>
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="e.g., Penalty, Correction, etc."
                      className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-5 py-4 text-xs font-bold focus:border-red-500 outline-none transition-all"
                      required
                    />
                  </div>

                  {formError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-500 text-center w-full">{formError}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting || !selectedUser}
                      className="w-full py-5 bg-red-500 text-white rounded-3xl text-[9px] font-black uppercase tracking-[0.5em] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Execute Deduction
                          <Minus size={14} className="group-hover:scale-125 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && lastTransaction && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${lastTransaction.type === 'ADD' ? 'bg-green-500' : 'bg-red-500'} opacity-30`} />
                
                <div className={`w-24 h-24 ${lastTransaction.type === 'ADD' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner`}>
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <h3 className="text-3xl font-serif font-black mb-3 italic tracking-tighter text-[var(--color-text-primary)]">Authorized.</h3>
                
                <div className="space-y-1 mb-8">
                  <p className="text-[var(--color-text-secondary)] text-[10px] font-black uppercase tracking-widest">Transaction Success</p>
                  <p className="text-[var(--color-text-primary)] text-sm font-medium">
                    {lastTransaction.type === 'ADD' ? 'Credited' : 'Deducted'} <span className="font-serif font-black italic">{lastTransaction.amount}</span> {lastTransaction.type === 'ADD' ? 'to' : 'from'} <br />
                    <span className="text-[var(--color-accent)] font-bold">{lastTransaction.userName}</span>
                  </p>
                </div>

                <div className="bg-[var(--color-bg-primary)]/50 backdrop-blur-sm rounded-2xl p-5 mb-10 text-left border border-[var(--color-border)]">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-secondary)] mb-2 opacity-50">Ledger Entry Reason</p>
                  <p className="text-[11px] font-bold text-[var(--color-text-primary)] leading-relaxed italic">"{lastTransaction.reason}"</p>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-5 bg-[var(--color-inverse-bg)] text-[var(--color-inverse-text)] rounded-3xl text-[9px] font-black uppercase tracking-[0.5em] hover:bg-[var(--color-accent)] transition-all active:scale-95 shadow-xl shadow-black/10"
                >
                  Continue
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
