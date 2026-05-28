import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStats, getGroup } from '../api'

function getRecentGroups() {
  try {
    return JSON.parse(localStorage.getItem('recent_groups') || '[]')
  } catch {
    return []
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [stats, setStats] = useState({ total_groups: '—', total_bills: '—' })
  const [recentGroups, setRecentGroups] = useState(getRecentGroups)

  useEffect(() => {
    getStats().then(setStats).catch(() => {
      setStats({ total_groups: '—', total_bills: '—' })
    })

    const stored = getRecentGroups()
    if (stored.length === 0) return
    Promise.all(
      stored.map(g =>
        getGroup(g.code).then(() => g).catch(err => {
          if (err.message === 'Group not found') return null
          return g
        })
      )
    ).then(results => {
      const valid = results.filter(Boolean)
      if (valid.length !== stored.length) {
        localStorage.setItem('recent_groups', JSON.stringify(valid))
        setRecentGroups(valid)
      }
    })
  }, [])

  function handleJoin(e) {
    e.preventDefault()
    let code = joinCode.trim()
    const match = code.match(/\/group\/([^/?#]+)/)
    if (match) code = match[1]
    if (code) navigate(`/group/${code}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-8-6h16" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">SplitBill</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">
            Split bills,<br />
            <span className="text-indigo-600">no awkwardness.</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-base max-w-sm mx-auto">
            Create a group, share the link, add bills together. Everyone sees who owes what.
          </p>
          <button
            onClick={() => navigate('/group/new')}
            className="mt-7 inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create a Group
          </button>
        </div>

        {true && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{typeof stats.total_groups === 'number' ? stats.total_groups.toLocaleString() : stats.total_groups}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total Groups</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{typeof stats.total_bills === 'number' ? stats.total_bills.toLocaleString() : stats.total_bills}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total Bills</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Join an existing group</p>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Paste group code or link…"
              className="flex-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="bg-gray-900 dark:bg-gray-100 disabled:bg-gray-200 dark:disabled:bg-gray-600 text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              Go
            </button>
          </form>
        </div>

        {recentGroups.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Recent groups</p>
            <div className="flex flex-col gap-2">
              {recentGroups.map(group => (
                <button
                  key={group.code}
                  onClick={() => navigate(`/group/${group.code}`)}
                  className="w-full text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3.5 flex items-center justify-between hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 font-bold text-sm uppercase">{group.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition">{group.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{group.code}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </section>
        )}

        {recentGroups.length === 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: '📷', label: 'Scan receipts' },
              { icon: '🔗', label: 'Shareable link' },
              { icon: '🧮', label: 'Smart split' },
            ].map(f => (
              <div key={f.label} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl py-4 px-3 text-center">
                <span className="text-2xl">{f.icon}</span>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-2">{f.label}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
