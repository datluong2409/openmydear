import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { RunResult } from "../../types";

interface RunResultDialogProps {
  open: boolean;
  onClose: () => void;
  result: RunResult | null;
}

export function RunResultDialog({ open, onClose, result }: RunResultDialogProps) {
  const { t } = useTranslation();
  if (!result) return null;

  const allSuccess = result.errors.length === 0 && result.total > 0;
  const hasErrors = result.errors.length > 0;
  const noItems = result.total === 0;

  return (
    <Modal open={open} onClose={onClose} title={t("run.title")}>
      <div className="flex flex-col gap-3">
        {noItems && (
          <p className="text-center py-3" style={{ color: "var(--color-text-secondary)" }}>
            {t("run.noItems")}
          </p>
        )}
        {allSuccess && (
          <p className="font-medium text-[14px] text-center py-3" style={{ color: "var(--color-success)" }}>
            {t("run.allSuccess", { total: result.total })}
          </p>
        )}
        {hasErrors && (
          <>
            <p className="text-[13px] font-medium">
              {t("run.success", { succeeded: result.succeeded, total: result.total })}
            </p>
            <p className="text-[12px] font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--color-danger)" }}>
              {t("run.errors")}
            </p>
            <ul className="list-none flex flex-col gap-[6px]">
              {result.errors.map((err) => (
                <li
                  key={err.item_id}
                  className="flex flex-col gap-[2px] px-[10px] py-2"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-bg)",
                    borderLeft: "3px solid var(--color-danger)",
                  }}
                >
                  <span className="font-medium text-[13px]">{err.label}</span>
                  <span className="text-[11px] break-all" style={{ color: "var(--color-text-secondary)" }}>
                    {err.error}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex justify-end mt-[6px]">
          <Button variant="secondary" onClick={onClose}>{t("dialog.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}
