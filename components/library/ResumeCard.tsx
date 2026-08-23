"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { renameResume, duplicateResume, deleteResume } from "@/app/actions/resumes";

export interface ResumeCardData {
  id: string;
  kind: "master" | "tailored";
  title: string;
  is_default: boolean;
  job_title_snapshot: string | null;
  job_company_snapshot: string | null;
  updated_at: string;
  pdf_storage_path: string | null;
}

export function ResumeCard({ resume }: { resume: ResumeCardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(resume.title);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  function handleRename() {
    setRenameError(null);
    startTransition(async () => {
      const result = await renameResume(resume.id, title);
      if (!result.ok) {
        setRenameError(result.error);
        return;
      }
      setRenameOpen(false);
    });
  }

  function handleDuplicate() {
    setDuplicateError(null);
    startTransition(async () => {
      const result = await duplicateResume(resume.id);
      if (!result.ok) {
        setDuplicateError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteResume(resume.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
    });
  }

  return (
    <>
      <Card className="group flex flex-col p-lg">
        <div className="mb-sm flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {resume.is_default ? (
              <Badge variant="accent">Master</Badge>
            ) : resume.kind === "master" ? (
              <Badge variant="outline">Previous master</Badge>
            ) : (
              <Badge variant="outline">Tailored</Badge>
            )}
            {resume.job_company_snapshot && <Badge variant="neutral">{resume.job_company_snapshot}</Badge>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container-high group-hover:opacity-100 focus:opacity-100"
                aria-label="Resume actions"
              >
                <Icon name="more" size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href={`/resumes/${resume.id}/edit`}>
                  <Icon name="editor" size={14} />
                  Open
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <Icon name="rename" size={14} />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDuplicate}>
                <Icon name="duplicate" size={14} />
                Duplicate
              </DropdownMenuItem>
              {resume.pdf_storage_path && (
                <DropdownMenuItem asChild>
                  <a href={`/api/resumes/${resume.id}/export`}>
                    <Icon name="download" size={14} />
                    Download PDF
                  </a>
                </DropdownMenuItem>
              )}
              {!resume.is_default && (
                <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
                  <Icon name="delete" size={14} />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link href={`/resumes/${resume.id}/edit`} className="flex-1">
          <h3 className="mb-1 font-sans text-headline-md text-on-surface">
            {resume.job_title_snapshot ?? resume.title}
          </h3>
          <p className="font-mono text-label-sm text-on-surface-variant">
            Updated {formatRelativeTime(resume.updated_at)}
          </p>
        </Link>
        {duplicateError && <p className="mt-sm font-sans text-label-sm text-error">{duplicateError}</p>}
      </Card>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogTitle>Rename resume</DialogTitle>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-sm" />
          {renameError && <p className="mt-sm font-sans text-body-lg text-error">{renameError}</p>}
          <div className="mt-lg flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRename} disabled={isPending || !title.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>Delete &ldquo;{resume.title}&rdquo;?</DialogTitle>
          <DialogDescription>This can&rsquo;t be undone.</DialogDescription>
          {deleteError && <p className="mt-sm font-sans text-body-lg text-error">{deleteError}</p>}
          <div className="mt-lg flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
