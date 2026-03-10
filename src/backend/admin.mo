import AccessControl "authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Cycles "mo:core/Cycles";

module {
  public type UserPersonalInfo = {
    name : Text;
    email : Text;
    additional : ?Text;
  };

  public type UserProfile = {
    name : Text;
  };

  public type OwnedCanister = {
    canisterId : Principal;
    owner : Principal;
    userName : Text;
    created : Time.Time;
    modified : Time.Time;
  };

  public type CycleInfo = {
    balance : Nat;
    healthStatus : HealthStatus;
  };

  public type HealthStatus = {
    #ok;
    #low;
    #critical;
  };

  public type CycleTopUpResult = {
    #ok : Nat;
    #err : Text;
  };

  public type ProjectMetadata = {
    name : Text;
    created : Time.Time;
    modified : Time.Time;
    version : Nat;
    size : Nat;
  };

  public type Project = {
    id : Text;
    owner : Principal;
    metadata : ProjectMetadata;
    data : Blob;
  };

  public type ManagementCanister = actor {
    canister_status : shared {
      canister_id : Principal;
    } -> async {
      cycles : Nat;
    };
  };

  let managementCanister : ManagementCanister = actor "aaaaa-aa";

  public func listOwnedCustomers(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    ownedCanisters : Map.Map<Principal, OwnedCanister>,
  ) : [OwnedCanister] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can list owned customers");
    };
    ownedCanisters.values().toArray();
  };

  public func addOwnedCustomer(
    customer : OwnedCanister,
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    ownedCanisters : Map.Map<Principal, OwnedCanister>,
  ) : () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add owned customers");
    };
    ownedCanisters.add(customer.canisterId, customer);
  };

  public func removeOwnedCustomer(
    canisterId : Principal,
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    ownedCanisters : Map.Map<Principal, OwnedCanister>,
  ) : () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can remove customers");
    };
    ownedCanisters.remove(canisterId);
  };

  public func updateOwnedCustomer(
    canisterId : Principal,
    updatedCustomer : OwnedCanister,
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    ownedCanisters : Map.Map<Principal, OwnedCanister>,
  ) : () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update customers");
    };
    ownedCanisters.add(canisterId, updatedCustomer);
  };

  public func getOwnedCustomerByCanister(
    canisterId : Principal,
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    ownedCanisters : Map.Map<Principal, OwnedCanister>,
  ) : ?OwnedCanister {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can query owned customers");
    };
    ownedCanisters.get(canisterId);
  };

  public func getOwnedCustomersByUser(
    user : Principal,
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    ownedCanisters : Map.Map<Principal, OwnedCanister>,
  ) : [OwnedCanister] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can query owned customers by user");
    };
    ownedCanisters.values().toArray().filter(
      func(c) { c.owner == user }
    );
  };

  public func validatePixelAmount(amount : Nat) : Bool {
    amount > 0 and amount <= 1_000_000;
  };

  public func formatAdminAction(action : Text, user : Principal, amount : Nat, reason : Text) : Text {
    "Admin action: " # action # " | User: " # user.toText() # " | Amount: " # amount.toText() # " | Reason: " # reason;
  };

  public func adminCreditPixels(
    accessControlState : AccessControl.AccessControlState,
    pixelBalances : Map.Map<Principal, Nat>,
    caller : Principal,
    user : Principal,
    amount : Nat,
    _reason : Text,
  ) : Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can credit pixels");
    };

    if (not validatePixelAmount(amount)) {
      Runtime.trap("Invalid pixel amount (must be between 1 and 1,000,000)");
    };

    let current = switch (pixelBalances.get(user)) {
      case (?balance) { balance };
      case (null) { 0 };
    };

    let updated = current + amount;
    pixelBalances.add(user, updated);

    updated;
  };

  public func adminRemovePixels(
    accessControlState : AccessControl.AccessControlState,
    pixelBalances : Map.Map<Principal, Nat>,
    caller : Principal,
    user : Principal,
    amount : Nat,
    _reason : Text,
  ) : Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can remove pixels");
    };

    if (not validatePixelAmount(amount)) {
      Runtime.trap("Invalid pixel amount (must be between 1 and 1,000,000)");
    };

    let current = switch (pixelBalances.get(user)) {
      case (?balance) { balance };
      case (null) { 0 };
    };

    if (amount > current) {
      Runtime.trap("Removal amount exceeds current balance");
    };

    let updated = current - amount : Nat;
    pixelBalances.add(user, updated);

    updated;
  };

  public func adminBanUser(
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    caller : Principal,
    user : Principal,
  ) : () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: adminBanUser is admin-only");
    };
    bannedUsers.add(user, true);
  };

  public func adminUnbanUser(
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    caller : Principal,
    user : Principal,
  ) : () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: adminUnbanUser is admin-only");
    };
    bannedUsers.remove(user);
  };

  public func isUserBanned(
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    caller : Principal,
    user : Principal,
  ) : Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: isUserBanned is admin-only");
    };
    switch (bannedUsers.get(user)) {
      case (?true) { true };
      case (_) { false };
    };
  };

  public func testAdminImport(
    accessControlState : AccessControl.AccessControlState,
    caller : Principal,
    testAmount : Nat,
  ) : Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: testAdminImport is admin-only");
    };

    formatAdminAction("test_import", caller, testAmount, "test import verification");
  };

  public func setCyclesThresholds(
    caller : Principal,
    okThreshold : Nat,
    lowThreshold : Nat,
    criticalThreshold : Nat,
    accessControlState : AccessControl.AccessControlState,
    _cyclesThresholds : { ok : Nat; low : Nat; critical : Nat },
  ) : { ok : Nat; low : Nat; critical : Nat } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can set cycle thresholds");
    };

    {
      ok = okThreshold;
      low = lowThreshold;
      critical = criticalThreshold;
    };
  };

  public func listAllKnownUsers(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    userProfiles : Map.Map<Principal, UserProfile>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
    pixelBalances : Map.Map<Principal, Nat>,
  ) : [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can list all known users");
    };

    let resultMap = Map.empty<Principal, Bool>();

    let profileIter = userProfiles.keys();
    for (id in profileIter) {
      resultMap.add(id, true);
    };

    let infoIter = userPersonalInfo.keys();
    for (id in infoIter) {
      resultMap.add(id, true);
    };

    let pixelIter = pixelBalances.keys();
    for (id in pixelIter) {
      resultMap.add(id, true);
    };

    resultMap.keys().toArray();
  };

  public func getAdminUserOverview(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    userProfiles : Map.Map<Principal, UserProfile>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
    pixelBalances : Map.Map<Principal, Nat>,
  ) : [{
    principal : Principal;
    name : ?Text;
    email : ?Text;
    pixels : Nat;
  }] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view user overview");
    };

    let resultMap = Map.empty<Principal, Bool>();

    let profileIter = userProfiles.keys();
    for (id in profileIter) {
      resultMap.add(id, true);
    };

    let infoIter = userPersonalInfo.keys();
    for (id in infoIter) {
      resultMap.add(id, true);
    };

    let pixelIter = pixelBalances.keys();
    for (id in pixelIter) {
      resultMap.add(id, true);
    };

    let principals = resultMap.keys().toArray();

    let overviewArray = principals.map(func(p) {
      let name = switch (userPersonalInfo.get(p)) {
        case (null) { null };
        case (?info) { ?info.name };
      };
      let email = switch (userPersonalInfo.get(p)) {
        case (null) { null };
        case (?info) { ?info.email };
      };
      let pixels = switch (pixelBalances.get(p)) {
        case (null) { 0 };
        case (?balance) { balance };
      };
      {
        principal = p;
        name;
        email;
        pixels;
      };
    });
    overviewArray;
  };

  public func getCycleInfoForCanister(
    canisterId : Principal,
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
  ) : async ?CycleInfo {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can query cycle info");
    };
    try {
      let statusResponse = await managementCanister.canister_status({ canister_id = canisterId });
      let balance = statusResponse.cycles;

      let computedStatus = if (balance > 500_000_000_000_000) {
        #ok;
      } else if (balance > 100_000_000_000_000) {
        #low;
      } else { #critical };

      ?{
        balance;
        healthStatus = computedStatus;
      };
    } catch (_) {
      null;
    };
  };

  public func getRealFrontendCycleInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
  ) : async ?CycleInfo {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view frontend canister cycles");
    };
    let frontendCanisterId = Principal.fromText("udp4x-4yaaa-aaaaj-a2uua-cai");
    await getCycleInfoForCanister(frontendCanisterId, caller, accessControlState);
  };

  public func getRealBackendCycleInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
  ) : async ?CycleInfo {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view backend canister cycles");
    };
    let backendCanisterId = Principal.fromText("ueo2d-raaaa-aaaaj-a2uuq-cai");
    await getCycleInfoForCanister(backendCanisterId, caller, accessControlState);
  };

  public func topUpFrontendCanisterCycles(
    caller : Principal,
    amount : Nat,
    accessControlState : AccessControl.AccessControlState,
  ) : async CycleTopUpResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can top up frontend canister cycles");
    };

    try {
      if (amount == 0) {
        return #err("Invalid amount - zero top ups not allowed");
      };

      #ok(amount);
    } catch (_) {
      #err("Failed to top up frontend canister cycles");
    };
  };

  public func getTotalProjectCount(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    userProjects : Map.Map<Principal, [Project]>,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view total project count");
    };

    var total = 0;
    let entries = userProjects.entries();
    for ((_, projects) in entries) {
      total += projects.size();
    };
    total;
  };

  public func getUserProjectCount(
    caller : Principal,
    user : Principal,
    accessControlState : AccessControl.AccessControlState,
    userProjects : Map.Map<Principal, [Project]>,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view user project count");
    };

    switch (userProjects.get(user)) {
      case (?projects) { projects.size() };
      case (null) { 0 };
    };
  };

  public func getEditorVisitCount(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    editorVisitCount : Nat,
  ) : Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view editor visit count");
    };

    editorVisitCount;
  };

  public func getCurrentEra(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    currentEra : Text,
  ) : Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view current era");
    };

    currentEra;
  };

  public func setCurrentEra(
    caller : Principal,
    era : Text,
    accessControlState : AccessControl.AccessControlState,
  ) : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can set current era");
    };

    era;
  };
};
