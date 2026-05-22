import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBill, calculateBill, settleBill, addParticipant, removeParticipant } from '../api'

export default function BillDetail() {
  const { id } = useParams()
  const [bill, setBill] = useState(null)
  const [shares, setShares] = useState(null)
  const [payer, setPayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newParticipant, setNewParticipant] = useState({})
  const [addingTo, setAddingTo] = useState(null)

  async function loadBill() {
    const data = await getBill(id)
    setBill(data)
    setLoading(false)
  }

  useEffect(() => { loadBill() }, [id])

  async function handleCalculate() {
    try {
      const result = await calculateBill(id)
      setShares(result.shares)
      setPayer(result.payer)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSettle() {
    if (!window.confirm('Mark this bill as settled?')) return
    const updated = await settleBill(id)
    setBill(updated)
  }

  async function handleAddParticipant(itemId) {
    const name = (newParticipant[itemId] || '').trim()
    if (!name) return
    setAddingTo(itemId)
    try {
      await addParticipant(itemId, name)
      setNewParticipant((p) => ({ ...p, [itemId]: '' }))
      await loadBill()
    } finally {
      setAddingTo(null)
    }
  }

  async function handleRemoveParticipant(itemId, name) {
    await removeParticipant(itemId, name)
    await loadBill()
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
      </div>

      {/* Bill header */}
      <div className="border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bill.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Paid by <span className="capitalize font-medium">{bill.payer.name}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">{bill.total.toLocaleString()}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${bill.settled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {bill.settled ? 'Settled' : 'Unsettled'}
            </span>
          </div>
        </div>

        {!bill.settled && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCalculate}
              className="flex-1 border border-indigo-300 text-indigo-600 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
            >
              Calculate Shares
            </button>
            <button
              onClick={handleSettle}
              className="flex-1 border border-green-300 text-green-600 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition"
            >
              Mark Settled
            </button>
          </div>
        )}
      </div>

      {/* Share breakdown */}
      {shares && (
        <div className="border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Pay to <span className="capitalize">{payer.name}</span>
          </h2>
          <div className="flex flex-col gap-2">
            {shares.map((s) => (
              <div key={s.name} className="flex justify-between items-center text-sm">
                <span className="capitalize text-gray-700">{s.name}</span>
                <span className="font-semibold text-indigo-600">{s.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* Items */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Items</h2>
        <div className="flex flex-col gap-3">
          {bill.items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="text-gray-600 font-semibold">{item.price.toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {item.participants.length === 0 ? (
                  <span className="text-xs text-gray-400">No participants yet</span>
                ) : (
                  item.participants.map((p) => (
                    <span
                      key={p.id}
                      className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
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
              {!bill.settled && (
                <div className="flex gap-2">
                  <input
                    value={newParticipant[item.id] || ''}
                    onChange={(e) => setNewParticipant((p) => ({ ...p, [item.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant(item.id))}
                    placeholder="Add participant…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => handleAddParticipant(item.id)}
                    disabled={addingTo === item.id}
                    className="text-xs text-indigo-600 hover:text-indigo-800 px-2 disabled:opacity-40"
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
  )
}
