'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'

const TABS = ['Overview', 'Users', 'Developers', 'Questions', 'Sessions', 'Flags']

export default function AdminPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const [tab, setTab] = useState('Overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  if (user && user.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    enabled: tab === 'Overview',
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', tab, search],
    queryFn: () => api.get('/admin/users', {
      params: {
        role: tab === 'Users' ? 'USER' : tab === 'Developers' ? 'DEVELOPER' : undefined,
        search: search || undefined,
      }
    }).then(r => r.data),
    enabled: tab === 'Users' || tab === 'Developers',
  })

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['admin-questions', statusFilter, search],
    queryFn: () => api.get('/admin/questions', {
      params: { status: statusFilter || undefined, search: search || undefined }
    }).then(r => r.data),
    enabled: tab === 'Questions',
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin-sessions', statusFilter],
    queryFn: () => api.get('/admin/sessions', {
      params: { status: statusFilter || undefined }
    }).then(r => r.data),
    enabled: tab === 'Sessions',
  })

  const { data: flags = [] } = useQuery({
    queryKey: ['admin-flags'],
    queryFn: () => api.get('/admin/flags').then(r => r.data),
    enabled: tab === 'Flags',
  })

  const suspendUser = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/users/${id}/suspend`, { status }),
    onSuccess: () => {
      toast.success('User status updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to update user'),
  })

  const trashQuestion = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/questions/${id}/trash`),
    onSuccess: () => {
      toast.success('Question trashed')
      qc.invalidateQueries({ queryKey: ['admin-questions'] })
    },
    onError: () => toast.error('Failed to trash question'),
  })

  const refundQuestion = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/questions/${id}/refund`),
    onSuccess: () => {
      toast.success('Refunded and question re-opened')
      qc.invalidateQueries({ queryKey: ['admin-questions'] })
    },
    onError: () => toast.error('Failed to refund'),
  })

  const resolveFlag = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/flags/${id}`, { status }),
    onSuccess: () => {
      toast.success('Flag resolved')
      qc.invalidateQueries({ queryKey: ['admin-flags'] })
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-dark text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-brand font-bold text-lg">PopStack</span>
          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">ADMIN</span>
        </div>
        <span className="text-sm text-gray-400">{user?.name}</span>
      </nav>

      <div className="max-w-6xl mx-auto px-3 py-4">
        {/* Tabs — scrollable on mobile */}
        <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); setStatusFilter('') }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-900'
              }`}>
              {t}
              {t === 'Flags' && flags.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {flags.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'Overview' && stats && (
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-4">Platform overview</h1>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Users', value: stats.users, color: 'text-blue-600' },
                { label: 'Developers', value: stats.developers, color: 'text-purple-600' },
                { label: 'Questions', value: stats.questions, color: 'text-amber-600' },
                { label: 'Sessions', value: stats.sessions, color: 'text-green-600' },
                { label: 'Revenue', value: `$${(stats.totalRevenueCents / 100).toFixed(0)}`, color: 'text-brand' },
              ].map(card => (
                <div key={card.label} className="card text-center p-3">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3">Quick actions</h3>
                <div className="space-y-2">
                  {['Users', 'Developers', 'Questions', 'Sessions', 'Flags'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className="w-full text-left text-sm text-brand hover:underline py-1">
                      → View {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3">Pending flags</h3>
                {flags.length === 0 ? (
                  <p className="text-sm text-gray-400">No pending flags ✓</p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">{flags.length} flag{flags.length > 1 ? 's' : ''} need review</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users / Developers */}
        {(tab === 'Users' || tab === 'Developers') && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-semibold text-gray-900">{tab}</h1>
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="input w-full sm:w-64" placeholder="Search by name or email..." />
            </div>
            {usersLoading ? (
              <div className="text-center py-20 text-gray-400">Loading...</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Name</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Email</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Rating</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand text-xs font-bold shrink-0">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[140px] truncate">{u.email}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.suspensionStatus === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                            u.suspensionStatus === 'WARNED' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {u.suspensionStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-500">
                          {u.avgRating ? `★ ${u.avgRating.toFixed(1)}` : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {u.suspensionStatus === 'ACTIVE' ? (
                              <button onClick={() => suspendUser.mutate({ id: u.id, status: 'SUSPENDED' })}
                                className="text-xs text-red-500 hover:text-red-700 font-medium">Suspend</button>
                            ) : (
                              <button onClick={() => suspendUser.mutate({ id: u.id, status: 'ACTIVE' })}
                                className="text-xs text-green-600 hover:text-green-800 font-medium">Restore</button>
                            )}
                            {u.suspensionStatus === 'ACTIVE' && (
                              <button onClick={() => suspendUser.mutate({ id: u.id, status: 'WARNED' })}
                                className="text-xs text-amber-500 hover:text-amber-700 font-medium">Warn</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No {tab.toLowerCase()} found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        {tab === 'Questions' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-semibold text-gray-900">Questions</h1>
              <div className="flex gap-2">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  className="input flex-1 sm:w-40" placeholder="Search..." />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
                  <option value="">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="LOCKED">Locked</option>
                  <option value="AWAITING_ACCEPT">Awaiting accept</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="TRASHED">Trashed</option>
                </select>
              </div>
            </div>
            {questionsLoading ? (
              <div className="text-center py-20 text-gray-400">Loading...</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Title</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">User</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Platform</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {questions.map((q: any) => (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 cursor-pointer"
                          onClick={() => window.open(`/question/${q.id}`, '_blank')}>
                          <div className="text-sm font-medium text-gray-900 max-w-[160px] truncate">{q.title}</div>
                          {q.url && <div className="text-xs text-gray-400 truncate max-w-[160px]">{q.url}</div>}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{q.user?.name}</td>
                        <td className="px-3 py-3">
                          {q.fingerprint?.platform && q.fingerprint.platform !== 'UNKNOWN' ? (
                            <span className="text-xs bg-brand-light text-brand px-2 py-0.5 rounded-full">
                              {q.fingerprint.platform}
                            </span>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            q.status === 'OPEN' ? 'bg-blue-50 text-blue-700' :
                            q.status === 'LOCKED' ? 'bg-amber-50 text-amber-700' :
                            q.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                            q.status === 'CLOSED' ? 'bg-gray-100 text-gray-500' :
                            q.status === 'TRASHED' ? 'bg-red-50 text-red-400' :
                            'bg-purple-50 text-purple-700'
                          }`}>
                            {q.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {q.status !== 'CLOSED' && q.status !== 'TRASHED' && (
                              <button
                                onClick={e => { e.stopPropagation(); if(confirm('Trash this question?')) trashQuestion.mutate(q.id) }}
                                className="text-xs text-red-400 hover:text-red-600 font-medium">
                                Trash
                              </button>
                            )}
                            {q.status === 'AWAITING_ACCEPT' && (
                              <button
                                onClick={e => { e.stopPropagation(); if(confirm('Refund this payment?')) refundQuestion.mutate(q.id) }}
                                className="text-xs text-amber-500 hover:text-amber-700 font-medium">
                                Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {questions.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No questions found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sessions */}
        {tab === 'Sessions' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-semibold text-gray-900">Sessions</h1>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-full sm:w-48">
                <option value="">All statuses</option>
                <option value="PENDING_ACCEPT">Pending accept</option>
                <option value="ACTIVE">Active</option>
                <option value="ENDED">Ended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            {sessionsLoading ? (
              <div className="text-center py-20 text-gray-400">Loading...</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Question</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">User</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Developer</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Tier</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Escrow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sessions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-900 max-w-[140px] truncate">
                          {s.question?.title || '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{s.user?.name}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{s.developer?.name}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {s.tier?.replace(/_/g, ' ').toLowerCase()}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                            s.status === 'PENDING_ACCEPT' ? 'bg-amber-50 text-amber-700' :
                            s.status === 'ENDED' ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-500'
                          }`}>
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.escrowStatus === 'RELEASED' ? 'bg-green-50 text-green-700' :
                            s.escrowStatus === 'HELD' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {s.escrowStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sessions.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No sessions found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Flags */}
        {tab === 'Flags' && (
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-4">Flagged ratings</h1>
            {flags.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500">No pending flags — all clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((flag: any) => (
                  <div key={flag.id} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-amber-400 text-sm">{'★'.repeat(flag.rating?.overall || 0)}</span>
                          <span className="text-xs text-gray-400">
                            {flag.rating?.rater?.name} → {flag.rating?.ratee?.name}
                          </span>
                        </div>
                        {flag.rating?.comment && (
                          <p className="text-sm text-gray-700 mb-2">"{flag.rating.comment}"</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Flagged {new Date(flag.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => resolveFlag.mutate({ id: flag.id, status: 'DISMISSED' })}
                          className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                          Dismiss
                        </button>
                        <button onClick={() => resolveFlag.mutate({ id: flag.id, status: 'ACTIONED' })}
                          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600">
                          Take action
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
