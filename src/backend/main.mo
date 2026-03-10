import AccessControl "authorization/access-control";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Cycles "mo:core/Cycles";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Users "users";
import Admin "admin";
import Conversion "utils/conversion";
import CyclesUtil "utils/cycles";
import Guards "utils/guards";
import Customers "customers";
import SystemStatus "systemStatus";

actor {
  let ADMIN_PRINCIPAL_TEXT : Text = "qed3y-ibcj7-nfsh6-6wmee-oorik-oitj5-oj6fl-n7k4l-y4clp-dkbee-kae";
  let ADMIN_ACCOUNT_ID_HEX : Text = "0f05f83fb167a711cab91132955a5ce48ed92673bfcd69f5861991e727926f4f";
  let PIXEL_PRICE_E8S : Nat64 = 10_000_000;
  let MAX_PIXELS_PER_PURCHASE : Nat = 1000;
  var currentEra : Text = "Alpha";
  var bannedUsers = Map.empty<Principal, Bool>();
  var lastTxIndexByUser = Map.empty<Principal, Nat>();
  var lastTxIndexEntries : [(Principal, Nat)] = [];
  var pixelPurchaseEntries : [(Nat, PixelPurchase)] = [];

  public type ManagementCanister = actor {
    canister_status : shared {
      canister_id : Principal;
    } -> async {
      cycles : Nat;
    };
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

  public type UserProfile = {
    name : Text;
  };

  public type ProjectResult = {
    #ok : Text;
    #err : Text;
  };

  public type CycleCheckResult = CyclesUtil.CycleCheckResult;
  public type CycleTopUpResult = CyclesUtil.CycleTopUpResult;
  public type CycleInfo = CyclesUtil.CycleInfo;
  public type HealthStatus = CyclesUtil.HealthStatus;
  public type OwnedCanister = Customers.OwnedCanister;

  let managementCanister : ManagementCanister = actor "aaaaa-aa";

  public type ICP = Nat;
  public type Tokens = { e8s : Nat64 };
  public type AccountIdentifier = Blob;
  public type Subaccount = Blob;
  public type Memo = Nat64;
  public type TransferArgs = {
    to : AccountIdentifier;
    fee : Tokens;
    memo : Memo;
    from_subaccount : ?Subaccount;
    created_at_time : ?{ timestamp_nanos : Nat64 };
    amount : Tokens;
  };

  public type TransferResult = {
    #Ok : Nat64;
    #Err : TransferError;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #TxTooOld : { allowed_window_nanos : Nat64 };
    #TxCreatedInFuture;
    #TxDuplicate : { duplicate_of : Nat64 };
  };

  public type AccountBalanceArgs = {
    account : AccountIdentifier;
  };

  public type LedgerCanister = actor {
    account_balance : shared query AccountBalanceArgs -> async Tokens;
    transfer : shared TransferArgs -> async TransferResult;
  };

  let ledgerCanister : LedgerCanister = actor "ryjl3-tyaaa-aaaaa-aaaba-cai";
  let transferFee : Nat64 = 10_000;

  public type SaveProjectResult = {
    #ok : Text;
    #err : Text;
  };

  var pixelBalances = Map.empty<Principal, Nat>();
  var claimedTx = Map.empty<Nat, Bool>();
  var pixelEntries : [(Principal, Nat)] = [];
  var claimedEntries : [Nat] = [];
  var accessControlEntries : [(Principal, AccessControl.UserRole)] = [];
  var adminAssignedStable : Bool = false;
  var editorVisitCount : Nat = 0;
  let accessControlState = AccessControl.initState();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userProjects = Map.empty<Principal, [Project]>();
  let ownedCanisters = Map.empty<Principal, OwnedCanister>();
  var userPersonalInfo = Map.empty<Principal, Users.UserPersonalInfo>();
  let pixelPriceNanoCycles : Nat = 100_000;
  var pixelPurchaseLog = Map.empty<Nat, PixelPurchase>();

  for ((p, b) in pixelEntries.vals()) {
    pixelBalances.add(p, b);
  };
  for (tx in claimedEntries.vals()) {
    claimedTx.add(tx, true);
  };

  system func preupgrade() {
    accessControlEntries := accessControlState.userRoles.toArray();
    adminAssignedStable := accessControlState.adminAssigned;
    pixelEntries := pixelBalances.toArray();
    claimedEntries := claimedTx.keys().toArray();
    lastTxIndexEntries := lastTxIndexByUser.toArray();
    pixelPurchaseEntries := pixelPurchaseLog.toArray();
  };

  system func postupgrade() {
    pixelBalances := Map.empty<Principal, Nat>();
    claimedTx := Map.empty<Nat, Bool>();
    for ((p, b) in pixelEntries.vals()) {
      pixelBalances.add(p, b);
    };
    for (tx in claimedEntries.vals()) {
      claimedTx.add(tx, true);
    };
    for ((p, role) in accessControlEntries.vals()) {
      accessControlState.userRoles.add(p, role);
    };
    accessControlState.adminAssigned := adminAssignedStable;

    lastTxIndexByUser := Map.empty<Principal, Nat>();
    for ((p, v) in lastTxIndexEntries.vals()) {
      lastTxIndexByUser.add(p, v);
    };

    if (adminAssignedStable == false or not hasAdminInRoles()) {
      let adminPrincipal = Principal.fromText(ADMIN_PRINCIPAL_TEXT);
      accessControlState.userRoles.add(adminPrincipal, #admin);
      accessControlState.adminAssigned := true;
    };

    pixelPurchaseLog := Map.empty<Nat, PixelPurchase>();
    for ((k, v) in pixelPurchaseEntries.vals()) {
      pixelPurchaseLog.add(k, v);
    };
  };

  private func hasAdminInRoles() : Bool {
    for ((_, role) in accessControlState.userRoles.entries()) {
      switch (role) {
        case (#admin) { return true };
        case (_) {};
      };
    };
    false;
  };

  public shared ({ caller }) func getCallerAccountIdentifier() : async Text {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);
    caller.toText();
  };

  public shared ({ caller }) func getCallerICPBalance() : async {
    #ok : Nat64;
    #err : Text;
  } {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);
    try {
      let accountId = Conversion.principalToAccountIdentifier(caller);
      let balance = await ledgerCanister.account_balance({ account = accountId });
      #ok(balance.e8s);
    } catch (_) {
      #err("Failed to query ICP balance from ledger");
    };
  };

  public shared ({ caller }) func transferICP(
    toAccountId : AccountIdentifier,
    amountE8s : Nat64,
    memo : ?Nat64
  ) : async {
    #ok : Nat64;
    #err : Text;
  } {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    if (amountE8s <= transferFee) {
      return #err("Amount must be greater than transfer fee (0.0001 ICP)");
    };
    try {
      let transferArgs : TransferArgs = {
        to = toAccountId;
        fee = { e8s = transferFee };
        memo = switch (memo) {
          case null { 0 };
          case (?m) { m };
        };
        from_subaccount = null;
        created_at_time = null;
        amount = { e8s = amountE8s };
      };
      let result = await ledgerCanister.transfer(transferArgs);
      switch (result) {
        case (#Ok(blockHeight)) {
          #ok(blockHeight);
        };
        case (#Err(#BadFee({ expected_fee }))) {
          #err("Bad fee - expected: " # Nat64.toText(expected_fee.e8s) # " e8s");
        };
        case (#Err(#InsufficientFunds({ balance }))) {
          #err("Insufficient funds - balance: " # Nat64.toText(balance.e8s) # " e8s");
        };
        case (#Err(#TxTooOld({ allowed_window_nanos = _ }))) {
          #err("Transaction too old");
        };
        case (#Err(#TxCreatedInFuture)) {
          #err("Transaction created in future");
        };
        case (#Err(#TxDuplicate({ duplicate_of }))) {
          #err("Duplicate transaction - block: " # Nat64.toText(duplicate_of));
        };
      };
    } catch (_) {
      #err("Failed to transfer ICP - ledger error");
    };
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func listAllUsers() : async [Principal] {
    Guards.requireAdminPermission(caller, accessControlState);
    userProfiles.keys().toArray();
  };

  public shared ({ caller }) func getAllUsersWithPersonalInfo() : async [(
    Principal,
    {
      name : Text;
      email : Text;
      additional : ?Text;
    },
  )] {
    Users.getAllUsersWithPersonalInfo(caller, accessControlState, bannedUsers, userPersonalInfo);
  };

  public shared ({ caller }) func getUsersWithCompleteInfo() : async [(Principal, Users.UserPersonalInfo)] {
    Users.getUsersWithCompleteInfo(
      caller,
      accessControlState,
      bannedUsers,
      userPersonalInfo,
    );
  };

  public shared ({ caller }) func getUsersByName(name : Text) : async [(Principal, Users.UserPersonalInfo)] {
    Users.getUsersByName(
      caller,
      accessControlState,
      bannedUsers,
      userPersonalInfo,
      name,
    );
  };

  public shared ({ caller }) func searchUsersByEmail(email : Text) : async [(Principal, Users.UserPersonalInfo)] {
    Users.searchUsersByEmail(
      caller,
      accessControlState,
      bannedUsers,
      userPersonalInfo,
      email,
    );
  };

  public query ({ caller }) func listAllUsersWithPersonalInfo() : async [(Principal, Users.UserPersonalInfo)] {
    Users.listAllUsersWithPersonalInfo(
      caller,
      accessControlState,
      bannedUsers,
      userPersonalInfo,
    );
  };

  public shared ({ caller }) func getOwnedCustomerByCanister(canisterId : Principal) : async ?OwnedCanister {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Customers.getOwnedCustomerByCanister(canisterId, caller, accessControlState, ownedCanisters);
  };

  public shared ({ caller }) func getOwnedCustomersByUser(user : Principal) : async [OwnedCanister] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Customers.getOwnedCustomersByUser(user, caller, accessControlState, ownedCanisters);
  };

  public shared ({ caller }) func listOwnedCustomers() : async [OwnedCanister] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Customers.listOwnedCustomers(caller, accessControlState, ownedCanisters);
  };

  public shared ({ caller }) func addOwnedCustomer(customer : OwnedCanister) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Customers.addOwnedCustomer(customer, caller, accessControlState, ownedCanisters);
  };

  public shared ({ caller }) func removeOwnedCustomer(canisterId : Principal) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Customers.removeOwnedCustomer(canisterId, caller, accessControlState, ownedCanisters);
  };

  public shared ({ caller }) func updateOwnedCustomer(
    canisterId : Principal,
    updatedCustomer : OwnedCanister,
  ) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Customers.updateOwnedCustomer(canisterId, updatedCustomer, caller, accessControlState, ownedCanisters);
  };

  var cyclesThresholds = {
    ok = 500_000_000_000_000;
    low = 100_000_000_000_000;
    critical = 50_000_000_000_000;
  };

  public shared ({ caller }) func setCyclesThresholds(okThreshold : Nat, lowThreshold : Nat, criticalThreshold : Nat) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    cyclesThresholds := Admin.setCyclesThresholds(
      caller,
      okThreshold,
      lowThreshold,
      criticalThreshold,
      accessControlState,
      cyclesThresholds,
    );
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    AccessControl.initialize(accessControlState, caller);
  };

  public shared ({ caller }) func getCallerPrincipal() : async Principal {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);
    caller;
  };

  public query ({ caller }) func getPixelPrice() : async Nat64 {
    PIXEL_PRICE_E8S;
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    Users.saveCallerUserProfile(caller, accessControlState, bannedUsers, userProfiles, profile);
  };

  public shared ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    Users.getCallerUserProfile(caller, accessControlState, bannedUsers, userProfiles);
  };

  public shared ({ caller }) func savePersonalInfo(personalInfo : Users.UserPersonalInfo) : async () {
    Users.savePersonalInfo(
      caller,
      accessControlState,
      bannedUsers,
      userPersonalInfo,
      personalInfo,
    );
  };

  public shared ({ caller }) func getPersonalInfo() : async ?Users.UserPersonalInfo {
    Users.getPersonalInfo(
      caller,
      accessControlState,
      bannedUsers,
      userPersonalInfo,
    );
  };

  public query ({ caller }) func getUserPersonalInfo(user : Principal) : async ?Users.UserPersonalInfo {
    Users.getUserPersonalInfo(
      caller,
      user,
      accessControlState,
      userPersonalInfo
    );
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    Users.getUserProfile(
      caller,
      user,
      accessControlState,
      userProfiles
    );
  };

  public shared ({ caller }) func newProject(name : Text, data : Blob) : async ProjectResult {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    switch (userProjects.get(caller)) {
      case (?projects) {
        if (projects.size() >= 2) {
          return #err("Maximum number of saved projects reached");
        };
      };
      case (null) { };
    };

    if (name == "") {
      return #err("Project name cannot be empty");
    };

    let projectId = name # "_" # Time.now().toText();
    let newProject : Project = {
      id = projectId;
      owner = caller;
      metadata = {
        name = name;
        created = Time.now();
        modified = Time.now();
        version = 1;
        size = data.size();
      };
      data = data;
    };

    let currentProjects = switch (userProjects.get(caller)) {
      case (?projects) { projects };
      case null { [] };
    };
    let updatedProjects = currentProjects.concat([newProject]);
    userProjects.add(caller, updatedProjects);
    #ok(projectId);
  };

  public shared ({ caller }) func listProjects() : async [(Text, ProjectMetadata)] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);
    switch (userProjects.get(caller)) {
      case (?projects) {
        projects.map(func(p) { (p.id, p.metadata) });
      };
      case null { [] };
    };
  };

  public shared ({ caller }) func getProject(projectId : Text) : async ?Project {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    switch (userProjects.get(caller)) {
      case (?projects) {
        projects.find(func(p) { p.id == projectId });
      };
      case null { null };
    };
  };

  public shared ({ caller }) func updateProject(projectId : Text, data : Blob) : async ProjectResult {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    switch (userProjects.get(caller)) {
      case (?projects) {
        let projectIndex = projects.findIndex(func(p) { p.id == projectId });

        switch (projectIndex) {
          case (?index) {
            let oldProject = projects[index];
            let updatedProject : Project = {
              id = oldProject.id;
              owner = oldProject.owner;
              metadata = {
                name = oldProject.metadata.name;
                created = oldProject.metadata.created;
                modified = Time.now();
                version = oldProject.metadata.version + 1;
                size = data.size();
              };
              data = data;
            };

            let updatedProjects = Array.tabulate(
              projects.size(),
              func(i) {
                if (i == index) { updatedProject } else { projects[i] };
              },
            );

            userProjects.add(caller, updatedProjects);
            #ok(projectId);
          };
          case null {
            #err("Project not found");
          };
        };
      };
      case null {
        #err("No projects found for user");
      };
    };
  };

  public shared ({ caller }) func deleteProject(projectId : Text) : async ProjectResult {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    switch (userProjects.get(caller)) {
      case (?projects) {
        let filteredProjects = projects.filter(func(p) { p.id != projectId });

        if (filteredProjects.size() == projects.size()) {
          return #err("Project not found");
        };

        userProjects.add(caller, filteredProjects);
        #ok(projectId);
      };
      case null {
        #err("No projects found for user");
      };
    };
  };

  public shared ({ caller }) func getCanisterCycles() : async CycleCheckResult {
    CyclesUtil.getCanisterCycles(caller, accessControlState, cyclesThresholds);
  };

  public shared ({ caller }) func getCanisterHealthStatus() : async HealthStatus {
    CyclesUtil.getCanisterHealthStatus(caller, accessControlState, cyclesThresholds);
  };

  public shared ({ caller }) func getCanisterCycleInfo() : async ?CycleInfo {
    CyclesUtil.getCanisterCycleInfo(caller, accessControlState, cyclesThresholds);
  };

  public shared ({ caller }) func topUpCanisterCycles(amount : Nat) : async CycleTopUpResult {
    CyclesUtil.topUpCanisterCycles(
      caller,
      amount,
      accessControlState,
      cyclesThresholds,
    );
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    Guards.requireUserPermission(caller, accessControlState);
    AccessControl.getUserRole(accessControlState, caller);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    Guards.requireUserPermission(caller, accessControlState);
    AccessControl.isAdmin(accessControlState, caller);
  };

  public shared ({ caller }) func requestControllerAccess() : async Text {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.requireAdminPermission(caller, accessControlState);

    "Controller access request submitted successfully.";
  };

  public shared ({ caller }) func initializeDemoUserProfile(_ : Text) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.requireAdminPermission(caller, accessControlState);
  };

  public query ({ caller }) func getCallerPixelBalance() : async Nat {
    Guards.requireUserPermission(caller, accessControlState);

    switch (pixelBalances.get(caller)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getUserPixelBalance(user : Principal) : async Nat {
    Guards.requireAdminPermission(caller, accessControlState);

    switch (pixelBalances.get(user)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
  };

  public type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  public type Transfer = {
    from : Account;
    to : Account;
    amount : Nat64;
    fee : Nat64;
    created_at_time : ?Nat64;
  };

  public type Operation = {
    #Transfer : Transfer;
  };

  public type Transaction = {
    operation : Operation;
    memo : Nat;
    created_at_time : Nat;
  };

  public type TransactionWithId = {
    id : Nat;
    transaction : Transaction;
  };

  public type GetAccountTransactionsArgs = {
    account : Account;
    start : ?Nat;
    max_results : Nat;
  };

  public type GetAccountTransactionsOk = {
    transactions : [TransactionWithId];
    oldest_tx_id : ?Nat;
  };

  public type GetAccountTransactionsErr = {
    message : Text;
  };

  public type GetAccountTransactionsResult = {
    #Ok : GetAccountTransactionsOk;
    #Err : GetAccountTransactionsErr;
  };

  public type GetAccountTransactionsResponse = {
    transactions : [TransactionWithId];
    oldest_tx_id : ?Nat;
  };

  public type IndexCanister = actor {
    get_account_transactions : shared query GetAccountTransactionsArgs -> async GetAccountTransactionsResponse;
  };

  public type IndexCanisterV2 = actor {
    get_account_transactions : shared query GetAccountTransactionsArgs -> async GetAccountTransactionsResult;
  };

  let indexCanister : IndexCanister = actor "qhbym-qaaaa-aaaaa-aaafq-cai";
  let indexCanisterV2 : IndexCanisterV2 = actor "qhbym-qaaaa-aaaaa-aaafq-cai";

  public query ({ caller }) func getAllUserPixelBalances() : async [(Principal, Nat)] {
    Guards.requireAdminPermission(caller, accessControlState);
    pixelBalances.toArray();
  };

  public query ({ caller }) func getTotalPixelsSold() : async Nat {
    Guards.requireAdminPermission(caller, accessControlState);
    var total = 0;
    let values = pixelBalances.values();
    for (balance in values) {
      total += balance;
    };
    total;
  };

  public shared ({ caller }) func recordEditorVisit() : async () {
    // Delegate authorization to SystemStatus module
    SystemStatus.recordEditorVisit(caller, accessControlState, bannedUsers);

    // After authorization passes, increment the counter
    editorVisitCount += 1;
  };

  public shared ({ caller }) func adminCreditPixels(user : Principal, amount : Nat, reason : Text) : async Nat {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.adminCreditPixels(accessControlState, pixelBalances, caller, user, amount, reason);
  };

  public shared ({ caller }) func adminRemovePixels(user : Principal, amount : Nat, reason : Text) : async Nat {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.adminRemovePixels(accessControlState, pixelBalances, caller, user, amount, reason);
  };

  public shared ({ caller }) func adminBanUser(user : Principal) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);

    Admin.adminBanUser(accessControlState, bannedUsers, caller, user);
  };

  public shared ({ caller }) func adminUnbanUser(user : Principal) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);

    Admin.adminUnbanUser(accessControlState, bannedUsers, caller, user);
  };

  public query ({ caller }) func isUserBanned(user : Principal) : async Bool {
    Guards.requireAdminPermission(caller, accessControlState);
    Admin.isUserBanned(accessControlState, bannedUsers, caller, user);
  };

  public shared ({ caller }) func testAdminImport(testAmount : Nat) : async Text {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.testAdminImport(accessControlState, caller, testAmount);
  };

  public query ({ caller }) func listAllKnownUsers() : async [Principal] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.listAllKnownUsers(
      caller,
      accessControlState,
      userProfiles,
      userPersonalInfo,
      pixelBalances,
    );
  };

  public query ({ caller }) func getAdminUserOverview() : async [{
    principal : Principal;
    name : ?Text;
    email : ?Text;
    pixels : Nat;
  }] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.getAdminUserOverview(
      caller,
      accessControlState,
      userProfiles,
      userPersonalInfo,
      pixelBalances,
    );
  };

  public shared ({ caller }) func getTotalProjectCount() : async Nat {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    await Admin.getTotalProjectCount(caller, accessControlState, userProjects);
  };

  public shared ({ caller }) func getUserProjectCount(user : Principal) : async Nat {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    await Admin.getUserProjectCount(caller, user, accessControlState, userProjects);
  };

  public query ({ caller }) func getEditorVisitCount() : async Nat {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.getEditorVisitCount(caller, accessControlState, editorVisitCount);
  };

  public query ({ caller }) func getCurrentEra() : async Text {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Admin.getCurrentEra(caller, accessControlState, currentEra);
  };

  public shared ({ caller }) func setCurrentEra(era : Text) : async () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    currentEra := await Admin.setCurrentEra(caller, era, accessControlState);
  };

  public shared ({ caller }) func getRealFrontendCycleInfo() : async ?CyclesUtil.CycleInfo {
    await Admin.getRealFrontendCycleInfo(caller, accessControlState);
  };

  public shared ({ caller }) func getRealBackendCycleInfo() : async ?CyclesUtil.CycleInfo {
    await Admin.getRealBackendCycleInfo(caller, accessControlState);
  };

  public shared ({ caller }) func topUpFrontendCanisterCycles(amount : Nat) : async CyclesUtil.CycleTopUpResult {
    await Admin.topUpFrontendCanisterCycles(caller, amount, accessControlState);
  };

  public type PurchaseStatus = { #pending; #credited };

  public type PixelPurchase = {
    txIndex : Nat;
    buyer : Principal;
    pixels : Nat;
    amountE8s : Nat;
    createdAt : Time.Time;
    status : PurchaseStatus;
  };

  public shared ({ caller }) func recordPixelPurchase(txIndex : Nat, pixels : Nat, amountE8s : Nat) : async {
    #ok : Text;
    #err : Text;
  } {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireUserPermission(caller, accessControlState);

    if (pixels == 0) {
      return #err("pixels must be > 0");
    };

    if (pixels > MAX_PIXELS_PER_PURCHASE) {
      return #err("pixel amount exceeds maximum per purchase");
    };

    let expectedAmountE8s = Nat64.toNat(PIXEL_PRICE_E8S) * pixels;

    if (amountE8s != expectedAmountE8s) {
      return #err("amount does not match pixel price");
    };

    if (pixelPurchaseLog.get(txIndex) != null) {
      return #err("txIndex already exists");
    };

    let purchase : PixelPurchase = {
      txIndex;
      buyer = caller;
      pixels;
      amountE8s;
      createdAt = Time.now();
      status = #pending;
    };

    pixelPurchaseLog.add(txIndex, purchase);
    #ok("recorded");
  };

  public query ({ caller }) func listPendingPixelPurchases() : async [PixelPurchase] {
    Guards.requireAdminPermission(caller, accessControlState);

    let all = pixelPurchaseLog.values().toArray();

    all.filter(func(p) { p.status == #pending });
  };

  public query ({ caller }) func verifyIcpPayment(
    txIndex : Nat,
    buyer : Principal,
    amountE8s : Nat,
  ) : async Bool {
    Runtime.trap("Business function not available");
  };

  public shared ({ caller }) func adminCreditPixelsForPurchase(
    txIndex : Nat,
    reason : Text
  ) : async { #ok : Nat; #err : Text } {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireAdminPermission(caller, accessControlState);

    switch (pixelPurchaseLog.get(txIndex)) {
      case (null) {
        return #err("purchase not found");
      };
      case (?p) {
        switch (p.status) {
          case (#credited) {
            return #err("already credited");
          };
          case (#pending) {
            let newBalance = Admin.adminCreditPixels(
              accessControlState,
              pixelBalances,
              caller,
              p.buyer,
              p.pixels,
              reason
            );
            let updatedPurchase : PixelPurchase = {
              txIndex = p.txIndex;
              buyer = p.buyer;
              pixels = p.pixels;
              amountE8s = p.amountE8s;
              createdAt = p.createdAt;
              status = #credited;
            };
            pixelPurchaseLog.add(txIndex, updatedPurchase);
            return #ok(newBalance);
          };
        };
      };
    };
  };

  public query ({ caller }) func getMyPendingPixelPurchases() : async [PixelPurchase] {
    Guards.requireUserPermission(caller, accessControlState);
    pixelPurchaseLog
      .values()
      .toArray()
      .filter(func(p) { p.buyer == caller and p.status == #pending });
  };
};
