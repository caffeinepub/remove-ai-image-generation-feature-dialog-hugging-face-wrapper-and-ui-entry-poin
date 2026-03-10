import { HttpAgent } from "@dfinity/agent";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, type ReactNode } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface ActorContextValue {
  actor: backendInterface | null;
  isFetching: boolean;
}

const ActorContext = createContext<ActorContextValue | undefined>(undefined);

const ACTOR_QUERY_KEY = "actor";

export function ActorProvider({ children }: { children: ReactNode }) {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      // Determine the host based on environment
      const host =
        process.env.DFX_NETWORK === "ic"
          ? "https://icp-api.io"
          : "http://localhost:4943";

      // Create the agent with or without identity
      const agent = await HttpAgent.create({
        host,
        identity: isAuthenticated ? identity : undefined,
      });

      // Create the actor using the config helper
      // Type assertion needed as createActorWithConfig signature is being updated
      const actor = createActorWithConfig(agent as any);

      // Check if initializeAccessControl exists and call it (some backends may not have this method)
      if (
        isAuthenticated &&
        "initializeAccessControl" in actor &&
        typeof actor.initializeAccessControl === "function"
      ) {
        try {
          await actor.initializeAccessControl();
        } catch (error) {
          console.warn("Failed to initialize access control:", error);
        }
      }

      return actor;
    },
    // Only refetch when identity changes
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When the actor changes, invalidate dependent queries
  React.useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  const value: ActorContextValue = {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };

  return (
    <ActorContext.Provider value={value}>{children}</ActorContext.Provider>
  );
}

export function useActorContext(): ActorContextValue {
  const context = useContext(ActorContext);
  if (context === undefined) {
    throw new Error("useActorContext must be used within an ActorProvider");
  }
  return context;
}
