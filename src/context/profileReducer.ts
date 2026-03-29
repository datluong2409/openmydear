import type { LaunchProfile, LaunchItem } from "../types";

export type ProfileAction =
  | { type: "SET_PROFILES"; profiles: LaunchProfile[] }
  | { type: "ADD_PROFILE"; profile: LaunchProfile }
  | { type: "UPDATE_PROFILE"; profile: LaunchProfile }
  | { type: "DELETE_PROFILE"; profileId: string }
  | {
      type: "ADD_ITEM";
      profileId: string;
      item: LaunchItem;
    }
  | {
      type: "UPDATE_ITEM";
      profileId: string;
      item: LaunchItem;
    }
  | {
      type: "DELETE_ITEM";
      profileId: string;
      itemId: string;
    }
  | {
      type: "REORDER_ITEMS";
      profileId: string;
      items: LaunchItem[];
    };

export function profileReducer(
  state: LaunchProfile[],
  action: ProfileAction
): LaunchProfile[] {
  switch (action.type) {
    case "SET_PROFILES":
      return action.profiles;

    case "ADD_PROFILE":
      return [...state, action.profile];

    case "UPDATE_PROFILE":
      return state.map((p) =>
        p.id === action.profile.id ? action.profile : p
      );

    case "DELETE_PROFILE":
      return state.filter((p) => p.id !== action.profileId);

    case "ADD_ITEM":
      return state.map((p) =>
        p.id === action.profileId
          ? { ...p, items: [...p.items, action.item] }
          : p
      );

    case "UPDATE_ITEM":
      return state.map((p) =>
        p.id === action.profileId
          ? {
              ...p,
              items: p.items.map((i) =>
                i.id === action.item.id ? action.item : i
              ),
            }
          : p
      );

    case "DELETE_ITEM":
      return state.map((p) =>
        p.id === action.profileId
          ? { ...p, items: p.items.filter((i) => i.id !== action.itemId) }
          : p
      );

    case "REORDER_ITEMS":
      return state.map((p) =>
        p.id === action.profileId ? { ...p, items: action.items } : p
      );

    default:
      return state;
  }
}
