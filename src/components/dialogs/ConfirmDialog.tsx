import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUIStore } from "@/store/ui";

export default function ConfirmDialog() {
  const confirm = useUIStore((state) => state.confirm);
  const closeConfirm = useUIStore((state) => state.closeConfirm);
  const setError = useUIStore((state) => state.setError);

  return (
    <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && closeConfirm()}>
      {confirm && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void Promise.resolve(confirm.onConfirm())
                  .catch((error: unknown) =>
                    setError(error instanceof Error ? error.message : String(error)),
                  )
                  .finally(closeConfirm);
              }}
            >
              {confirm.confirmLabel ?? "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
