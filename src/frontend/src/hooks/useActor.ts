import { useActorContext } from "../context/ActorContext";
// Thin wrapper — delegates to ActorContext so consumers get the pre-built
// actor instance without needing to know about the context directly.
import type { BackendActor } from "../types/backend";

export function useActor(): {
  actor: BackendActor | null;
  isFetching: boolean;
} {
  return useActorContext();
}
