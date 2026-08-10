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

import { deleteProblem } from "../actions"

/**
 * Deletion cascades to attempts, topic links, the revision schedule, and every
 * revision event. There is no soft delete and no undo, so the confirmation
 * names the problem and says exactly what goes with it.
 */
export function DeleteProblem({
  problemId,
  title,
  attemptCount,
}: {
  problemId: string
  title: string
  attemptCount: number
}) {
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="sm" disabled={pending} />}
      >
        <Trash2Icon aria-hidden />
        Delete
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the problem along with{" "}
            {attemptCount === 1
              ? "its 1 logged attempt"
              : `its ${attemptCount} logged attempts`}
            , its topic links, its revision schedule, and its full revision
            history. There is no undo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteProblem(problemId))}
          >
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
