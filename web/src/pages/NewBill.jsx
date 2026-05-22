import { useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { createGroup, submitGroupBill, parseReceipt } from '../api'

function emptyItem() {
  return { name: '', price: '', participants: '' }
}

export default function NewBill() {
  const navigate = useNavigate()
  const { code: groupCode } = useParams()
  const [billName, setBillName] = useState('')
  const [total, setTotal] = useState('')
  const [payerName, setPayerName] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState(null)
  const fileInputRef = useRef(null)

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
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
        setItems(result.items.map((item) => ({
          name: item.name,
          price: String(item.price),
          participants: '',
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
        items: items.map((item) => ({
          name: item.name.trim(),
          price: parseInt(item.price),
          participants: item.participants.split(',').map((p) => p.trim()).filter(Boolean),
        })),
      }
      let targetCode = groupCode
      if (!targetCode) {
        const group = await createGroup({ name: billName.trim() })
        targetCode = group.join_code
      }
      const passcode = sessionStorage.getItem(`group_passcode_${targetCode}`) || undefined
      await submitGroupBill(targetCode, passcode ? { ...payload, passcode } : payload)
      navigate(`/group/${targetCode}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to={groupCode ? `/group/${groupCode}` : '/'} className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900">New Bill</h1>
      </div>

      {/* Receipt scanner */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 mb-6 text-center">
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Bill info */}
        <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
            <input
              required
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="e.g. Dinner at Sate Khas Senayan"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input
                required
                type="number"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="e.g. 250000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid by</label>
              <input
                required
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. Rahandi"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              + Add Item
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Item Name</label>
                    <input
                      required
                      value={item.name}
                      onChange={(e) => updateItem(i, 'name', e.target.value)}
                      placeholder="e.g. Sate Ayam"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-gray-500 mb-1">Price</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(i, 'price', e.target.value)}
                      placeholder="45000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none pb-2"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Participants <span className="text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    value={item.participants}
                    onChange={(e) => updateItem(i, 'participants', e.target.value)}
                    placeholder="e.g. Rahandi, Alvian, Dimas"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || scanning}
          className="bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Bill'}
        </button>
      </form>
    </div>
  )
}
