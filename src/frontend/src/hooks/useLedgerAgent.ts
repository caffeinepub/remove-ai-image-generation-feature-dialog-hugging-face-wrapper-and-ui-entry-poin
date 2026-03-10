import { HttpAgent } from "@dfinity/agent";
import { useQuery } from "@tanstack/react-query";
import { useInternetIdentity } from "./useInternetIdentity";

/**
 * Custom React hook that provides a shared, stable HttpAgent tied to the
 * currently authenticated Internet Identity.
 *
 * The agent is cached per unique principal using React Query with staleTime: Infinity
 * for reuse across all ledger operations.
 *
 * This ensures:
 * - Single agent instance per principal
 * - Proper identity lifecycle management
 * - Automatic cleanup when identity changes
 */
export function useLedgerAgent() {
  const { identity } = useInternetIdentity();

  const principal = identity?.getPrincipal();
  const isAuthenticated = !!identity && !!principal && !principal.isAnonymous();

  const { data: agent, isLoading } = useQuery({
    queryKey: ["ledgerAgent", principal?.toString()],
    queryFn: async () => {
      if (!identity || !principal || principal.isAnonymous()) {
        throw new Error("No authenticated identity available");
      }

      console.log(
        "[useLedgerAgent] Initializing HttpAgent for principal:",
        principal.toString(),
      );

      // Always use mainnet for ICP ledger operations
      const host = "https://ic0.app";

      const newAgent = await HttpAgent.create({
        host,
        identity,
      });

      // Only fetch root key in development (never in production)
      if (process.env.DFX_NETWORK !== "ic") {
        await newAgent.fetchRootKey();
      }

      console.log("[useLedgerAgent] HttpAgent initialized successfully");

      return newAgent;
    },
    enabled: isAuthenticated,
    staleTime: Number.POSITIVE_INFINITY, // Agent never becomes stale for a given principal
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes after unmount
    retry: false,
  });

  return {
    agent: agent || null,
    isLoading,
    isReady: !!agent && isAuthenticated,
  };
}
