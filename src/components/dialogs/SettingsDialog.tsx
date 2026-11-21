import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, isTauri, type Currency } from "@/lib/entries";
import { useUIStore } from "@/store/ui";

export default function SettingsDialog({ onClearData }: { onClearData: () => void }) {
  const open = useUIStore((state) => state.dialog === "settings");
  const closeDialog = useUIStore((state) => state.closeDialog);
  const currency = useUIStore((state) => state.currency);
  const setCurrency = useUIStore((state) => state.setCurrency);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Choose how amounts are displayed and where your data lives.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Select
              items={CURRENCIES.map((code) => ({ label: code, value: code }))}
              value={currency}
              onValueChange={(value) => setCurrency(value as Currency)}
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  {CURRENCIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              {isTauri()
                ? "Dealers and transactions are saved in a local SQLite database. Amounts are stored in BHD fils (3 decimals)."
                : "Browser preview mode uses localStorage. Amounts are stored in BHD fils (3 decimals)."}
            </CardDescription>
          </CardHeader>
        </Card>
        {!isTauri() && (
          <Button variant="destructive" onClick={onClearData}>
            Clear browser preview data
          </Button>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
