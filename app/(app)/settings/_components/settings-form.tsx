"use client"

import { useActionState, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { UserSettings } from "@/lib/api/types"
import { formatLocalDate } from "@/lib/date"

import { updateSettings, type SettingsState } from "../actions"

const initialState: SettingsState = {}

/** Every IANA zone the runtime knows about. */
function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone")
  } catch {
    return []
  }
}

function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return null
  }
}

export function SettingsForm({ settings }: { settings: UserSettings }) {
  const zones = useMemo(() => supportedTimezones(), [])
  const suggested = useMemo(() => browserTimezone(), [])
  const [timezone, setTimezone] = useState(settings.timezone)

  const [state, formAction, pending] = useActionState(
    async (previous: SettingsState, formData: FormData) => {
      const result = await updateSettings(
        settings.timezone,
        previous,
        formData,
      )
      if (result.ok && result.message) toast.success(result.message)
      else if (result.message) toast.error(result.message)
      return result
    },
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <select
            id="timezone"
            name="timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
            aria-invalid={state.fieldErrors?.timezone ? true : undefined}
          >
            {/* The stored value is authoritative, even if it is not in the
                runtime's list. */}
            {!zones.includes(settings.timezone) && (
              <option value={settings.timezone}>{settings.timezone}</option>
            )}
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>

          <FieldDescription>
            This governs every date in ReSolve — due dates, &ldquo;today&rdquo;,
            streaks, activity buckets, and reminder timing.
          </FieldDescription>

          {/* The browser's zone is a suggestion only, never a substitution. */}
          {suggested && suggested !== timezone && (
            <FieldDescription>
              Your browser reports {suggested}.{" "}
              <button
                type="button"
                onClick={() => setTimezone(suggested)}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Use it
              </button>
            </FieldDescription>
          )}

          {state.fieldErrors?.timezone && (
            <FieldError>{state.fieldErrors.timezone}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="reminderTime">Daily reminder time</FieldLabel>
          {/* A time input always produces zero-padded 24-hour HH:mm, which is
              exactly the format the API requires. */}
          <Input
            id="reminderTime"
            name="reminderTime"
            type="time"
            required
            defaultValue={settings.reminderTime}
            // A time input is a composite widget: tabbing moves between its
            // hour/minute segments and Chromium does not reliably report
            // :focus-visible on the host, so the ring is keyed off focus-within
            // and shows whenever focus is anywhere inside the field.
            className="w-32 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
            aria-invalid={state.fieldErrors?.reminderTime ? true : undefined}
          />
          <FieldDescription>
            Once this time passes in your timezone, the reminder stays available
            for the rest of the day.
          </FieldDescription>
          {state.fieldErrors?.reminderTime && (
            <FieldError>{state.fieldErrors.reminderTime}</FieldError>
          )}
        </Field>

        <Field orientation="horizontal">
          <input type="hidden" name="notificationsPresent" value="1" />
          <Switch
            id="notificationsEnabled"
            name="notificationsEnabled"
            defaultChecked={settings.notificationsEnabled}
          />
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="notificationsEnabled">
              Daily reminders
            </FieldLabel>
            <FieldDescription>
              Reminders only appear while ReSolve is open in a tab — there is no
              server-side push, so nothing arrives with the app closed.
            </FieldDescription>
          </div>
        </Field>

        <Field>
          <FieldTitle>Last acknowledged</FieldTitle>
          <p className="text-sm text-muted-foreground">
            {settings.lastAcknowledgedDate
              ? formatLocalDate(settings.lastAcknowledgedDate, "long")
              : "Never"}
          </p>
          <FieldDescription>
            Read-only — this is set when you dismiss a reminder, and resets by
            itself at your local midnight.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state.ok && state.timezoneChanged && (
          <p role="status" className="text-sm text-muted-foreground">
            Every derived date has been recalculated.
          </p>
        )}
      </div>
    </form>
  )
}
