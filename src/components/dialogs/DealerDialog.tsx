import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import EmojiPicker from "@/components/EmojiPicker";
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
  useCreateDealer,
  useDealers,
  useUpdateDealer,
} from "@/hooks/use-ledger";
import { notesRoute } from "@/lib/router";
import { useUIStore } from "@/store/ui";

const DEFAULT_EMOJI = "💬";

export default function DealerDialog() {
  const dialog = useUIStore((state) => state.dialog);
  const targetId = useUIStore((state) => state.dialogTargetId);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const { data: dealers } = useDealers();

  const open = dialog === "newDealer" || dialog === "editDealer";
  const target = dealers?.find((dealer) => dealer.id === targetId) ?? null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
      {open && (!targetId || target) && (
        <DealerForm
          key={targetId ?? "new"}
          dealer={target}
          onDone={closeDialog}
        />
      )}
    </Dialog>
  );
}

function DealerForm({
  dealer,
  onDone,
}: {
  dealer: { id: number; name: string; phone: string; emoji: string } | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(dealer?.name ?? "");
  const [phone, setPhone] = useState(dealer?.phone ?? "");
  const [emoji, setEmoji] = useState(dealer?.emoji || DEFAULT_EMOJI);
  const createDealer = useCreateDealer();
  const updateDealer = useUpdateDealer();
  const setError = useUIStore((state) => state.setError);
  const navigate = useNavigate();
  const saving = createDealer.isPending || updateDealer.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    try {
      if (dealer) {
        await updateDealer.mutateAsync({
          id: dealer.id,
          patch: { name: trimmed, phone: phone.trim(), emoji },
        });
      } else {
        const created = await createDealer.mutateAsync({
          name: trimmed,
          phone: phone.trim(),
          emoji,
        });
        void navigate({
          to: notesRoute.to,
          params: { dealerId: String(created.id) },
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
        <DialogTitle>{dealer ? "Edit dealer" : "New dealer"}</DialogTitle>
        <DialogDescription>
          {dealer
            ? "Update the dealer name, phone, or avatar."
            : "Each dealer starts with ledger note IN-00001 for income and expenses."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={dealer ? "edit-dealer-name" : "dealer-name"}>Dealer name</FieldLabel>
            <Input
              id={dealer ? "edit-dealer-name" : "dealer-name"}
              type="text"
              required
              maxLength={60}
              autoFocus
              placeholder="e.g. Muntadher"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={dealer ? "edit-dealer-phone" : "dealer-phone"}>
              Phone (optional)
            </FieldLabel>
            <Input
              id={dealer ? "edit-dealer-phone" : "dealer-phone"}
              type="tel"
              maxLength={30}
              placeholder="+973 36860504"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Avatar</FieldLabel>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit" disabled={saving}>
            {dealer ? "Save changes" : "Create dealer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
