import { useTranslation } from "../../i18n/useTranslation";

export function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--color-text-muted)" }}>
      <div className="text-[48px] opacity-50">&#x1F680;</div>
      <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        {t("empty.title")}
      </h2>
      <p className="text-[13px]">{t("empty.description")}</p>
    </div>
  );
}
