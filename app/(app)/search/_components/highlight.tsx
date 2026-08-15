import { Fragment } from "react"

/**
 * Marks every case-insensitive occurrence of `query` inside `text`.
 *
 * The backend returns plain snippets with no offsets and no markup, so the
 * highlighting is done here. Two deliberate choices:
 *
 * - Matching is done with `indexOf` over lowercased copies rather than a
 *   `RegExp`. The query is whatever the owner typed, and a search for `O(n)`
 *   or `a|b` would either throw or match the wrong thing once compiled as a
 *   pattern. There is nothing to escape if nothing is compiled.
 * - The segments are rendered as React children, never as HTML, so a snippet
 *   containing markup is shown as text.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase()
  if (!needle) return <>{text}</>

  const haystack = text.toLowerCase()
  const segments: { value: string; match: boolean }[] = []

  let cursor = 0
  let found = haystack.indexOf(needle, cursor)

  while (found !== -1) {
    if (found > cursor) {
      segments.push({ value: text.slice(cursor, found), match: false })
    }
    segments.push({
      value: text.slice(found, found + needle.length),
      match: true,
    })
    cursor = found + needle.length
    found = haystack.indexOf(needle, cursor)
  }

  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor), match: false })
  }

  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.match ? (
            <mark className="rounded-xs bg-state-due px-0.5 text-state-due-foreground">
              {segment.value}
            </mark>
          ) : (
            segment.value
          )}
        </Fragment>
      ))}
    </>
  )
}
