import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './backend.did.js';

export { idlFactory } from './backend.did.js';

export const canisterId = process.env.CANISTER_ID_BACKEND || "ueo2d-raaaa-aaaaj-a2uuq-cai";

export interface UserPersonalInfo {
  name: string;
  email: string;
  additional?: string;
}

export interface _SERVICE {
  addOwnedCustomer: ActorMethod<[OwnedCanister], void>;
  adminBanUser: ActorMethod<[Principal], void>;
  adminCreditPixels: ActorMethod<[Principal, bigint, string], bigint>;
  adminRemovePixels: ActorMethod<[Principal, bigint, string], bigint>;
  adminUnbanUser: ActorMethod<[Principal], void>;
  assignCallerUserRole: ActorMethod<[Principal, UserRole], void>;
  claimPixels: ActorMethod<[bigint, bigint, AccountIdentifier], { ok: bigint } | { err: string }>;
  claimPixelsSimple: ActorMethod<[bigint, bigint], { ok: bigint } | { err: string }>;
  deleteProject: ActorMethod<[string], ProjectResult>;
  getAdminUserOverview: ActorMethod<[], Array<{
    principal: Principal;
    name?: string;
    email?: string;
    pixels: bigint;
  }>>;
  getAllUserPixelBalances: ActorMethod<[], Array<[Principal, bigint]>>;
  getAllUsersPersonalInfo: ActorMethod<[], Array<[Principal, UserPersonalInfo]>>;
  getAllUsersWithPersonalInfo: ActorMethod<[], Array<[Principal, UserPersonalInfo]>>;
  getCallerAccountIdentifier: ActorMethod<[], string>;
  getCallerICPBalance: ActorMethod<[], { ok: bigint } | { err: string }>;
  getCallerPixelBalance: ActorMethod<[], bigint>;
  getCallerPrincipal: ActorMethod<[], Principal>;
  getCallerUserProfile: ActorMethod<[], UserProfile | null>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  getCanisterCycleInfo: ActorMethod<[], CycleInfo | null>;
  getCanisterCycles: ActorMethod<[], CycleCheckResult>;
  getCanisterHealthStatus: ActorMethod<[], HealthStatus>;
  getCurrentEra: ActorMethod<[], string>;
  getEditorVisitCount: ActorMethod<[], bigint>;
  getOwnedCustomerByCanister: ActorMethod<[Principal], OwnedCanister | null>;
  getOwnedCustomersByUser: ActorMethod<[Principal], Array<OwnedCanister>>;
  getOwnedCustomersForCaller: ActorMethod<[], Array<OwnedCanister>>;
  getPersonalInfo: ActorMethod<[], UserPersonalInfo | null>;
  getPixelPrice: ActorMethod<[], bigint>;
  getProject: ActorMethod<[string], Project | null>;
  getRealBackendCycleInfo: ActorMethod<[], CycleInfo | null>;
  getRealFrontendCycleInfo: ActorMethod<[], CycleInfo | null>;
  getTotalPixelsSold: ActorMethod<[], bigint>;
  getTotalProjectCount: ActorMethod<[], bigint>;
  getUserPersonalInfo: ActorMethod<[Principal], UserPersonalInfo | null>;
  getUserPixelBalance: ActorMethod<[Principal], bigint>;
  getUserProfile: ActorMethod<[Principal], UserProfile | null>;
  getUserProjectCount: ActorMethod<[Principal], bigint>;
  getUsersByName: ActorMethod<[string], Array<[Principal, UserPersonalInfo]>>;
  getUsersWithCompleteInfo: ActorMethod<[], Array<[Principal, UserPersonalInfo]>>;
  initializeAccessControl: ActorMethod<[], void>;
  initializeDemoUserProfile: ActorMethod<[string], void>;
  isCallerAdmin: ActorMethod<[], boolean>;
  isUserBanned: ActorMethod<[Principal], boolean>;
  listAllKnownUsers: ActorMethod<[], Array<Principal>>;
  listAllUsers: ActorMethod<[], Array<Principal>>;
  listAllUsersWithPersonalInfo: ActorMethod<[], Array<[Principal, UserPersonalInfo]>>;
  listOwnedCustomers: ActorMethod<[], Array<OwnedCanister>>;
  listProjects: ActorMethod<[], Array<[string, ProjectMetadata]>>;
  newProject: ActorMethod<[string, Uint8Array], ProjectResult>;
  recordEditorVisit: ActorMethod<[], void>;
  removeOwnedCustomer: ActorMethod<[Principal], void>;
  requestControllerAccess: ActorMethod<[], string>;
  saveCallerUserProfile: ActorMethod<[UserProfile], void>;
  savePersonalInfo: ActorMethod<[UserPersonalInfo], void>;
  searchUsersByEmail: ActorMethod<[string], Array<[Principal, UserPersonalInfo]>>;
  setCurrentEra: ActorMethod<[string], void>;
  setCyclesThresholds: ActorMethod<[bigint, bigint, bigint], void>;
  topUpCanisterCycles: ActorMethod<[bigint], CycleTopUpResult>;
  topUpFrontendCanisterCycles: ActorMethod<[bigint], CycleTopUpResult>;
  transferICP: ActorMethod<[AccountIdentifier, bigint, bigint | null], { ok: bigint } | { err: string }>;
  updateOwnedCustomer: ActorMethod<[Principal, OwnedCanister], void>;
  updatePersonalInfo: ActorMethod<[{ name: string; email: string; additional?: string }], string>;
  updateProject: ActorMethod<[string, Uint8Array], ProjectResult>;
}

export type ProjectResult = { ok: string } | { err: string };
export type CycleTopUpResult = { ok: bigint } | { err: string };
export type Time = bigint;
export interface OwnedCanister {
  userName: string;
  created: Time;
  modified: Time;
  owner: Principal;
  canisterId: Principal;
}
export type AccountIdentifier = Uint8Array;
export interface CycleInfo {
  balance: bigint;
  healthStatus: HealthStatus;
}
export type CycleCheckResult = { ok: bigint } | { err: string };
export interface ProjectMetadata {
  created: Time;
  modified: Time;
  name: string;
  size: bigint;
  version: bigint;
}
export interface Project {
  id: string;
  owner: Principal;
  metadata: ProjectMetadata;
  data: Uint8Array;
}
export interface UserProfile {
  name: string;
}
export type HealthStatus = { ok: null } | { low: null } | { critical: null };
export type UserRole = { admin: null } | { user: null } | { guest: null };

export const createActor = (canisterId: string, options?: {
  agentOptions?: {
    host?: string;
  };
  actorOptions?: {
    agent?: HttpAgent;
  };
}) => {
  const agent = options?.actorOptions?.agent || new HttpAgent({ ...options?.agentOptions });

  if (process.env.DFX_NETWORK !== "ic") {
    agent.fetchRootKey().catch((err) => {
      console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
      console.error(err);
    });
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

export const backend = createActor(canisterId);
