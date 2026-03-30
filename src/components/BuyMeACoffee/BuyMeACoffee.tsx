import { useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Modal } from "../common/Modal";

interface BuyMeACoffeeProps {
  open: boolean;
  onClose: () => void;
}

type PaymentTab = "momo" | "paypal";

export function BuyMeACoffee({ open, onClose }: BuyMeACoffeeProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PaymentTab>("momo");

  const tabs: { key: PaymentTab; label: string; image: string }[] = [
    { key: "momo", label: t("coffee.momo"), image: "/images/momo.webp" },
    { key: "paypal", label: t("coffee.paypal"), image: "/images/paypal.webp" },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("coffee.title")} compact>
      <div className="flex flex-col gap-4" style={{ minWidth: 300 }}>
        <p
          className="text-[13px] text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t("coffee.description")}
        </p>

        {/* Tabs */}
        <div
          className="flex rounded-[var(--radius-md)] overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className="flex-1 py-[8px] text-[13px] font-medium cursor-pointer transition-colors"
              style={{
                background: activeTab === tab.key ? "var(--color-primary)" : "var(--color-bg)",
                color: activeTab === tab.key ? "white" : "var(--color-text-secondary)",
                borderRight: tab.key === "momo" ? "1px solid var(--color-border)" : "none",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.background = "var(--color-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.background = "var(--color-bg)";
                }
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* QR Code Image */}
        <div
          className="flex items-center justify-center rounded-[var(--radius-md)] overflow-hidden"
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <img
            src={tabs.find((tab) => tab.key === activeTab)?.image}
            alt={activeTab === "momo" ? "MoMo QR" : "PayPal QR"}
            className="w-full h-auto max-h-[360px] object-contain"
          />
        </div>

        <p
          className="text-[12px] text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("coffee.thanks")}
        </p>
      </div>
    </Modal>
  );
}
