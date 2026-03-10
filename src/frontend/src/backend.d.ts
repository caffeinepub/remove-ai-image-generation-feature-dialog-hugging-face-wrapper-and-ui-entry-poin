import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface OwnedCanister {
    userName: string;
    created: Time;
    modified: Time;
    owner: Principal;
    canisterId: Principal;
}
export interface PixelPurchase {
    status: PurchaseStatus;
    txIndex: bigint;
    createdAt: Time;
    pixels: bigint;
    amountE8s: bigint;
    buyer: Principal;
}
export interface ProjectMetadata {
    created: Time;
    modified: Time;
    name: string;
    size: bigint;
    version: bigint;
}
export interface UserPersonalInfo {
    name: string;
    email: string;
    additional?: string;
}
export type ProjectResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export type AccountIdentifier = Uint8Array;
export interface CycleInfo {
    balance: bigint;
    healthStatus: HealthStatus;
}
export type CycleCheckResult = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export type CycleTopUpResult = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export interface UserProfile {
    name: string;
}
export interface Project {
    id: string;
    owner: Principal;
    metadata: ProjectMetadata;
    data: Uint8Array;
}
export enum HealthStatus {
    ok = "ok",
    low = "low",
    critical = "critical"
}
export enum PurchaseStatus {
    pending = "pending",
    credited = "credited"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addOwnedCustomer(customer: OwnedCanister): Promise<void>;
    adminBanUser(user: Principal): Promise<void>;
    adminCreditPixels(user: Principal, amount: bigint, reason: string): Promise<bigint>;
    adminCreditPixelsForPurchase(txIndex: bigint, reason: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminRemovePixels(user: Principal, amount: bigint, reason: string): Promise<bigint>;
    adminUnbanUser(user: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteProject(projectId: string): Promise<ProjectResult>;
    getAdminUserOverview(): Promise<Array<{
        principal: Principal;
        name?: string;
        email?: string;
        pixels: bigint;
    }>>;
    getAllUserPixelBalances(): Promise<Array<[Principal, bigint]>>;
    getAllUsersWithPersonalInfo(): Promise<Array<[Principal, {
            name: string;
            email: string;
            additional?: string;
        }]>>;
    getCallerAccountIdentifier(): Promise<string>;
    getCallerICPBalance(): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getCallerPixelBalance(): Promise<bigint>;
    getCallerPrincipal(): Promise<Principal>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCanisterCycleInfo(): Promise<CycleInfo | null>;
    getCanisterCycles(): Promise<CycleCheckResult>;
    getCanisterHealthStatus(): Promise<HealthStatus>;
    getCurrentEra(): Promise<string>;
    getEditorVisitCount(): Promise<bigint>;
    getMyPendingPixelPurchases(): Promise<Array<PixelPurchase>>;
    getOwnedCustomerByCanister(canisterId: Principal): Promise<OwnedCanister | null>;
    getOwnedCustomersByUser(user: Principal): Promise<Array<OwnedCanister>>;
    getPersonalInfo(): Promise<UserPersonalInfo | null>;
    getPixelPrice(): Promise<bigint>;
    getProject(projectId: string): Promise<Project | null>;
    getRealBackendCycleInfo(): Promise<CycleInfo | null>;
    getRealFrontendCycleInfo(): Promise<CycleInfo | null>;
    getTotalPixelsSold(): Promise<bigint>;
    getTotalProjectCount(): Promise<bigint>;
    getUserPersonalInfo(user: Principal): Promise<UserPersonalInfo | null>;
    getUserPixelBalance(user: Principal): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserProjectCount(user: Principal): Promise<bigint>;
    getUsersByName(name: string): Promise<Array<[Principal, UserPersonalInfo]>>;
    getUsersWithCompleteInfo(): Promise<Array<[Principal, UserPersonalInfo]>>;
    initializeAccessControl(): Promise<void>;
    initializeDemoUserProfile(arg0: string): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isUserBanned(user: Principal): Promise<boolean>;
    listAllKnownUsers(): Promise<Array<Principal>>;
    listAllUsers(): Promise<Array<Principal>>;
    listAllUsersWithPersonalInfo(): Promise<Array<[Principal, UserPersonalInfo]>>;
    listOwnedCustomers(): Promise<Array<OwnedCanister>>;
    listPendingPixelPurchases(): Promise<Array<PixelPurchase>>;
    listProjects(): Promise<Array<[string, ProjectMetadata]>>;
    newProject(name: string, data: Uint8Array): Promise<ProjectResult>;
    recordEditorVisit(): Promise<void>;
    recordPixelPurchase(txIndex: bigint, pixels: bigint, amountE8s: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    removeOwnedCustomer(canisterId: Principal): Promise<void>;
    requestControllerAccess(): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    savePersonalInfo(personalInfo: UserPersonalInfo): Promise<void>;
    searchUsersByEmail(email: string): Promise<Array<[Principal, UserPersonalInfo]>>;
    setCurrentEra(era: string): Promise<void>;
    setCyclesThresholds(okThreshold: bigint, lowThreshold: bigint, criticalThreshold: bigint): Promise<void>;
    testAdminImport(testAmount: bigint): Promise<string>;
    topUpCanisterCycles(amount: bigint): Promise<CycleTopUpResult>;
    topUpFrontendCanisterCycles(amount: bigint): Promise<CycleTopUpResult>;
    transferICP(toAccountId: AccountIdentifier, amountE8s: bigint, memo: bigint | null): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateOwnedCustomer(canisterId: Principal, updatedCustomer: OwnedCanister): Promise<void>;
    updateProject(projectId: string, data: Uint8Array): Promise<ProjectResult>;
    verifyIcpPayment(txIndex: bigint, buyer: Principal, amountE8s: bigint): Promise<boolean>;
}
