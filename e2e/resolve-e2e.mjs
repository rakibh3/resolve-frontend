/**
 * Ad-hoc end-to-end run against a live dev server + live API.
 *
 * Uses the `playwright` library directly rather than `@playwright/test`: the
 * project has no test runner and this adds no dependency. Run it with:
 *
 *   E2E_ENV_FILE=/path/to/e2e.env node e2e/resolve-e2e.mjs
 *
 * The env file supplies `E2E_EMAIL` / `E2E_PASSWORD` (the seeded owner). Both
 * `next dev` (:3000) and the API must already be running.
 *
 * Every mutation runs against a throwaway CUSTOM problem created via the API
 * and deleted in a `finally`, so an interrupted run leaves at most one stray
 * row and never touches problems the owner actually captured.
 */

import { readFileSync } from "node:fs"
import { chromium } from "playwright"

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"
const API = process.env.E2E_API_URL ?? "http://localhost:6001"

// ---------------------------------------------------------------- harness ---

let passed = 0
const failures = []
const notes = []

function check(name, condition, detail = "") {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failures.push({ name, detail })
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

function eq(name, actual, expected) {
  check(
    name,
    Object.is(actual, expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  )
}

function section(title) {
  console.log(`\n${title}`)
}

// -------------------------------------------------------------- api client ---

function loadEnv() {
  const file = process.env.E2E_ENV_FILE
  if (file) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, "")
    }
  }
  if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD are required")
  }
}

let token = ""

/** The API takes the raw JWT with no `Bearer ` prefix — see §10 of the docs. */
async function api(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
      ...init.headers,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: response.status, body: json }
}

async function apiLogin() {
  const { status, body } = await api("/api/auth/login", {
    method: "POST",
    body: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  })
  if (status !== 200 || !body?.data?.accessToken) {
    throw new Error(`API login failed (${status})`)
  }
  token = body.data.accessToken
}

// ------------------------------------------------------------- ui helpers ---

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
  await page.fill("#email", process.env.E2E_EMAIL)
  await page.fill("#password", process.env.E2E_PASSWORD)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ])
}

/**
 * Commits a chip into a `VocabularyInput`: type, then Enter.
 *
 * Targeted by label — the component ids its input with `useId()`, so there is
 * no stable selector other than the `htmlFor` wiring.
 */
async function addChip(page, label, value) {
  const field = page.getByLabel(label, { exact: true })
  await field.fill(value)
  await field.press("Enter")
}

async function heading(page) {
  return (await page.locator("h1").first().textContent())?.trim() ?? ""
}

// ------------------------------------------------------------------ suites ---

