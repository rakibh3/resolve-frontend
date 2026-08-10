"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TopicWithCount } from "@/lib/api/types"

import { CustomCapture } from "./custom-capture"
import { LeetcodeCapture } from "./leetcode-capture"

/**
 * The two capture modes are separate components with separate flows, not one
 * form behind a `custom` boolean — the API models them as a discriminated union
 * on `source`, and so does this.
 */
export function CaptureModes({
  suggestions,
}: {
  suggestions: TopicWithCount[]
}) {
  return (
    <Tabs defaultValue="leetcode">
      <TabsList>
        <TabsTrigger value="leetcode">From LeetCode</TabsTrigger>
        <TabsTrigger value="custom">Custom problem</TabsTrigger>
      </TabsList>

      <TabsContent value="leetcode" className="pt-4">
        <LeetcodeCapture suggestions={suggestions} />
      </TabsContent>

      <TabsContent value="custom" className="pt-4">
        <CustomCapture suggestions={suggestions} />
      </TabsContent>
    </Tabs>
  )
}
