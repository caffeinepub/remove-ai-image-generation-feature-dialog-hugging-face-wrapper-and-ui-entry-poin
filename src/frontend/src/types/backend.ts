import type { Principal } from "@dfinity/principal";

// ─── Domain Types ────────────────────────────────────────────────────────────

export interface ProjectMetadata {
  name: string;
  created: bigint;
  modified: bigint;
  version: bigint;
  size: bigint;
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

export interface UserPersonalInfo {
  name: string;
  email: string;
  additional: string | null;
}

export type PurchaseStatus = { pending: null } | { credited: null };

export interface PixelPurchase {
  txIndex: bigint;
  buyer: Principal;
  pixels: bigint;
  amountE8s: bigint;
  createdAt: bigint;
  status: PurchaseStatus;
}

// ─── Result / Variant Types ───────────────────────────────────────────────────

export type ProjectResult = { ok: string } | { err: string };
export type SaveProjectResult = { ok: string } | { err: string };
export type RecordPixelPurchaseResult = { ok: string } | { err: string };
export type AdminCreditPixelsForPurchaseResult =
  | { ok: bigint }
  | { err: string };

// ─── Cycle Types ─────────────────────────────────────────────────────────────

export type HealthStatus = { ok: null } | { low: null } | { critical: null };

export interface CycleInfo {
  balance: bigint;
  healthStatus: HealthStatus;
}

export type CycleCheckResult = { ok: bigint } | { err: string };
export type CycleTopUpResult = { ok: bigint } | { err: string };

// ─── Admin User Overview ──────────────────────────────────────────────────────
// Optional fields use JS convention (string | undefined) matching how the IDL
// agent converts Candid optionals at runtime.

export interface AdminUserOverview {
  principal: Principal;
  name?: string;
  email?: string;
  pixels: bigint;
}

// ─── Extended Backend Actor Interface ────────────────────────────────────────
// The ICP JS agent auto-converts Candid optionals (?T) to T | null at runtime.
// Return types here reflect that JS convention, not raw Candid tuples.

export interface BackendActor {
  // User profile
  getCallerUserProfile(): Promise<UserProfile | null>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  getPersonalInfo(): Promise<UserPersonalInfo | null>;
  savePersonalInfo(personalInfo: UserPersonalInfo): Promise<void>;
  getUserPersonalInfo(user: Principal): Promise<UserPersonalInfo | null>;
  getUserProfile(user: Principal): Promise<UserProfile | null>;

  // Projects
  newProject(name: string, data: Uint8Array): Promise<ProjectResult>;
  listProjects(): Promise<Array<[string, ProjectMetadata]>>;
  getProject(projectId: string): Promise<Project | null>;
  updateProject(
    projectId: string,
    data: Uint8Array,
  ): Promise<SaveProjectResult>;
  deleteProject(projectId: string): Promise<void>;

  // Pixel balance
  getCallerPixelBalance(): Promise<bigint>;
  getPixelPrice(): Promise<bigint>;

  // Editor visit tracking
  recordEditorVisit(): Promise<void>;

  // Pixel purchases
  recordPixelPurchase(
    txIndex: bigint,
    pixels: bigint,
    amountE8s: bigint,
  ): Promise<RecordPixelPurchaseResult>;
  listPendingPixelPurchases(): Promise<Array<PixelPurchase>>;
  getMyPendingPixelPurchases(): Promise<Array<PixelPurchase>>;
  adminCreditPixelsForPurchase(
    txIndex: bigint,
    reason: string,
  ): Promise<AdminCreditPixelsForPurchaseResult>;

  // Admin
  isCallerAdmin(): Promise<boolean>;
  getAdminUserOverview(): Promise<Array<AdminUserOverview>>;
  getAllUserPixelBalances(): Promise<Array<[Principal, bigint]>>;
  getTotalPixelsSold(): Promise<bigint>;
  adminCreditPixels(
    user: Principal,
    amount: bigint,
    reason: string,
  ): Promise<bigint>;
  getEditorVisitCount(): Promise<bigint>;
  getTotalProjectCount(): Promise<bigint>;
  getCurrentEra(): Promise<string>;
  setCurrentEra(era: string): Promise<void>;

  // Cycles
  getRealFrontendCycleInfo(): Promise<CycleInfo | null>;
  getRealBackendCycleInfo(): Promise<CycleInfo | null>;
}
