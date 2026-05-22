import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getGroup,
  verifyGroupPasscode,
  getGroupUnsettledBills,
  calculateGroupBills,
  settleGroupBills,
} from '../api'

function passcodeKey(code) {
  return `group_passcode_${code}`
}

export default function GroupDashboard() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [bills, setBills] = useState([])
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [copied, setCopied] = useState(false)

  // Passcode gate state
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
      const [billList, debtMap] = await Promise.all([
        getGroupUnsettledBills(code, passcode()),
        calculateGroupBills(code, passcode()),
      ])
      setBills(billList)
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
    // Probe group existence first without auth to detect if passcode needed
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading…</p>
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={verifying || !passcodeInput}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {verifying ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← All bills</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">{group?.name}</h1>
        </div>
        <button
          onClick={() => navigate(`/group/${code}/bill/new`)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
        >
          + New Bill
        </button>
      </div>

      {/* Share link */}
      <div className="flex items-center gap-2 mb-8 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-xs text-gray-500 truncate flex-1">{window.location.href}</span>
        <button
          onClick={copyLink}
          className="text-xs bg-white border border-gray-300 rounded px-2.5 py-1 hover:bg-gray-100 transition whitespace-nowrap"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Net Debts */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Who Owes Who</h2>
        {debts.length === 0 ? (
          <p className="text-gray-400 text-sm">No outstanding debts.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Debtor</th>
                  <th className="px-4 py-3 text-left">Owes</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((d, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium capitalize">{d.debtor}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{d.creditor}</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                      {d.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Unsettled Bills */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-700">Unsettled Bills</h2>
          {bills.length > 0 && (
            <button
              onClick={handleSettleAll}
              disabled={settling}
              className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
            >
              Settle All
            </button>
          )}
        </div>
        {bills.length === 0 ? (
          <p className="text-gray-400 text-sm">No unsettled bills. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {bills.map((bill) => (
              <Link
                key={bill.id}
                to={`/bill/${bill.id}`}
                className="block border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{bill.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Paid by <span className="capitalize">{bill.payer.name}</span>
                    </p>
                  </div>
                  <span className="text-lg font-bold text-gray-800">
                    {bill.total.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
