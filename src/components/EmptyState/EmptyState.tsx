import { useTranslation } from "../../i18n/useTranslation";
import styles from "./EmptyState.module.css";

export function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.icon}>&#x1F680;</div>
      <h2 className={styles.title}>{t("empty.title")}</h2>
      <p className={styles.description}>{t("empty.description")}</p>
    </div>
  );
}
