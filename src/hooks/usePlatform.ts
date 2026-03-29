import { useState, useEffect } from "react";
import { getCurrentPlatform } from "../commands";

export function usePlatform() {
  const [platform, setPlatform] = useState<string>("windows");

  useEffect(() => {
    getCurrentPlatform()
      .then(setPlatform)
      .catch(() => setPlatform("windows"));
  }, []);

  return {
    platform,
    isWindows: platform === "windows",
    isMacos: platform === "macos",
  };
}
