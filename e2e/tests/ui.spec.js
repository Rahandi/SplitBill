import { test, expect } from '@playwright/test'

const API = '/api'

function uid() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

async function apiCreateGroup(request, name) {
  const res = await request.post(`${API}/group/create`, { data: { name } })
  return (await res.json()).data
}

async function apiDeleteGroup(request, code) {
  await request.delete(`${API}/group/${code}`)
}

async function apiSubmitBill(request, code, overrides = {}) {
  const data = {
    name: 'Dinner',
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

// ─── Homepage ─────────────────────────────────────────────────────────────────

test('homepage shows brand and create group button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('SplitBill')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create a Group' })).toBeVisible()
})

test('homepage shows stats cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Total Groups')).toBeVisible()
  await expect(page.getByText('Total Bills')).toBeVisible()
})

// ─── Create group ─────────────────────────────────────────────────────────────

test('create group flow', async ({ page, request }) => {
  const name = uid()
  await page.goto('/group/new')
  await page.getByPlaceholder('e.g. Bali Trip 2026').fill(name)
  await page.getByRole('button', { name: 'Create Group' }).click()

  await page.waitForURL(/\/group\/[^/]+$/)
  await expect(page.getByText(name)).toBeVisible()

  const code = page.url().split('/group/')[1]
  await apiDeleteGroup(request, code)
})

test('create group with passcode', async ({ page, request }) => {
  const name = uid()
  await page.goto('/group/new')
  await page.getByPlaceholder('e.g. Bali Trip 2026').fill(name)
  await page.getByPlaceholder('Leave blank for no passcode').fill('mypasscode')
  await page.getByRole('button', { name: 'Create Group' }).click()

  await page.waitForURL(/\/group\/[^/]+$/)
  const code = page.url().split('/group/')[1]
  await apiDeleteGroup(request, code)
})

// ─── Group dashboard ──────────────────────────────────────────────────────────

test.describe('Group dashboard', () => {
  let code

  test.beforeEach(async ({ request }) => {
    const g = await apiCreateGroup(request, uid())
    code = g.join_code
  })

  test.afterEach(async ({ request }) => {
    await apiDeleteGroup(request, code)
  })

  test('shows members section and add member form', async ({ page }) => {
    await page.goto(`/group/${code}`)
    await expect(page.getByText('Members')).toBeVisible()
    await expect(page.getByPlaceholder('Add a name…')).toBeVisible()
  })

  test('add member appears as chip', async ({ page }) => {
    await page.goto(`/group/${code}`)
    await page.getByPlaceholder('Add a name…').fill('Carol')
    // Use exact: true to avoid matching "Add the first bill →"
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('carol')).toBeVisible()
  })

  test('+ New Bill navigates to bill form', async ({ page }) => {
    await page.goto(`/group/${code}`)
    await page.getByRole('button', { name: '+ New Bill' }).click()
    await expect(page).toHaveURL(/\/group\/.+\/bill\/new/)
  })

  test('delete group redirects to home', async ({ page }) => {
    await page.goto(`/group/${code}`)
    page.once('dialog', d => d.accept())
    await page.getByText('Delete this group').click()
    await expect(page).toHaveURL('/')
  })
})

// ─── Navigate to deleted group ────────────────────────────────────────────────

test('navigating to deleted group shows not-found page', async ({ page, request }) => {
  const g = await apiCreateGroup(request, uid())
  await apiDeleteGroup(request, g.join_code)

  await page.goto(`/group/${g.join_code}`)
  await expect(page.getByRole('heading', { name: 'Group not found' })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible()
})

// ─── Bill form (no pre-added members → text inputs) ──────────────────────────

test.describe('New bill form', () => {
  let code

  test.beforeEach(async ({ request }) => {
    // No members added → form uses plain text inputs, simpler to drive
    const g = await apiCreateGroup(request, uid())
    code = g.join_code
  })

  test.afterEach(async ({ request }) => {
    await apiDeleteGroup(request, code)
  })

  test('submit bill and land back on group dashboard', async ({ page }) => {
    await page.goto(`/group/${code}/bill/new`)

    await page.getByPlaceholder('e.g. Dinner at Sate Khas Senayan').fill('Makan Malam')
    await page.getByPlaceholder('e.g. 250000').fill('100000')
    await page.getByPlaceholder('e.g. Rahandi', { exact: true }).fill('alice')

    await page.getByPlaceholder('e.g. Sate Ayam').fill('Nasi Goreng')
    await page.getByPlaceholder('45000').fill('100000')
    await page.getByPlaceholder('e.g. Rahandi, Alvian, Dimas').fill('alice, bob')

    await page.getByRole('button', { name: 'Submit Bill' }).click()

    await page.waitForURL(`/group/${code}`)
    await expect(page.getByText('Makan Malam')).toBeVisible()
  })
})

// ─── Bill detail ──────────────────────────────────────────────────────────────

test.describe('Bill detail', () => {
  let code, billId

  test.beforeAll(async ({ request }) => {
    const g = await apiCreateGroup(request, uid())
    code = g.join_code
    const bill = await apiSubmitBill(request, code)
    billId = bill.id
  })

  test.afterAll(async ({ request }) => {
    await apiDeleteGroup(request, code)
  })

  test('shows bill name, total, and items', async ({ page }) => {
    await page.goto(`/bill/${billId}`)
    await expect(page.getByText('Dinner')).toBeVisible()
    await expect(page.getByText('120,000')).toBeVisible()
    await expect(page.getByText('Nasi Goreng')).toBeVisible()
    await expect(page.getByText('Es Teh')).toBeVisible()
  })

  test('calculate shares shows breakdown', async ({ page }) => {
    await page.goto(`/bill/${billId}`)
    await page.getByRole('button', { name: 'Calculate Shares' }).click()
    // Look for the "Pay to" heading specifically
    await expect(page.getByRole('heading', { name: /Pay to/i })).toBeVisible()
  })

  test('settle bill shows settled badge', async ({ page }) => {
    await page.goto(`/bill/${billId}`)
    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Mark Settled' }).click()
    // The settled badge is a span with text "Settled"
    await expect(page.locator('span', { hasText: 'Settled' }).last()).toBeVisible()
  })
})

// ─── Settled history ──────────────────────────────────────────────────────────

test('settled history appears after settling a bill', async ({ page, request }) => {
  const g = await apiCreateGroup(request, uid())
  const code = g.join_code
  const bill = await apiSubmitBill(request, code, { name: 'History Test' })
  await request.post(`${API}/bill/${bill.id}/settle`)

  await page.goto(`/group/${code}`)
  await page.getByText('Show settled bills').click()
  await expect(page.getByText('History Test')).toBeVisible()
  // The green "Settled" badge in the settled bill card
  await expect(page.getByText('Settled', { exact: true })).toBeVisible()

  await apiDeleteGroup(request, code)
})

// ─── Delete bill ──────────────────────────────────────────────────────────────

test('delete bill from bill detail navigates back to group', async ({ page, request }) => {
  const g = await apiCreateGroup(request, uid())
  const code = g.join_code
  const bill = await apiSubmitBill(request, code, { name: 'Delete Me' })

  await page.goto(`/bill/${bill.id}`)
  await expect(page.getByText('Delete Me')).toBeVisible()

  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Delete' }).click()

  await page.waitForURL(`/group/${code}`)
  await expect(page.getByText('Delete Me')).not.toBeVisible()

  await apiDeleteGroup(request, code)
})
