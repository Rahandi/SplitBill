const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (json.status === 'error') throw new Error(json.error)
  return json.data
}

export const getStats = () => request('GET', '/stats')
export const getBill = (id) => request('GET', `/bill/${id}`)
export const submitBill = (data) => request('POST', '/bill/submit', data)
export const calculateBill = (id) => request('GET', `/bill/${id}/calculate`)
export const settleBill = (id) => request('POST', `/bill/${id}/settle`)
export const getUnsettledBills = () => request('GET', '/bills/unsettled')
export const calculateAllBills = () => request('GET', '/bills/calculate')
export const settleAllBills = () => request('POST', '/bills/settle')
export const addParticipant = (itemId, name) =>
  request('POST', `/item/${itemId}/add_participant`, { participant_name: name })
export const removeParticipant = (itemId, name) =>
  request('POST', `/item/${itemId}/remove_participant`, { participant_name: name })

export const getGroupMembers = (code, passcode) =>
  request('GET', `/group/${code}/members${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ''}`)
export const addGroupMember = (code, name, passcode) =>
  request('POST', `/group/${code}/members`, passcode ? { name, passcode } : { name })
export const removeGroupMember = (code, name, passcode) =>
  request('DELETE', `/group/${code}/members/${encodeURIComponent(name)}${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ''}`)
export const createGroup = (data) => request('POST', '/group/create', data)
export const getGroup = (code, passcode) =>
  request('GET', `/group/${code}${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ''}`)
export const verifyGroupPasscode = (code, passcode) =>
  request('POST', `/group/${code}/verify`, { passcode })
export const getGroupUnsettledBills = (code, passcode) =>
  request('GET', `/group/${code}/bills/unsettled${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ''}`)
export const calculateGroupBills = (code, passcode) =>
  request('GET', `/group/${code}/bills/calculate${passcode ? `?passcode=${encodeURIComponent(passcode)}` : ''}`)
export const settleGroupBills = (code, passcode) =>
  request('POST', `/group/${code}/bills/settle`, passcode ? { passcode } : {})
export const submitGroupBill = (code, data) =>
  request('POST', `/group/${code}/bill/submit`, data)

export async function parseReceipt(file) {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE}/receipt/parse`, { method: 'POST', body: form })
  const json = await res.json()
  if (json.status === 'error') throw new Error(json.error)
  return json.data
}
