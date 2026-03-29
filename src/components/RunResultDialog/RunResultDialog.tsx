import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import type { RunResult } from "../../types";
import styles from "./RunResultDialog.module.css";

interface RunResultDialogProps {
  open: boolean;
  onClose: () => void;
  result: RunResult | null;
}

export function RunResultDialog({
  open,
  onClose,
  result,
}: RunResultDialogProps) {
  const { t } = useTranslation();

  if (!result) return null;

  const allSuccess = result.errors.length === 0 && result.total > 0;
  const hasErrors = result.errors.length > 0;
  const noItems = result.total === 0;

  return (
    <Modal open={open} onClose={onClose} title={t("run.title")}>
      <div className={styles.content}>
        {noItems && (
          <p className={styles.noItems}>{t("run.noItems")}</p>
        )}

        {allSuccess && (
          <p className={styles.success}>
            {t("run.allSuccess", { total: result.total })}
          </p>
        )}

        {hasErrors && (
          <>
            <p className={styles.summary}>
              {t("run.success", {
                succeeded: result.succeeded,
                total: result.total,
              })}
            </p>
            <p className={styles.errorTitle}>{t("run.errors")}</p>
            <ul className={styles.errorList}>
              {result.errors.map((err) => (
                <li key={err.item_id} className={styles.errorItem}>
                  <span className={styles.errorLabel}>{err.label}</span>
                  <span className={styles.errorMsg}>{err.error}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            {t("dialog.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
