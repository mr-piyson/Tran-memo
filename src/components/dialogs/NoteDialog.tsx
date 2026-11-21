import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useCreateLedgerNote,
  useDealers,
  useLedgerNotes,
  useRenameLedgerNote,
} from "@/hooks/use-ledger";
import { threadRoute } from "@/lib/router";
import { useUIStore } from "@/store/ui";

export default function NoteDialog({ dealerId }: { dealerId: number | null }) {
  const dialog = useUIStore((state) => state.dialog);
  const targetId = useUIStore((state) => state.dialogTargetId);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const { data: notes } = useLedgerNotes(dealerId);
  const { data: dealers } = useDealers();

  const open = (dialog === "newNote" || dialog === "editNote") && dealerId !== null;
  const target = notes?.find((note) => note.id === targetId) ?? null;
  const dealerName = dealers?.find((dealer) => dealer.id === dealerId)?.name ?? "this dealer";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
      {open && dealerId !== null && (!targetId || target) && (
        <NoteForm
          key={targetId ?? "new"}
          dealerId={dealerId}
          note={target}
          dealerName={dealerName}
          onDone={closeDialog}
        />
      )}
    </Dialog>
  );
}

function NoteForm({
  dealerId,
  note,
  dealerName,
  onDone,
}: {
  dealerId: number;
  note: { id: number; code: string; label: string | null } | null;
  dealerName: string;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(note?.label ?? "");
  const createNote = useCreateLedgerNote(dealerId);
  const renameNote = useRenameLedgerNote(dealerId);
  const setError = useUIStore((state) => state.setError);
  const navigate = useNavigate();
  const saving = createNote.isPending || renameNote.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    try {
      if (note) {
        await renameNote.mutateAsync({ id: note.id, label: label.trim() });
      } else {
        const created = await createNote.mutateAsync(label.trim() || null);
        void navigate({
          to: threadRoute.to,
          params: { dealerId: String(dealerId), noteId: String(created.id) },
        });
      }
      onDone();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{note ? "Edit ledger note" : "New ledger note"}</DialogTitle>
        <DialogDescription>
          {note
            ? `Update the label for ${note.code}.`
            : `Adds the next global code (for example IN-00002) to ${dealerName}.`}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={note ? "edit-note-label" : "note-label"}>Label (optional)</FieldLabel>
            <Input
              id={note ? "edit-note-label" : "note-label"}
              type="text"
              maxLength={60}
              autoFocus
              placeholder="e.g. July 2026"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit" disabled={saving}>
            {note ? "Save changes" : "Create ledger note"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
