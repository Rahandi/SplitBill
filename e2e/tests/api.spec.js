import { test, expect } from '@playwright/test'

const API = '/api'

function uid() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

async function createGroup(request, name, passcode) {
  const res = await request.post(`${API}/group/create`, {
    data: { name, ...(passcode ? { passcode } : {}) },
  })
  return (await res.json()).data
}

async function submitBill(request, code, overrides = {}) {
  const data = {
    name: 'Test Dinner',
    total: 120000,
    payer_name: 'alice',
    items: [
      { name: 'Nasi Goreng', price: 80000, participants: ['alice', 'bob'] },
      { name: 'Es Teh', price: 40000, participants: ['bob'] },
    ],
    ...overrides,
  }
  const res = await request.post(`${API}/group/${code}/bill/submit`, { data })
  return (await res.json()).data
}

async function deleteGroup(request, code, passcode) {
  await request.delete(`${API}/group/${code}`, {
    headers: passcode ? { 'X-Group-Passcode': passcode } : {},
  })
}

// ─── Stats ───────────────────────────────────────────────────────────────────

test('GET /stats returns numeric counts', async ({ request }) => {
  const res = await request.get(`${API}/stats`)
  const body = await res.json()
  expect(body.status).toBe('success')
  expect(typeof body.data.total_groups).toBe('number')
  expect(typeof body.data.total_bills).toBe('number')
})

// ─── Group CRUD ───────────────────────────────────────────────────────────────

test.describe('Group CRUD', () => {
  test('create → get → delete', async ({ request }) => {
    const name = uid()
    const group = await createGroup(request, name)
    expect(group.name).toBe(name)
    expect(group.join_code).toBeDefined()
    expect(group.has_passcode).toBe(false)

    const getRes = await request.get(`${API}/group/${group.join_code}`)
    expect((await getRes.json()).data.name).toBe(name)

    await deleteGroup(request, group.join_code)
    const gone = await request.get(`${API}/group/${group.join_code}`)
    expect((await gone.json()).error).toBe('Group not found')
  })

  test('missing name returns 400', async ({ request }) => {
    const res = await request.post(`${API}/group/create`, { data: {} })
    expect((await res.json()).error).toBe('Group name is required')
  })
})

// ─── Passcode-protected groups ────────────────────────────────────────────────

test.describe('Protected group', () => {
  let code
  const secret = 'testpassword123'

  test.beforeAll(async ({ request }) => {
    const g = await createGroup(request, uid(), secret)
    code = g.join_code
  })

  test.afterAll(async ({ request }) => {
    await deleteGroup(request, code, secret)
  })

  test('wrong passcode returns 403', async ({ request }) => {
    const res = await request.get(`${API}/group/${code}`, {
      headers: { 'X-Group-Passcode': 'wrongpassword' },
    })
    expect(res.status()).toBe(403)
    expect((await res.json()).error).toBe('Invalid passcode')
  })

  test('correct passcode returns group', async ({ request }) => {
    const res = await request.get(`${API}/group/${code}`, {
      headers: { 'X-Group-Passcode': secret },
    })
    expect((await res.json()).status).toBe('success')
  })

  test('verify passcode endpoint', async ({ request }) => {
    const ok = await request.post(`${API}/group/${code}/verify`, { data: { passcode: secret } })
    expect((await ok.json()).data.valid).toBe(true)

    const bad = await request.post(`${API}/group/${code}/verify`, { data: { passcode: 'wrong' } })
    expect((await bad.json()).data.valid).toBe(false)
  })
})

// ─── Bill lifecycle ───────────────────────────────────────────────────────────

test.describe('Bill lifecycle', () => {
  let code, billId

  test.beforeAll(async ({ request }) => {
    const g = await createGroup(request, uid())
    code = g.join_code
    const bill = await submitBill(request, code)
    billId = bill.id
  })

  test.afterAll(async ({ request }) => {
    await deleteGroup(request, code)
  })

  test('submitted bill has correct shape', async ({ request }) => {
    const res = await request.get(`${API}/bill/${billId}`)
    const bill = (await res.json()).data
    expect(bill.name).toBe('Test Dinner')
    expect(bill.total).toBe(120000)
    expect(bill.payer.name).toBe('alice')
    expect(bill.items).toHaveLength(2)
    expect(bill.settled).toBeFalsy()
  })

  test('calculate shares sums to bill total', async ({ request }) => {
    const res = await request.get(`${API}/bill/${billId}/calculate`)
    const data = (await res.json()).data
    expect(data.payer.name).toBe('alice')
    const shareTotal = data.shares.reduce((s, x) => s + x.amount, 0)
    expect(shareTotal).toBe(120000)
  })

  test('group bills/calculate returns debts and errors keys', async ({ request }) => {
    const res = await request.get(`${API}/group/${code}/bills/calculate`)
    const data = (await res.json()).data
    expect(data).toHaveProperty('debts')
    expect(data).toHaveProperty('errors')
  })

  test('settled history empty before settling', async ({ request }) => {
    const res = await request.get(`${API}/group/${code}/bills/settled`)
    expect((await res.json()).data).toHaveLength(0)
  })

  test('settle bill', async ({ request }) => {
    const res = await request.post(`${API}/bill/${billId}/settle`)
    const bill = (await res.json()).data
    expect(bill.settled).toBeTruthy()
  })

  test('settled history has 1 bill after settling', async ({ request }) => {
    const res = await request.get(`${API}/group/${code}/bills/settled`)
    expect((await res.json()).data).toHaveLength(1)
  })

  test('unsettled bills is empty after settling', async ({ request }) => {
    const res = await request.get(`${API}/group/${code}/bills/unsettled`)
    expect((await res.json()).data).toHaveLength(0)
  })
})

