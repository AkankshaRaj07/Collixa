'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Flag, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function AdminReports() {
  const [loading, setLoading] = useState(false)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-serif font-black text-[var(--color-text-primary)]">Reports & Moderation</h2>
          <p className="text-[var(--color-text-secondary)] text-sm">Review flagged content and user reports</p>
        </div>

        {/* Placeholder for Reports Feature */}
        <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-12 border border-[var(--color-border)] text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto mb-6">
            <Flag size={40} className="text-[var(--color-accent)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Reports Feature</h3>
          <p className="text-[var(--color-text-secondary)] max-w-md mx-auto mb-6">
            This section is designed to display user reports, flagged content, and moderation requests once the system is live.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border)]">
              <AlertTriangle size={24} className="text-yellow-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Flagged Intents</p>
              <p className="text-2xl font-bold text-[var(--color-accent)]">0</p>
            </div>
            <div className="p-4 bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border)]">
              <AlertTriangle size={24} className="text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Flagged Users</p>
              <p className="text-2xl font-bold text-[var(--color-accent)]">0</p>
            </div>
            <div className="p-4 bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border)]">
              <MessageSquare size={24} className="text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Pending Reports</p>
              <p className="text-2xl font-bold text-[var(--color-accent)]">0</p>
            </div>
          </div>
        </div>

        {/* Future implementation note */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-8 text-center italic">
          <p className="text-[var(--color-text-secondary)] text-sm">
            This module is reserved for future implementation of the reporting and moderation system.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
