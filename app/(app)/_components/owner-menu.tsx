"use client"

import Link from "next/link"
import { useTransition } from "react"
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { SECONDARY_NAV_ITEMS } from "@/lib/nav"

import { logout } from "../actions"

export type OwnerSummary = {
  name: string
  email: string
  initials: string
}

export function OwnerMenu({ owner }: { owner: OwnerSummary | null }) {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={owner ? `Account: ${owner.name}` : "Account"}
          />
        }
      >
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-foreground"
        >
          {owner ? owner.initials : <UserIcon className="size-3.5" />}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-52">
        {/* Base UI associates a GroupLabel with its parent group, and throws if
            there isn't one — the label must stay wrapped. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {owner?.name ?? "Signed in"}
            </span>
            {owner ? (
              <span className="text-xs font-normal text-muted-foreground">
                {owner.email}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Vocabulary management is not in the top bar — this and the mobile
            drawer are how it is reached on a wide viewport. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Vocabulary</DropdownMenuLabel>
          {SECONDARY_NAV_ITEMS.map(({ href, label, Icon }) => (
            <DropdownMenuItem key={href} render={<Link href={href} />}>
              <Icon aria-hidden />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/settings#profile" />}>
          <UserIcon aria-hidden />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon aria-hidden />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pending}
          onClick={() => startTransition(() => logout())}
        >
          <LogOutIcon aria-hidden />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
