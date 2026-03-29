import { useContext, useMemo } from "react";
import { ProfileContext } from "../context/ProfileContext";

export function useProfiles() {
  const { profiles, selectedProfileId, selectProfile, dispatch } =
    useContext(ProfileContext);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  return { profiles, selectedProfile, selectedProfileId, selectProfile, dispatch };
}
