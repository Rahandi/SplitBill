import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { createGroup, submitGroupBill, parseReceipt, getGroupMembers } from '../api'

function emptyItem() {
  return { name: '', price: '', participants: [] }
}

function MemberChips({ members, selected, onChange }) {
  function toggle(name) {
    onChange(
      selected.includes(name)
        ? selected.filter(n => n !== name)
        : [...selected, name]
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map(name => {
        const on = selected.includes(name)
        return (
          <button
            key={name}
            type="button"
            onClick={() => toggle(name)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
              on
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

function PayerChips({ members, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map(name => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${
            value === name
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

export default function NewBill() {
  const navigate = useNavigate()
  const { code: groupCode } = useParams()

  const [billName, setBillName] = useState('')
  const [total, setTotal] = useState('')
  const [payerName, setPayerName] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!groupCode) return
    const passcode = sessionStorage.getItem(`group_passcode_${groupCode}`) || undefined
    getGroupMembers(groupCode, passcode).then(setMembers).catch(() => {})
  }, [groupCode])

  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleReceiptUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanPreview(URL.createObjectURL(file))
    setScanning(true)
    setError('')
    try {
      const result = await parseReceipt(file)
      if (result.items.length > 0) {
        setItems(result.items.map(item => ({
          name: item.name,
          price: String(item.price),
          participants: [],
        })))
      }
      if (result.total > 0) setTotal(String(result.total))
    } catch (err) {
      setError(`Receipt scan failed: ${err.message}`)
    } finally {
      setScanning(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        name: billName.trim(),
        total: parseInt(total),
        payer_name: payerName.trim(),
        items: items.map(item => ({
          name: item.name.trim(),
          price: parseInt(item.price),
          participants: Array.isArray(item.participants)
            ? item.participants
            : item.participants.split(',').map(p => p.trim()).filter(Boolean),
        })),
      }
      let targetCode = groupCode
      if (!targetCode) {
        const group = await createGroup({ name: billName.trim() })
        targetCode = group.join_code
      }
      const passcode = sessionStorage.getItem(`group_passcode_${targetCode}`) || undefined
      await submitGroupBill(targetCode, payload, passcode)
      navigate(`/group/${targetCode}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const useChips = members.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            to={groupCode ? `/group/${groupCode}` : '/'}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-gray-900">New Bill</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Receipt scanner */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 mb-5 text-center bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleReceiptUpload}
          />
          {scanPreview ? (
            <div className="flex flex-col items-center gap-3">
              <img src={scanPreview} alt="Receipt" className="max-h-40 rounded-lg object-contain" />
              {scanning ? (
                <p className="text-sm text-indigo-500">Scanning receipt…</p>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Scan a different receipt
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              disabled={scanning}
              className="flex flex-col items-center gap-2 w-full text-gray-400 hover:text-indigo-500 transition disabled:opacity-40"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm font-medium">Scan Receipt</span>
              <span className="text-xs text-gray-400">Upload a photo to auto-fill items and total</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Bill info */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
              <input
                required
                value={billName}
                onChange={e => setBillName(e.target.value)}
                placeholder="e.g. Dinner at Sate Khas Senayan"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input
                required
                type="number"
                min="0"
                value={total}
                onChange={e => setTotal(e.target.value)}
                placeholder="e.g. 250000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paid by</label>
              {useChips ? (
                <PayerChips members={members} value={payerName} onChange={setPayerName} />
              ) : (
                <input
                  required
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  placeholder="e.g. Rahandi"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}
              {/* hidden required field guard when using chips */}
              {useChips && (
                <input
                  tabIndex={-1}
                  required
                  value={payerName}
                  onChange={() => {}}
                  className="sr-only"
                />
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add Item
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {items.map((item, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Item Name</label>
                      <input
                        required
                        value={item.name}
                        onChange={e => updateItem(i, 'name', e.target.value)}
                        placeholder="e.g. Sate Ayam"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-gray-500 mb-1">Price</label>
                      <input
                        required
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={e => updateItem(i, 'price', e.target.value)}
                        placeholder="45000"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-gray-300 hover:text-red-400 text-xl leading-none pb-2"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Participants</label>
                    {useChips ? (
                      <MemberChips
                        members={members}
                        selected={item.participants}
                        onChange={val => updateItem(i, 'participants', val)}
                      />
                    ) : (
                      <input
                        value={item.participants}
                        onChange={e => updateItem(i, 'participants', e.target.value)}
                        placeholder="e.g. Rahandi, Alvian, Dimas"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || scanning}
            className="bg-indigo-600 text-white py-3 rounded-2xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Bill'}
          </button>
        </form>
      </main>
    </div>
  )
}
