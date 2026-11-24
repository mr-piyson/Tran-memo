import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  FileUpIcon,
  LoaderCircleIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import EmojiPicker from "@/components/EmojiPicker";
import ListGrid from "@/components/ListGrid";
import { DealerAvatar } from "@/components/LedgerPanels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useCreateDealer,
  useDealers,
  useUpdateDealer,
} from "@/hooks/use-ledger";
import type { Dealer } from "@/lib/entries";
import { importVCardFile, loadContacts, type Contact } from "@/lib/contacts";
import { notesRoute } from "@/lib/router";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

const DEFAULT_EMOJI = "💬";

const fullScreenDialogClass =
  "fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-card p-0 ring-0 sm:max-w-none";
const pickerDialogClass =
  "fixed inset-0 top-0 left-0 z-[60] flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-background p-0 ring-0 sm:max-w-none";

type FieldName = "name" | "phone" | "email";
type Values = Record<FieldName, string>;

const validation = {
  name: (value: string) => value.trim().length >= 2,
  phone: (value: string) => !value.trim() || /^\+?[\d\s-]{8,15}$/.test(value.trim()),
  email: (value: string) => !value.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim()),
};

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
  dealer: Dealer | null;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Values>({
    name: dealer?.name ?? "",
    phone: dealer?.phone ?? "",
    email: dealer?.email ?? "",
  });
  const [emoji, setEmoji] = useState(dealer?.emoji || DEFAULT_EMOJI);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    name: false,
    phone: false,
    email: false,
  });
  const contactPickerOpen = useUIStore((state) => state.contactPickerOpen);
  const openContactPicker = useUIStore((state) => state.openContactPicker);
  const closeContactPicker = useUIStore((state) => state.closeContactPicker);
  const createDealer = useCreateDealer();
  const updateDealer = useUpdateDealer();
  const setError = useUIStore((state) => state.setError);
  const navigate = useNavigate();
  const saving = createDealer.isPending || updateDealer.isPending;

  function setValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function markTouched(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function chooseContact(contact: Contact) {
    setValues((current) => ({
      ...current,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || current.email,
    }));
    setTouched((current) => ({ ...current, name: true, phone: true }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setTouched({ name: true, phone: true, email: true });
    const valid = (Object.keys(validation) as FieldName[]).every((field) =>
      validation[field](values[field]),
    );
    if (!valid) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setError(null);

    const name = values.name.trim();
    const phone = values.phone.trim();
    const email = values.email.trim();
    try {
      if (dealer) {
        await updateDealer.mutateAsync({
          id: dealer.id,
          patch: { name, phone, email, emoji },
        });
      } else {
        const created = await createDealer.mutateAsync({ name, phone, email, emoji });
        void navigate({
          to: notesRoute.to,
          params: { dealerId: String(created.id) },
        });
      }
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <>
      <DialogContent showCloseButton={false} className={fullScreenDialogClass}>
        <div className="flex h-[52px] flex-none items-center gap-2 border-b px-2.5">
          <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={onDone}>
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base font-bold">
              {dealer ? "Edit dealer" : "New dealer"}
            </DialogTitle>
          </div>
        </div>

        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2">
            <div className="mx-auto flex w-full max-w-sm flex-col gap-2 pb-2">
              {/* Top card: the avatar here opens the emoji picker. */}
              <div className="rounded-[10px] bg-panel p-2.5">
                <div className="flex items-center gap-2.5">
                  <EmojiPicker
                    value={emoji}
                    onChange={setEmoji}
                    trigger={(open) => (
                      <button
                        type="button"
                        aria-label="Change avatar"
                        onClick={open}
                        className="shrink-0 rounded-full"
                      >
                        <DealerAvatar emoji={emoji} size="sm" className="size-10 text-[42px]" />
                      </button>
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      {values.name.trim() || "Choose a contact"}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {values.phone.trim() || "Pick a contact or type a number"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={openContactPicker}
                  >
                    <UsersIcon />
                    Contacts
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-[10px] bg-panel p-2">
                <FormField
                  id={dealer ? "edit-dealer-name" : "dealer-name"}
                  label="Name"
                  icon={<UserRoundIcon />}
                  placeholder="Name"
                  value={values.name}
                  maxLength={60}
                  invalid={touched.name && !validation.name(values.name)}
                  valid={touched.name && validation.name(values.name)}
                  onChange={(value) => setValue("name", value)}
                  onBlur={() => markTouched("name")}
                />
                <FormField
                  id={dealer ? "edit-dealer-phone" : "dealer-phone"}
                  label="Phone (optional)"
                  icon={<PhoneIcon />}
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone"
                  value={values.phone}
                  maxLength={30}
                  invalid={touched.phone && !validation.phone(values.phone)}
                  valid={touched.phone && validation.phone(values.phone)}
                  onChange={(value) => setValue("phone", value)}
                  onBlur={() => markTouched("phone")}
                />
                <FormField
                  id={dealer ? "edit-dealer-email" : "dealer-email"}
                  label="Email (optional)"
                  icon={<MailIcon />}
                  type="email"
                  inputMode="email"
                  placeholder="Email"
                  value={values.email}
                  maxLength={80}
                  invalid={touched.email && !validation.email(values.email)}
                  valid={touched.email && validation.email(values.email)}
                  onChange={(value) => setValue("email", value)}
                  onBlur={() => markTouched("email")}
                />
              </div>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm shrink-0 gap-2 px-2 pt-1.5 pb-[var(--safe-area-inset-bottom)]">
            <Button
              type="button"
              variant="outline"
              className="h-9 flex-1 rounded-[10px] border-2 border-primary-hover text-sm"
              onClick={onDone}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 flex-1 rounded-[10px] border-2 border-primary-hover bg-primary-hover text-sm text-primary-foreground"
              disabled={saving}
            >
              {dealer ? "Save changes" : "Create dealer"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <ContactPickerDialog
        open={contactPickerOpen}
        onOpenChange={(next) => (next ? openContactPicker() : closeContactPicker())}
        onSelect={chooseContact}
      />
    </>
  );
}

/** Full-screen, virtualized contact list shown above the dealer form. */
function ContactPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (contact: Contact) => void;
}) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    void loadContacts()
      .then((source) => {
        if (cancelled) return;
        setContacts(source.contacts);
        setNativeError(source.nativeError);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setMessage(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return contacts.filter(
      (contact) =>
        !term ||
        contact.name.toLowerCase().includes(term) ||
        contact.phone.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term),
    );
  }, [contacts, query]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setMessage(null);
    try {
      setContacts(await importVCardFile(file));
      setNativeError(null);
      setQuery("");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={pickerDialogClass}>
        <div className="flex h-[52px] flex-none items-center gap-2 border-b px-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to dealer"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base font-bold">Contacts</DialogTitle>
            <DialogDescription className="text-[11px]">
              {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "contact" : "contacts"}`}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            <FileUpIcon />
            Import
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="hidden"
            aria-label="Import vCard contacts"
            onChange={(event) => void handleImport(event)}
          />
        </div>

        <div className="shrink-0 px-2 pt-2 pb-1.5">
          <div className="mx-auto flex h-9 w-full max-w-sm items-center gap-2 rounded-[10px] border-2 border-border-accent bg-panel px-2.5 text-text-soft">
            <SearchIcon className="size-[18px] shrink-0" />
            <Input
              type="search"
              aria-label="Search contacts"
              placeholder="Search name, phone or email"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm text-foreground shadow-none ring-0 placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
            Loading contacts…
          </div>
        ) : message ? (
          <div className="mx-auto w-full max-w-sm px-2 py-4">
            <div className="flex items-start gap-2 rounded-[10px] border-2 border-danger bg-panel p-3 text-sm text-danger">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <UsersIcon className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              On a phone, grant contacts access. On desktop, import a .vcf file exported from your
              address book.
            </p>
            <Button type="button" size="sm" onClick={() => fileInput.current?.click()}>
              <FileUpIcon />
              Import vCard
            </Button>
          </div>
        ) : (
          <>
            {nativeError && (
              <div className="mx-auto flex w-full max-w-sm items-start gap-2 px-2 pb-1.5 text-[11px] text-muted-foreground">
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>Device contacts unavailable: {nativeError}</span>
              </div>
            )}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No contacts found</p>
            ) : (
              <ListGrid
                rows={filtered}
                getRowId={(contact) => contact.id}
                rowHeight={56}
                className="mx-auto max-w-sm"
                renderRow={(contact) => (
                  <button
                    type="button"
                    className="flex h-full w-full items-center gap-2.5 px-2.5 text-left"
                    onClick={() => {
                      onSelect(contact);
                      onOpenChange(false);
                    }}
                  >
                    <DealerAvatar emoji={DEFAULT_EMOJI} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{contact.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {contact.phone}
                      </span>
                    </span>
                  </button>
                )}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  id,
  label,
  icon,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  invalid,
  valid,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  maxLength?: number;
  invalid: boolean;
  valid: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex h-[42px] items-center gap-2 rounded-[10px] border-2 border-input bg-secondary px-2.5 text-muted-foreground transition-colors focus-within:border-primary-hover",
        invalid && "border-danger focus-within:border-danger",
        valid && "border-success focus-within:border-success",
      )}
    >
      <span className="grid size-[18px] shrink-0 place-items-center [&_svg]:size-[18px]">{icon}</span>
      <span className="sr-only">{label}</span>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-[15px] text-foreground shadow-none ring-0 placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
    </label>
  );
}
