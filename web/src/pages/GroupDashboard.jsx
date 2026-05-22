import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getGroup,
  verifyGroupPasscode,
  getGroupUnsettledBills,
  calculateGroupBills,
  settleGroupBills,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
} from '../api'

function passcodeKey(code) {
  return `group_passcode_${code}`
}

function Avatar({ name }) {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold capitalize shrink-0 ${color}`}>
      {name[0]}
    </span>
  )
}

export default function GroupDashboard() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [bills, setBills] = useState([])
  const [debts, setDebts] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [copied, setCopied] = useState(false)

  // Member input
  const [memberInput, setMemberInput] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // Passcode gate
  const [needsPasscode, setNeedsPasscode] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const passcode = () => sessionStorage.getItem(passcodeKey(code)) || undefined

  function saveToRecent(g) {
    try {
      const key = 'recent_groups'
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      const filtered = existing.filter(r => r.code !== g.join_code)
      const updated = [{ code: g.join_code, name: g.name, visitedAt: Date.now() }, ...filtered].slice(0, 6)
      localStorage.setItem(key, JSON.stringify(updated))
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const g = await getGroup(code, passcode())
      setGroup(g)
      saveToRecent(g)
      const [billList, debtMap, memberList] = await Promise.all([
        getGroupUnsettledBills(code, passcode()),
        calculateGroupBills(code, passcode()),
        getGroupMembers(code, passcode()),
      ])
      setBills(billList)
      setMembers(memberList)
      const rows = []
      for (const [debtor, creditors] of Object.entries(debtMap)) {
        for (const [creditor, amount] of Object.entries(creditors)) {
          rows.push({ debtor, creditor, amount })
        }
      }
      setDebts(rows)
      setNeedsPasscode(false)
    } catch (err) {
      if (err.message === 'Invalid passcode' || err.message?.includes('403')) {
        setNeedsPasscode(true)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getGroup(code).catch(err => {
      if (err.message === 'Invalid passcode') setNeedsPasscode(true)
    })
    load()
  }, [code])

  async function handlePasscodeSubmit(e) {
    e.preventDefault()
    setVerifying(true)
    setPasscodeError(null)
    try {
      const result = await verifyGroupPasscode(code, passcodeInput)
      if (result.valid) {
        sessionStorage.setItem(passcodeKey(code), passcodeInput)
        setNeedsPasscode(false)
        await load()
      } else {
        setPasscodeError('Wrong passcode. Try again.')
      }
    } catch {
      setPasscodeError('Wrong passcode. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    const name = memberInput.trim()
    if (!name) return
    setAddingMember(true)
    try {
      const updated = await addGroupMember(code, name, passcode())
      setMembers(updated)
      setMemberInput('')
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRemoveMember(name) {
    const updated = await removeGroupMember(code, name, passcode())
    setMembers(updated)
  }

  async function handleSettleAll() {
    if (!window.confirm('Settle all bills in this group?')) return
    setSettling(true)
    await settleGroupBills(code, passcode())
    await load()
    setSettling(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (needsPasscode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Passcode</h2>
          <p className="text-sm text-gray-500 mb-5">This group is protected. Enter the passcode to continue.</p>
          {passcodeError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{passcodeError}</div>
          )}
          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <input
              type="password"
              value={passcodeInput}
              onChange={e => setPasscodeInput(e.target.value)}
              placeholder="Passcode"
              autoFocus
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={verifying || !passcodeInput}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {verifying ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="text-gray-400 hover:text-gray-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-bold text-gray-900 truncate">{group?.name}</h1>
          </div>
          <button
            onClick={() => navigate(`/group/${code}/bill/new`)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition text-sm font-medium shrink-0"
          >
            + New Bill
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Share link */}
        <div className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-2xl">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-xs text-gray-500 truncate flex-1">{window.location.href}</span>
          <button
            onClick={copyLink}
            className="text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1 transition whitespace-nowrap font-medium"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Members */}
        <section className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Members</h2>

          {/* Existing members */}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {members.map(name => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full"
                >
                  <Avatar name={name} />
                  <span className="capitalize">{name}</span>
                  <button
                    onClick={() => handleRemoveMember(name)}
                    className="text-indigo-400 hover:text-red-500 transition ml-0.5 leading-none"
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add member */}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              value={memberInput}
              onChange={e => setMemberInput(e.target.value)}
              placeholder="Add a name…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={addingMember || !memberInput.trim()}
              className="bg-indigo-600 disabled:bg-indigo-200 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              Add
            </button>
          </form>

          {members.length === 0 && (
            <p className="text-xs text-gray-400 mt-3">Add names to quickly assign participants when splitting bills.</p>
          )}
        </section>

        {/* Who Owes Who */}
        {debts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Who Owes Who</h2>
            <div className="flex flex-col gap-2">
              {debts.map((d, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={d.debtor} />
                    <span className="text-sm font-semibold text-gray-900 capitalize truncate">{d.debtor}</span>
                    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <Avatar name={d.creditor} />
                    <span className="text-sm font-semibold text-gray-900 capitalize truncate">{d.creditor}</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 shrink-0 ml-3">{d.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Unsettled Bills */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Unsettled Bills</h2>
            {bills.length > 0 && (
              <button
                onClick={handleSettleAll}
                disabled={settling}
                className="text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-40 transition"
              >
                {settling ? 'Settling…' : 'Settle All'}
              </button>
            )}
          </div>
          {bills.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm">No unsettled bills yet.</p>
              <button
                onClick={() => navigate(`/group/${code}/bill/new`)}
                className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
              >
                Add the first bill →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {bills.map((bill) => (
                <Link
                  key={bill.id}
                  to={`/bill/${bill.id}`}
                  className="block bg-white border border-gray-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition">{bill.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar name={bill.payer.name} />
                        <span className="text-xs text-gray-500 capitalize">{bill.payer.name}</span>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-xs text-gray-400">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900 shrink-0">{bill.total.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
