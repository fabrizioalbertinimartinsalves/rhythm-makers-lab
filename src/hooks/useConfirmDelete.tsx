import { useState, useCallback } from "react";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type ChildCheck = {
  table: string;
  column: string;
  label: string;
  /** Optional extra filters to apply. Only blocks if filtered records exist. */
  filter?: Record<string, any>;
};

interface UseConfirmDeleteOptions {
  /** Child tables to check before allowing delete */
  childChecks?: ChildCheck[];
}

export function useConfirmDelete(options: UseConfirmDeleteOptions = {}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemId, setItemId] = useState<string>("");
  const [onConfirmFn, setOnConfirmFn] = useState<(() => void) | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const { studioId } = useAuth();

  const requestDelete = useCallback(
    async (id: string, name: string, onConfirm: () => void) => {
      setItemId(id);
      setItemName(name);
      setBlockReason(null);
      setOnConfirmFn(() => onConfirm);

      // Check child records
      if (options.childChecks && options.childChecks.length > 0 && studioId) {
        setPending(true);
        const results: string[] = [];

        await Promise.all(
          options.childChecks.map(async (check) => {
            let query = supabase
              .from(check.table)
              .select("id")
              .eq("studio_id", studioId)
              .eq(check.column, id);

            // Apply optional extra filters
            if (check.filter) {
              Object.entries(check.filter).forEach(([key, value]) => {
                query = query.eq(key, value);
              });
            }

            const { data, error } = await query.limit(1);

            if (!error && (data?.length || 0) > 0) {
              results.push(check.label);
            }
          })
        );

        setPending(false);

        if (results.length > 0) {
          setBlockReason(
            `Não é possível excluir "${name}" pois existem registros vinculados (${results.join(", ")}).`
          );
          setOnConfirmFn(null);
          setOpen(true);
          return;
        }
      }

      setOpen(true);
    },
    [options.childChecks, studioId]
  );

  const handleConfirm = () => {
    if (onConfirmFn) onConfirmFn();
    setOpen(false);
  };

  const ConfirmDialog = () => (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blockReason ? "Exclusão bloqueada" : "Confirmar exclusão"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blockReason
              ? blockReason
              : `Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {blockReason ? (
            <AlertDialogCancel>Entendi</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, excluir
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestDelete, ConfirmDialog, pending };
}