async function testAuth(browser) {
  section("Auth and route guard")

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${BASE}/problems`, { waitUntil: "domcontentloaded" })
  check(
    "unauthenticated /problems redirects to /login",
    new URL(page.url()).pathname.startsWith("/login"),
    `landed on ${page.url()}`,
  )

  await page.fill("#email", process.env.E2E_EMAIL)
  await page.fill("#password", "definitely-not-the-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForTimeout(2500)

  const alert = await page.locator('[role="alert"]').first().textContent()
  check(
    "bad password shows an error and does not sign in",
    new URL(page.url()).pathname.startsWith("/login") && Boolean(alert?.trim()),
    `url=${page.url()} alert=${JSON.stringify(alert)}`,
  )
  check(
    "error message does not leak whether the email exists",
    /invalid/i.test(alert ?? "") && !/not found|no user|record/i.test(alert ?? ""),
    JSON.stringify(alert),
  )

  await login(page)
  check(
    "valid credentials reach the authenticated shell",
    !new URL(page.url()).pathname.startsWith("/login"),
    `landed on ${page.url()}`,
  )

  const cookies = await context.cookies()
  const access = cookies.find((c) => c.name === "resolve_access")
  const refresh = cookies.find((c) => c.name === "resolve_refresh")
  check("resolve_access cookie is httpOnly", access?.httpOnly === true)
  check("resolve_refresh cookie is httpOnly", refresh?.httpOnly === true)

  await context.close()
}

async function testNavigation(page) {
  section("Page rendering")

  const routes = [
    ["/dashboard", null],
    ["/problems", "Library"],
    ["/recall", "Recall sheet"],
    ["/patterns", "Patterns"],
    ["/search", "Search"],
    ["/insights", null],
  ]

  for (const [path, expectedHeading] of routes) {
    const errors = []
    const onError = (message) => {
      if (message.type() === "error") errors.push(message.text())
    }
    page.on("console", onError)

    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
    })
    page.off("console", onError)

    check(
      `${path} responds 200`,
      response?.status() === 200,
      `status ${response?.status()}`,
    )
    if (expectedHeading) {
      eq(`${path} renders "${expectedHeading}"`, await heading(page), expectedHeading)
    }
    check(
      `${path} renders without an error boundary`,
      !(await page.getByText(/something went wrong/i).count()),
    )
    if (errors.length) {
      notes.push(`${path} console errors: ${errors.slice(0, 3).join(" | ")}`)
    }
  }
}

async function testSearchGate(page) {
  section("Search — the 2-character gate")

  await page.goto(`${BASE}/search?q=a`, { waitUntil: "networkidle" })
  check(
    "1-char query renders an empty state, not an error",
    !(await page.getByText(/something went wrong/i).count()),
  )
  check(
    "1-char query does not render a result count",
    !(await page.getByText(/\d+ results? for/i).count()),
  )

  await page.goto(`${BASE}/search?q=zzqqxx-no-such-text`, {
    waitUntil: "networkidle",
  })
  check(
    "no-match query renders an empty state, not an error",
    !(await page.getByText(/something went wrong/i).count()),
  )

  // An unrecognized scope must be dropped rather than forwarded to the API.
  const response = await page.goto(`${BASE}/search?q=sum&scope=bogus`, {
    waitUntil: "networkidle",
  })
  check(
    "unknown ?scope= is dropped instead of 400ing",
    response?.status() === 200 &&
      !(await page.getByText(/something went wrong/i).count()),
    `status ${response?.status()}`,
  )
}

async function testRecallLifecycle(page, problem) {
  section("Recall card lifecycle (create → replace → delete)")

  const before = (await api(`/api/problems/${problem.id}`)).body.data
  const editor = `${BASE}/problems/${problem.id}/recall`

  // --- create -------------------------------------------------------------
  await page.goto(editor, { waitUntil: "networkidle" })
  eq("editor titles a fresh card correctly", await heading(page), "Write a recall card")

  await page.fill("#keyInsight", "Sort, then walk two pointers inward.")
  await page.fill("#approach", "Fix i, then converge lo/hi on the remainder.")
  await page.fill("#timeComplexity", "O(n^2)")
  await addChip(page, "Patterns", "Two Pointers")
  await addChip(page, "Patterns", "Sorting")

  // A successful save toasts and then router.push()es to the problem page, so
  // the navigation — not a fixed timeout — is the signal that the write landed.
  const createToast = page.getByText(/Card (written|replaced)/i).first()
  await page.getByRole("button", { name: "Write card" }).click()
  const createCopy = await createToast
    .textContent({ timeout: 15_000 })
    .catch(() => "")
  await page
    .waitForURL(`${BASE}/problems/${problem.id}`, { timeout: 20_000 })
    .catch(() => {})

  const afterCreate = (await api(`/api/problems/${problem.id}`)).body.data
  check("card is persisted", afterCreate.hasRecallCard === true)
  eq(
    "patterns land on the problem",
    JSON.stringify([...(afterCreate.patterns ?? [])].map((p) => p.name ?? p).sort()),
    JSON.stringify(["Sorting", "Two Pointers"]),
  )
  check(
    "success copy reflects a 201 create",
    /card written/i.test(createCopy),
    `toast said ${JSON.stringify(createCopy)}`,
  )

  // The invariant that matters most: cards are knowledge, not schedule.
  section("Invariant: a card write never touches scheduling")
  eq("currentStage unchanged", afterCreate.currentStage, before.currentStage)
  eq("nextDueDate unchanged", afterCreate.nextDueDate, before.nextDueDate)
  eq("practiceState unchanged", afterCreate.practiceState, before.practiceState)
  eq(
    "revision count unchanged",
    (await api(`/api/problems/${problem.id}/attempts`)).body.data?.length ?? 0,
    (before.attempts ?? []).length,
  )

  // --- replace ------------------------------------------------------------
  section("Replace semantics (PUT is a full replace)")
  await page.goto(editor, { waitUntil: "networkidle" })
  eq("editor titles an existing card correctly", await heading(page), "Edit recall card")
  check(
    "existing key insight is prefilled",
    (await page.inputValue("#keyInsight")).includes("two pointers"),
  )

  // Drop one pattern and clear a field; a PUT must honour both.
  await page.getByRole("button", { name: "Remove Sorting" }).click()
  await page.fill("#approach", "")
  await page.fill("#keyInsight", "Replaced insight.")
  const replaceToast = page.getByText(/Card (written|replaced)/i).first()
  await page.getByRole("button", { name: "Replace card" }).click()
  const replaceCopy = await replaceToast
    .textContent({ timeout: 15_000 })
    .catch(() => "")
  await page
    .waitForURL(`${BASE}/problems/${problem.id}`, { timeout: 20_000 })
    .catch(() => {})

  const afterReplace = (await api(`/api/problems/${problem.id}`)).body.data
  const card = (await api(`/api/problems/${problem.id}/recall`)).body.data
  eq(
    "removed pattern is unlinked (full replace, not merge)",
    JSON.stringify([...(afterReplace.patterns ?? [])].map((p) => p.name ?? p)),
    JSON.stringify(["Two Pointers"]),
  )
  eq("replaced key insight is stored", card.keyInsight, "Replaced insight.")
  check(
    "cleared optional field is emptied, not retained",
    !card.approach,
    `approach=${JSON.stringify(card.approach)}`,
  )
  check(
    "success copy reflects a 200 replace",
    /card replaced/i.test(replaceCopy),
    `toast said ${JSON.stringify(replaceCopy)}`,
  )
  eq("stage still unchanged after replace", afterReplace.currentStage, before.currentStage)
  eq("due date still unchanged after replace", afterReplace.nextDueDate, before.nextDueDate)

  // --- recall sheet -------------------------------------------------------
  section("Recall sheet grouping")
  await page.goto(`${BASE}/recall`, { waitUntil: "networkidle" })
  check(
    "the new card appears on the sheet",
    Boolean(await page.getByText(problem.title).count()),
  )
  const sheet = (await api("/api/recall/sheet")).body.data
  const memberships = sheet.groups.reduce((n, g) => n + g.cards.length, 0)
  const distinct = new Set(
    sheet.groups.flatMap((g) => g.cards.map((c) => c.problemId ?? c.id)),
  ).size
  eq("totalCards counts distinct cards, not group memberships", sheet.totalCards, distinct)
  check(
    "summing groups would over-count when a card carries 2+ patterns",
    memberships >= sheet.totalCards,
    `memberships=${memberships} totalCards=${sheet.totalCards}`,
  )
  const untagged = sheet.groups.filter((g) => g.slug === null)
  check(
    "at most one untagged group, and it is last",
    untagged.length === 0 ||
      (untagged.length === 1 && sheet.groups.at(-1).slug === null),
    `groups=${JSON.stringify(sheet.groups.map((g) => g.slug))}`,
  )
  check("every group exposes a slug key (null or string)",
    sheet.groups.every((g) => "slug" in g))

  // --- delete -------------------------------------------------------------
  section("Delete unlinks patterns and still leaves scheduling alone")
  await page.goto(editor, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Delete card" }).click()
  await page.getByRole("button", { name: "Delete permanently" }).click()
  await page.waitForURL(`${BASE}/problems/${problem.id}`, { timeout: 20_000 })
  check("delete redirects back to the problem", true)

  const afterDelete = (await api(`/api/problems/${problem.id}`)).body.data
  check("card is gone", afterDelete.hasRecallCard === false)
  eq(
    "delete unlinks every pattern",
    JSON.stringify(afterDelete.patterns ?? []),
    JSON.stringify([]),
  )
  eq("stage unchanged after delete", afterDelete.currentStage, before.currentStage)
  eq("due date unchanged after delete", afterDelete.nextDueDate, before.nextDueDate)
}

async function testPatternsAreOwnerAuthored(problem) {
  section("Topics ≠ patterns")

  // POST/PATCH /api/problems must silently strip `patterns`.
  const { status } = await api(`/api/problems/${problem.id}`, {
    method: "PATCH",
    body: { patterns: ["Injected Pattern"] },
  })
  const after = (await api(`/api/problems/${problem.id}`)).body.data
  check(
    "PATCH /api/problems cannot assign patterns",
    !(after.patterns ?? []).some((p) => (p.name ?? p) === "Injected Pattern"),
    `status ${status}, patterns ${JSON.stringify(after.patterns)}`,
  )
}

// -------------------------------------------------------------------- main ---

async function main() {
  loadEnv()
  await apiLogin()

  const created = await api("/api/problems", {
    method: "POST",
    body: {
      source: "CUSTOM",
      title: `E2E fixture ${Date.now()}`,
      difficulty: "MEDIUM",
      topics: ["Array"],
    },
  })
  if (![200, 201].includes(created.status)) {
    throw new Error(`fixture creation failed (${created.status})`)
  }
  const problem = created.body.data
  console.log(`\nFixture problem: ${problem.id} — "${problem.title}"`)

  const browser = await chromium.launch()
  try {
    await testAuth(browser)

    const context = await browser.newContext()
    const page = await context.newPage()
    await login(page)

    await testNavigation(page)
    await testSearchGate(page)
    await testRecallLifecycle(page, problem)
    await testPatternsAreOwnerAuthored(problem)

    await context.close()
  } finally {
    await browser.close()
    const cleanup = await api(`/api/problems/${problem.id}`, { method: "DELETE" })
    console.log(
      `\nFixture cleanup: ${[200, 204].includes(cleanup.status) ? "deleted" : `FAILED (${cleanup.status}) — remove ${problem.id} by hand`}`,
    )
  }

  section("Summary")
  console.log(`  ${passed} passed, ${failures.length} failed`)
  for (const note of notes) console.log(`  note: ${note}`)
  for (const failure of failures) {
    console.log(`  FAIL ${failure.name}${failure.detail ? ` — ${failure.detail}` : ""}`)
  }
  process.exit(failures.length ? 1 : 0)
}

main().catch((error) => {
  console.error("\nRun aborted:", error)
  process.exit(1)
})
