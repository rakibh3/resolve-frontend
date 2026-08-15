"use client"

import { useTransition } from "react"
import { Trash2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { deleteRecallCard } from "../actions"

/**
 * Deleting a card also unlinks every pattern on the problem — patterns are
 * authored as part of the card and go with it. Nobody expects that from a
 * button labelled "delete card", so the dialog says it outright and counts
 * them.
 *
 * Attempts and the revision schedule are untouched, which is worth saying too:
 * it is the reassurance that makes the destructive action safe to take.
 */
export function DeleteRecallCard({
  problemId,
  problemTitle,
  patternCount,
}: {
  problemId: string
  problemTitle: string
  patternCount: number
}) {
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="sm" disabled={pending} />}
      >
        <Trash2Icon aria-hidden />
        Delete card
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete the recall card for “{problemTitle}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This discards the key insight, approach, pitfalls, and complexities
            {patternCount > 0 ? (
              <>
                {" "}
                — and unlinks{" "}
                <strong>
                  {patternCount === 1
                    ? "the problem’s 1 pattern"
                    : `all ${patternCount} of the problem’s patterns`}
                </strong>
                , because patterns are authored as part of the card
              </>
            ) : null}
            . Your attempts and the revision schedule are not affected. There is
            no undo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteRecallCard(problemId))}
          >
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
