import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { getBill, calculateBill, settleBill, deleteBill, addParticipant, removeParticipant, getGroupMembers } from '../api'

function groupPasscode(joinCode) {
  if (!joinCode) return undefined
  return sessionStorage.getItem(`group_passcode_${joinCode}`) || undefined
}

export default function BillDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [bill, setBill] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [passcode, setPasscode] = useState(undefined)
  const [shares, setShares] = useState(null)
  const [payer, setPayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [members, setMembers] = useState([])
  const [newParticipant, setNewParticipant] = useState({})

  async function loadBill(pc) {
    const data = await getBill(id, pc)
    setBill(data)
    setLoading(false)
  }

  function syncBill() {
    getBill(id, passcode).then(setBill).catch(() => {})
  }

  useEffect(() => {
    const groupCode = location.state?.groupCode
    const pc = groupPasscode(groupCode)
    setPasscode(pc)
    getBill(id, pc).then(data => {
      if (!pc && data.group_join_code) {
        const derived = groupPasscode(data.group_join_code)
        setPasscode(derived)
      }
      setBill(data)
      setLoading(false)
      if (data.group_join_code) {
        const effectivePc = pc || groupPasscode(data.group_join_code)
        getGroupMembers(data.group_join_code, effectivePc).then(setMembers).catch(() => {})
      }
    }).catch(() => {
      setNotFound(true)
      setLoading(false)
    })
  }, [id])

  async function handleCalculate() {
    try {
      const result = await calculateBill(id, passcode)
      setShares(result.shares)
      setPayer(result.payer)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSettle() {
    if (!window.confirm('Mark this bill as settled?')) return
    setSettling(true)
    try {
      const updated = await settleBill(id, passcode)
      setBill(updated)
    } finally {
      setSettling(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${bill.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteBill(id, passcode)
      navigate(bill?.group_join_code ? `/group/${bill.group_join_code}` : '/')
    } finally {
      setDeleting(false)
    }
  }

  async function handleAddParticipant(itemId, nameArg) {
    const name = nameArg ?? (newParticipant[itemId] || '').trim()
    if (!name) return

    // Optimistic: add immediately so the UI responds without waiting
    setBill(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, participants: [...item.participants, { id: `_tmp_${name}`, name }] }
          : item
      ),
    }))
    if (!nameArg) setNewParticipant(p => ({ ...p, [itemId]: '' }))

    try {
      await addParticipant(itemId, name, passcode)
      syncBill() // background sync to replace temp ID with real one
    } catch (err) {
      // Revert optimistic update on failure
      setBill(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, participants: item.participants.filter(p => p.id !== `_tmp_${name}`) }
            : item
        ),
      }))
      setError(err.message || 'Failed to add participant')
    }
  }

  async function handleRemoveParticipant(itemId, name) {
    // Optimistic: remove immediately
    setBill(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, participants: item.participants.filter(p => p.name !== name) }
          : item
      ),
    }))

    try {
      await removeParticipant(itemId, name, passcode)
    } catch {
      syncBill() // revert by reloading on failure
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 text-gray-400">Loading…</div>

  if (notFound || !bill) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Bill not found or access denied.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 text-sm hover:underline">← Back to home</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={bill?.group_join_code ? `/group/${bill.group_join_code}` : '/'}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
        >
          ← Back
        </Link>
      </div>

      {/* Bill header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{bill.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Paid by <span className="capitalize font-medium">{bill.payer.name}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{bill.total.toLocaleString()}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${bill.settled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
              {bill.settled ? 'Settled' : 'Unsettled'}
            </span>
          </div>
        </div>

        {!bill.settled && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCalculate}
              className="flex-1 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
            >
              Calculate Shares
            </button>
            <button
              onClick={handleSettle}
              disabled={settling}
              className="flex-1 border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 py-2 rounded-lg text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-50"
            >
              {settling ? 'Settling…' : 'Mark Settled'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="border border-red-200 dark:border-red-800 text-red-400 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Share breakdown */}
      {shares && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Pay to <span className="capitalize">{payer.name}</span>
          </h2>
          <div className="flex flex-col gap-2">
            {shares.map((s) => (
              <div key={s.name} className="flex justify-between items-center text-sm">
                <span className="capitalize text-gray-700 dark:text-gray-300">{s.name}</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{s.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Items */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Items</h2>
        {bill.items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No items in this bill.</p>
        ) : null}
        <div className="flex flex-col gap-3">
          {bill.items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                <span className="text-gray-600 dark:text-gray-400 font-semibold">{item.price.toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {item.participants.length === 0 ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500">No participants yet</span>
                ) : (
                  item.participants.map((p) => (
                    <span
                      key={p.id}
                      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full"
                    >
                      <span className="capitalize">{p.name}</span>
                      {!bill.settled && (
                        <button
                          onClick={() => handleRemoveParticipant(item.id, p.name)}
                          className="text-gray-400 hover:text-red-500 leading-none"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
              {!bill.settled && members.length > 0 ? (
                (() => {
                  const assigned = new Set(item.participants.map(p => p.name))
                  const unassigned = members.filter(m => !assigned.has(m))
                  return unassigned.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {unassigned.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleAddParticipant(item.id, name)}
                          className="px-3 py-1 rounded-full text-xs font-medium capitalize transition bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  ) : null
                })()
              ) : !bill.settled && (
                <div className="flex gap-2">
                  <input
                    value={newParticipant[item.id] || ''}
                    onChange={(e) => setNewParticipant((p) => ({ ...p, [item.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant(item.id))}
                    placeholder="Add participant…"
                    className="flex-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => handleAddParticipant(item.id)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 px-2"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}
