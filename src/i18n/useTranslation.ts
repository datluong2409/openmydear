import { useContext } from "react";
import { I18nContext, type I18nContextType } from "./I18nContext";

export function useTranslation(): I18nContextType {
  return useContext(I18nContext);
}
