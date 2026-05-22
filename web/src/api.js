const BASE = '/api'

async function request(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (json.status === 'error') throw new Error(json.error)
  return json.data
}

function passcodeHeader(passcode) {
  return passcode ? { 'X-Group-Passcode': passcode } : {}
}

export const getStats = () => request('GET', '/stats')

export const getBill = (id, passcode) =>
  request('GET', `/bill/${id}`, null, passcodeHeader(passcode))
export const submitBill = (data) => request('POST', '/bill/submit', data)
export const calculateBill = (id, passcode) =>
  request('GET', `/bill/${id}/calculate`, null, passcodeHeader(passcode))
export const settleBill = (id, passcode) =>
  request('POST', `/bill/${id}/settle`, null, passcodeHeader(passcode))
export const addParticipant = (itemId, name, passcode) =>
  request('POST', `/item/${itemId}/add_participant`, { participant_name: name }, passcodeHeader(passcode))
export const removeParticipant = (itemId, name, passcode) =>
  request('POST', `/item/${itemId}/remove_participant`, { participant_name: name }, passcodeHeader(passcode))

export const getGroupMembers = (code, passcode) =>
  request('GET', `/group/${code}/members`, null, passcodeHeader(passcode))
export const addGroupMember = (code, name, passcode) =>
  request('POST', `/group/${code}/members`, { name }, passcodeHeader(passcode))
export const removeGroupMember = (code, name, passcode) =>
  request('DELETE', `/group/${code}/members/${encodeURIComponent(name)}`, null, passcodeHeader(passcode))
export const createGroup = (data) => request('POST', '/group/create', data)
export const getGroup = (code, passcode) =>
  request('GET', `/group/${code}`, null, passcodeHeader(passcode))
export const verifyGroupPasscode = (code, passcode) =>
  request('POST', `/group/${code}/verify`, { passcode })
export const getGroupUnsettledBills = (code, passcode) =>
  request('GET', `/group/${code}/bills/unsettled`, null, passcodeHeader(passcode))
export const calculateGroupBills = (code, passcode) =>
  request('GET', `/group/${code}/bills/calculate`, null, passcodeHeader(passcode))
export const settleGroupBills = (code, passcode) =>
  request('POST', `/group/${code}/bills/settle`, {}, passcodeHeader(passcode))
export const submitGroupBill = (code, data, passcode) =>
  request('POST', `/group/${code}/bill/submit`, data, passcodeHeader(passcode))

export async function parseReceipt(file) {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE}/receipt/parse`, { method: 'POST', body: form })
  const json = await res.json()
  if (json.status === 'error') throw new Error(json.error)
  return json.data
}
