"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteAllMyData } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Icon } from "@/components/icon/Icon";

export function DataTab({ resumeCount, tailoredCount }: { resumeCount: number; tailoredCount: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    await deleteAllMyData();
    setIsDeleting(false);
  }

  return (
    <div className="space-y-lg">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <p className="mb-2 font-sans text-body-lg text-on-surface">
          You have <span className="font-medium">{resumeCount}</span> resume{resumeCount === 1 ? "" : "s"} saved
          {tailoredCount > 0 && <> ({tailoredCount} tailored)</>}.
        </p>
        <Link href="/library" className="font-sans text-sm text-secondary hover:underline">
          Manage your resumes in the Library →
        </Link>
      </div>

      <div className="rounded-lg border border-error-container bg-error-container/15 p-md">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="warning" size={16} className="text-error" />
          <h3 className="font-sans text-body-lg font-medium text-on-surface">Delete all my data</h3>
        </div>
        <p className="mb-md font-sans text-sm text-on-surface-variant">
          Permanently deletes every resume, job description, and tailoring history, and removes your Gemini key.
          Your account stays signed in and you&rsquo;ll be taken back through setup. This can&rsquo;t be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          Delete all my data
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>Delete all your data?</DialogTitle>
          <DialogDescription>
            This permanently deletes all {resumeCount} resume{resumeCount === 1 ? "" : "s"} and your Gemini key. Type
            DELETE to confirm.
          </DialogDescription>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-sm h-10 w-full rounded border border-outline-variant bg-surface-container-lowest px-sm font-sans text-body-lg focus:border-error focus:outline-none focus:ring-1 focus:ring-error"
            placeholder="DELETE"
          />
          <div className="mt-lg flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={confirmText !== "DELETE" || isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete everything"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
