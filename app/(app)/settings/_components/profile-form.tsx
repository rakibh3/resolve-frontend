"use client"

import { useActionState, useState } from "react"
import { TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Owner } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"
import { cn } from "@/lib/utils"

import { updateProfile, type ProfileState } from "../actions"

const initialState: ProfileState = {}

export function ProfileForm({ owner }: { owner: Owner | null }) {
  const [bio, setBio] = useState("")
  const [state, formAction, pending] = useActionState(
    async (previous: ProfileState, formData: FormData) => {
      const result = await updateProfile(previous, formData)
      if (result.ok && result.message) toast.success(result.message)
      // The missing-profile case is rendered inline with an explanation, so it
      // does not also fire a toast.
      else if (result.message && !result.missingProfile) {
        toast.error(result.message)
      }
      return result
    },
    initialState,
  )

  const bioTooLong = bio.length > LIMITS.bioMax

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-name">Name</FieldLabel>
          <Input
            id="profile-name"
            name="name"
            defaultValue={owner?.name ?? ""}
            minLength={LIMITS.profileNameMin}
            maxLength={LIMITS.profileNameMax}
            aria-invalid={state.fieldErrors?.name ? true : undefined}
          />
          <FieldDescription>
            {LIMITS.profileNameMin}–{LIMITS.profileNameMax} characters.
          </FieldDescription>
          {state.fieldErrors?.name && (
            <FieldError>{state.fieldErrors.name}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <Input
            id="profile-email"
            name="email"
            type="email"
            defaultValue={owner?.email ?? ""}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
          />
          {state.fieldErrors?.email && (
            <FieldError>{state.fieldErrors.email}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-photo">Avatar URL</FieldLabel>
          <Input
            id="profile-photo"
            name="profilePhoto"
            type="url"
            placeholder="https://…"
            aria-invalid={state.fieldErrors?.profilePhoto ? true : undefined}
          />
          <FieldDescription>
            Leave blank to keep the current one.
          </FieldDescription>
          {state.fieldErrors?.profilePhoto && (
            <FieldError>{state.fieldErrors.profilePhoto}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
          <Textarea
            id="profile-bio"
            name="bio"
            rows={3}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            aria-invalid={bioTooLong ? true : undefined}
          />
          <FieldDescription>
            <span className={cn(bioTooLong && "text-destructive")}>
              {bio.length} / {LIMITS.bioMax}
            </span>{" "}
            characters.
          </FieldDescription>
          {state.fieldErrors?.bio && (
            <FieldError>{state.fieldErrors.bio}</FieldError>
          )}
        </Field>
      </FieldGroup>

      {state.missingProfile && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/40 px-3 py-2 text-sm text-warning-foreground"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </p>
      )}

      {state.message && !state.ok && !state.missingProfile && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending || bioTooLong}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  )
}
