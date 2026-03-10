import { useMemo } from "react";
import { useInternetIdentity } from "./useInternetIdentity";

export function useAuth() {
  const { identity, login, clear, loginStatus } = useInternetIdentity();

  const isAuthenticated = useMemo(() => {
    return !!identity && !identity.getPrincipal().isAnonymous();
  }, [identity]);

  const principalId = useMemo(() => {
    return identity?.getPrincipal().toString();
  }, [identity]);

  return {
    isAuthenticated,
    principalId,
    login,
    logout: clear,
    loginStatus,
  };
}
