/**
 * Focused check on the pattern/topic picker in the recall card editor.
 *
 * Companion to `resolve-e2e.mjs`, same shape: no test runner, no new
 * dependency, and every mutation runs against a throwaway CUSTOM problem that
 * is deleted in a `finally`. Run it with:
 *
 *   E2E_ENV_FILE=/path/to/e2e.env node e2e/vocabulary-input.mjs
 *
 * Set `E2E_SHOT_DIR` to also write full-page screenshots of the field.
 *
 * Caveat: the run leaves one zero-count pattern behind. The API has no pattern
 * delete endpoint — a pattern exists from the moment a card first names it.
 */

import { readFileSync } from "node:fs"
import { chromium } from "playwright"

const env = Object.fromEntries(
  readFileSync(process.env.E2E_ENV_FILE, "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=")
      return [
        line.slice(0, index).trim(),
        line
          .slice(index + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ]
    }),
)

const BASE = "http://localhost:3000"
const API = "http://localhost:6001"
const SHOT = process.env.E2E_SHOT_DIR
const shoot = async (page, name) => {
  if (SHOT) await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true })
}

const results = []
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail })
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`)
}

const login = await fetch(`${API}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: env.E2E_EMAIL,
    password: env.E2E_PASSWORD,
  }),
})
const token = (await login.json()).data.accessToken

const api = async (path, init = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...init.headers,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  return { status: response.status, body: await response.json() }
}

const patterns = (await api("/api/patterns")).body.data
console.log(
  `existing patterns: ${patterns.map((p) => `${p.name}(${p.problemCount})`).join(", ")}`,
)

// A throwaway problem so nothing the owner captured is touched.
const created = await api("/api/problems", {
  method: "POST",
  body: {
    title: `Vocab check ${Date.now()}`,
    difficulty: "MEDIUM",
    source: "CUSTOM",
  },
})
const problem = created.body.data.problem ?? created.body.data

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } })

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" })
  await page.fill("#email", env.E2E_EMAIL)
  await page.fill("#password", env.E2E_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })

  const editor = `${BASE}/problems/${problem.id}/recall`
  await page.goto(editor, { waitUntil: "networkidle" })

  const listbox = page.getByRole("listbox", { name: "Patterns to choose from" })
  const options = listbox.getByRole("option")

  // 1. The vocabulary is on screen before anything is typed.
  const upfront = await options.count()
  check(
    "existing patterns are offered without typing",
    upfront > 0,
    `${upfront} option(s) visible on load`,
  )
  const upfrontNames = await options.allTextContents()
  check(
    "offered entries carry their problem counts",
    upfrontNames.every((text) => /\d$/.test(text.trim())),
    upfrontNames.join(" | "),
  )
  await shoot(page, "vocab-browse")

  // 2. Clicking one commits it as a chip.
  const first = (await options.first().textContent()).replace(/\d+$/, "").trim()
  await options.first().click()
  const chip = page.getByLabel(`Remove ${first}`)
  check(
    "clicking an offered pattern commits it",
    await chip.isVisible(),
    `picked "${first}"`,
  )
  check(
    "a committed pattern drops out of the offer list",
    !(await options.allTextContents()).some((t) =>
      t.replace(/\d+$/, "").trim() === first,
    ),
  )

  // 3. Typing filters, and keyboard selection works without the mouse.
  const field = page.getByLabel("Patterns", { exact: true })
  const second = patterns.find((p) => p.name !== first)
  await field.fill(second.name.slice(0, 3))
  await page.waitForTimeout(150)
  const filtered = await options.allTextContents()
  check(
    "typing filters the list",
    filtered.some((t) => t.includes(second.name)),
    filtered.join(" | "),
  )
  await field.press("ArrowDown")
  await field.press("Enter")
  check(
    "ArrowDown + Enter picks the highlighted entry",
    await page.getByLabel(`Remove ${second.name}`).isVisible(),
    `picked "${second.name}" by keyboard`,
  )

  // 4. A brand-new name is offered as an explicit "Create", not silently typed.
  const fresh = `Zz Check ${Date.now().toString().slice(-5)}`
  await field.fill(fresh)
  await page.waitForTimeout(150)
  const createOption = listbox.getByRole("option", { name: /^Create/ })
  check(
    "an unknown name is offered as an explicit Create option",
    await createOption.isVisible(),
    await createOption.textContent(),
  )
  await shoot(page, "vocab-create")

  // 5. An uncommitted draft is no longer lost on submit.
  await page.fill("#keyInsight", "Vocabulary field check")
  const toast = page.getByText(/Card (written|replaced)/i).first()
  await page.getByRole("button", { name: /Write card|Replace card/ }).click()
  await toast.textContent({ timeout: 15_000 }).catch(() => "")
  await page
    .waitForURL(`${BASE}/problems/${problem.id}`, { timeout: 20_000 })
    .catch(() => {})

  const saved = (await api(`/api/problems/${problem.id}`)).body.data
  const savedNames = saved.patterns.map((p) => p.name)
  check(
    "the typed-but-not-committed draft survived submit",
    savedNames.includes(fresh),
    savedNames.join(", "),
  )
  check(
    "both picked patterns were saved",
    savedNames.includes(first) && savedNames.includes(second.name),
    savedNames.join(", "),
  )
  check(
    "a card write still leaves the schedule alone",
    saved.currentStage === problem.currentStage &&
      saved.nextDueDate === problem.nextDueDate,
    `${saved.currentStage} / ${saved.nextDueDate}`,
  )

  // 6. Reopening the editor prefills the chips and omits them from the offers.
  await page.goto(editor, { waitUntil: "networkidle" })
  check(
    "saved patterns come back as chips",
    await page.getByLabel(`Remove ${first}`).isVisible(),
  )
  check(
    "already-attached patterns are not offered again",
    !(await options.allTextContents()).some((t) =>
      t.replace(/\d+$/, "").trim() === first,
    ),
  )
  await shoot(page, "vocab-edit")
} finally {
  await browser.close()
  await api(`/api/problems/${problem.id}`, { method: "DELETE" })
  console.log("fixture problem deleted")
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
process.exit(failed.length ? 1 : 0)
