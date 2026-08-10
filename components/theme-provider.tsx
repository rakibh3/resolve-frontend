"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Dark is the default: ReSolve is used in long focused sessions, usually late.
 * `enableSystem` still lets the OS decide for anyone who asks for it.
 *
 * `next-themes` injects a blocking script that sets the class before first
 * paint, which is what prevents the light-then-dark flash. `<html>` carries
 * `suppressHydrationWarning` in the root layout for the same reason.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
