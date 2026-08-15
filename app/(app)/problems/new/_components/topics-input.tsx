"use client"

import { VocabularyInput } from "@/components/domain/vocabulary-input"
import type { TopicWithCount } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"

/**
 * Free-text topic entry with suggestions from the existing vocabulary.
 *
 * A thin binding over `<VocabularyInput>`, which the recall card's pattern
 * tagging uses too — the two vocabularies normalize identically, so only the
 * copy and the length limit differ.
 */
export function TopicsInput({
  suggestions,
  defaultValue = [],
}: {
  suggestions: TopicWithCount[]
  defaultValue?: string[]
}) {
  return (
    <VocabularyInput
      name="topics"
      label="Topics"
      suggestions={suggestions}
      defaultValue={defaultValue}
      maxLength={LIMITS.topicNameMax}
      placeholder="Pick one below, or type a new topic"
      description={`Up to ${LIMITS.topicNameMax} characters each. Case and spacing are normalized, so “Binary Search” and “binary search” are the same topic.`}
    />
  )
}
