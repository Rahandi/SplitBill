import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createGroup } from '../api'

export default function CreateGroup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const payload = { name: name.trim() }
      if (passcode.trim()) payload.passcode = passcode.trim()
      const group = await createGroup(payload)
      navigate(`/group/${group.join_code}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="mb-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Create Group</h1>
          <p className="text-gray-500 text-sm mt-1">Share the group link with your friends to track bills together.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Bali Trip 2026"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passcode <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Leave blank for no passcode"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showPasscode ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Creating…' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  )
}
