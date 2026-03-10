import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PixelPurchase,
  ProjectMetadata,
  UserPersonalInfo,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Personal Info Queries
export function useGetPersonalInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<UserPersonalInfo | null>({
    queryKey: ["personalInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPersonalInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSavePersonalInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personalInfo: UserPersonalInfo) => {
      if (!actor) throw new Error("Actor not available");
      return actor.savePersonalInfo(personalInfo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalInfo"] });
    },
  });
}

// Project Queries
export function useListProjects() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, ProjectMetadata][]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProject() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.getProject(projectId);
    },
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useNewProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Uint8Array }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.newProject(name, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: { projectId: string; data: Uint8Array }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateProject(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Pixel Balance Queries
export function useGetCallerPixelBalance() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["pixelBalance"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerPixelBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPixelPrice() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["pixelPrice"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPixelPrice();
    },
    enabled: !!actor && !isFetching,
  });
}

// Era Management
export function useGetCurrentEra() {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ["currentEra"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCurrentEra();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetCurrentEra() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (era: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setCurrentEra(era);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentEra"] });
    },
  });
}

// Admin Queries
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAdminUserOverview() {
  const { actor, isFetching } = useActor();

  return useQuery<
    Array<{
      principal: Principal;
      name?: string;
      email?: string;
      pixels: bigint;
    }>
  >({
    queryKey: ["adminUserOverview"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAdminUserOverview();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllUserPixelBalances() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[Principal, bigint]>>({
    queryKey: ["allUserPixelBalances"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAllUserPixelBalances();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTotalPixelsSold() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["totalPixelsSold"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getTotalPixelsSold();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminCreditPixels() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      amount,
      reason,
    }: { user: Principal; amount: bigint; reason: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.adminCreditPixels(user, amount, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserOverview"] });
      queryClient.invalidateQueries({ queryKey: ["allUserPixelBalances"] });
      queryClient.invalidateQueries({ queryKey: ["totalPixelsSold"] });
    },
  });
}

export function useGetEditorVisitCount() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["editorVisitCount"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getEditorVisitCount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTotalProjectCount() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["totalProjectCount"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getTotalProjectCount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRealFrontendCycleInfo() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["frontendCycleInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getRealFrontendCycleInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRealBackendCycleInfo() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["backendCycleInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getRealBackendCycleInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListPendingPixelPurchases() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<PixelPurchase>>({
    queryKey: ["pendingPixelPurchases"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.listPendingPixelPurchases();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminCreditPixelsForPurchase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      txIndex,
      reason,
    }: { txIndex: bigint; reason: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.adminCreditPixelsForPurchase(txIndex, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPixelPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["adminUserOverview"] });
      queryClient.invalidateQueries({ queryKey: ["allUserPixelBalances"] });
      queryClient.invalidateQueries({ queryKey: ["totalPixelsSold"] });
    },
  });
}

export function useGetMyPendingPixelPurchases() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["myPendingPixelPurchases"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyPendingPixelPurchases();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}
