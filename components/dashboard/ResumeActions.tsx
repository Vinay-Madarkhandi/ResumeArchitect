"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { deleteResume, duplicateResume, renameResume } from "@/app/actions/resumes";

/** Triggers a file download from a same-origin URL that responds with an attachment. */
function download(url: string) {
  const a = Object.assign(document.createElement("a"), { href: url, download: "" });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ResumeActions({ id, title, deletable = true }: { id: string; title: string; deletable?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(title);
  const [pending, setPending] = useState(false);

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (!result.ok) return toast(result.error ?? "That didn't work. Try again.", "error");
    setDialog(null);
    toast(success, "success");
    router.refresh();
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-hover hover:text-ink data-[state=open]:bg-hover data-[state=open]:text-ink"
          aria-label={`Actions for ${title}`}
        >
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => download(`/api/resumes/${id}/export?format=pdf`)}>
            <Download /> Download PDF
          </MenuItem>
          <MenuItem onSelect={() => download(`/api/resumes/${id}/export?format=docx`)}>
            <FileText /> Download Word
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => setDialog("rename")}>
            <Pencil /> Rename
          </MenuItem>
          <MenuItem onSelect={() => act(() => duplicateResume(id), "Copy created.")}>
            <Copy /> Duplicate
          </MenuItem>
          {deletable && (
            <>
              <MenuSeparator />
              <MenuItem danger onSelect={() => setDialog("delete")}>
                <Trash2 /> Delete
              </MenuItem>
            </>
          )}
        </MenuContent>
      </Menu>

      <Dialog open={dialog === "rename"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent title="Rename">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => renameResume(id, name), "Renamed.");
            }}
          >
            <label htmlFor={`rename-${id}`} className="sr-only">
              Name
            </label>
            <Input id={`rename-${id}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="mt-5 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="primary" loading={pending} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent title={`Delete "${title}"?`} description="The tailored resume and its review history are removed. Your master resume isn't affected.">
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="danger" loading={pending} onClick={() => act(() => deleteResume(id), "Deleted.")}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