// ─── Delete bill ──────────────────────────────────────────────────────────────

test.describe('Delete bill', () => {
  let code, billId

  test.beforeAll(async ({ request }) => {
    const g = await createGroup(request, uid())
    code = g.join_code
    const bill = await submitBill(request, code, { name: 'To Delete' })
    billId = bill.id
  })

  test.afterAll(async ({ request }) => {
    await deleteGroup(request, code)
  })

  test('delete removes bill from unsettled list', async ({ request }) => {
    const before = await request.get(`${API}/group/${code}/bills/unsettled`)
    expect((await before.json()).data).toHaveLength(1)

    const del = await request.delete(`${API}/bill/${billId}`)
    expect((await del.json()).status).toBe('success')

    const after = await request.get(`${API}/group/${code}/bills/unsettled`)
    expect((await after.json()).data).toHaveLength(0)
  })

  test('deleted bill returns 404', async ({ request }) => {
    const res = await request.get(`${API}/bill/${billId}`)
    expect(res.status()).toBe(404)
  })
})

// ─── Input validation ─────────────────────────────────────────────────────────

test.describe('Input validation', () => {
  let code

  test.beforeAll(async ({ request }) => {
    const g = await createGroup(request, uid())
    code = g.join_code
  })

  test.afterAll(async ({ request }) => {
    await deleteGroup(request, code)
  })

  test('non-numeric bill id returns 400', async ({ request }) => {
    const res = await request.get(`${API}/bill/notanumber`)
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBe('Invalid bill ID')
  })

  test('non-numeric item id returns 400', async ({ request }) => {
    const res = await request.get(`${API}/item/notanumber`)
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBe('Invalid item ID')
  })

  test('missing bill name returns 400', async ({ request }) => {
    const res = await request.post(`${API}/group/${code}/bill/submit`, {
      data: { name: '', total: 1000, payer_name: 'x', items: [] },
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBe('Bill name is required')
  })

  test('missing total returns 400', async ({ request }) => {
    const res = await request.post(`${API}/group/${code}/bill/submit`, {
      data: { name: 'Test', payer_name: 'x', items: [] },
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBe('Total is required')
  })

  test('missing payer_name returns 400', async ({ request }) => {
    const res = await request.post(`${API}/group/${code}/bill/submit`, {
      data: { name: 'Test', total: 1000, items: [] },
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toBe('Payer name is required')
  })

  test('bill with all-zero item prices returns error on calculate', async ({ request }) => {
    const bill = await submitBill(request, code, {
      name: 'Zero Prices',
      total: 0,
      items: [{ name: 'Free', price: 0, participants: ['alice'] }],
    })
    const res = await request.get(`${API}/bill/${bill.id}/calculate`)
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toContain('zero price')
  })
})

// ─── Group members ────────────────────────────────────────────────────────────

test.describe('Group members', () => {
  let code

  test.beforeAll(async ({ request }) => {
    const g = await createGroup(request, uid())
    code = g.join_code
  })

  test.afterAll(async ({ request }) => {
    await deleteGroup(request, code)
  })

  test('add members and list them', async ({ request }) => {
    await request.post(`${API}/group/${code}/members`, { data: { name: 'Alice' } })
    await request.post(`${API}/group/${code}/members`, { data: { name: 'Bob' } })

    const res = await request.get(`${API}/group/${code}/members`)
    const members = (await res.json()).data
    expect(members).toContain('alice')
    expect(members).toContain('bob')
  })

  test('duplicate member returns 409', async ({ request }) => {
    const res = await request.post(`${API}/group/${code}/members`, { data: { name: 'Alice' } })
    expect(res.status()).toBe(409)
  })

  test('remove member', async ({ request }) => {
    await request.delete(`${API}/group/${code}/members/alice`)
    const res = await request.get(`${API}/group/${code}/members`)
    const members = (await res.json()).data
    expect(members).not.toContain('alice')
    expect(members).toContain('bob')
  })

  test('missing member name returns 400', async ({ request }) => {
    const res = await request.post(`${API}/group/${code}/members`, { data: { name: '' } })
    expect(res.status()).toBe(400)
  })
})

// ─── Delete group cascades ────────────────────────────────────────────────────

test('delete group cascades to bills and members', async ({ request }) => {
  const g = await createGroup(request, uid())
  const code = g.join_code

  await request.post(`${API}/group/${code}/members`, { data: { name: 'Tester' } })
  const bill = await submitBill(request, code, { name: 'Cascade Test' })

  await deleteGroup(request, code)

  const groupGone = await request.get(`${API}/group/${code}`)
  expect(groupGone.status()).toBe(404)

  const billGone = await request.get(`${API}/bill/${bill.id}`)
  expect(billGone.status()).toBe(404)
})
