import type { Metadata } from "next"

import { RouteTransition, Streamed } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/http"
import { getSettings } from "@/lib/api/settings"
import { getOwner } from "@/lib/api/user"
import type { Owner } from "@/lib/api/types"

import { ProfileForm } from "./_components/profile-form"
import { SettingsForm } from "./_components/settings-form"

export const metadata: Metadata = {
  title: "Settings",
}

export default function SettingsPage() {
  return (
    <RouteTransition>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>

        <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Practice
          </h2>
          <Streamed fallback={<Skeleton className="h-[420px] rounded-lg" />}>
            <SettingsSection />
          </Streamed>
        </section>

        <section
          id="profile"
          className="flex flex-col gap-4 scroll-mt-20 rounded-xl border border-border bg-card p-4"
        >
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Profile
          </h2>
          <Streamed fallback={<Skeleton className="h-[380px] rounded-lg" />}>
            <ProfileSection />
          </Streamed>
        </section>
      </div>
    </RouteTransition>
  )
}

/**
 * Settings rows are created lazily with defaults on first read (`UTC`,
 * notifications off, `20:00`), so this never has to handle a missing row.
 */
async function SettingsSection() {
  const settings = await getSettings()
  return <SettingsForm settings={settings} />
}

async function ProfileSection() {
  let owner: Owner | null = null
  try {
    owner = await getOwner()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
  }

  return <ProfileForm owner={owner} />
}
