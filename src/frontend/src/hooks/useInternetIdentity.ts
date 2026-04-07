// Thin wrapper — re-export useInternetIdentity from core infrastructure.
// All consumer code in this project imports from this path.
export {
  useInternetIdentity,
  type InternetIdentityContext,
  type Status,
} from "@caffeineai/core-infrastructure";
