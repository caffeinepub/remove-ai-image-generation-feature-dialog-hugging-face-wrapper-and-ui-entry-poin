export const idlFactory = ({ IDL }) => {
  const Time = IDL.Int;
  const OwnedCanister = IDL.Record({
    'userName' : IDL.Text,
    'created' : Time,
    'modified' : Time,
    'owner' : IDL.Principal,
    'canisterId' : IDL.Principal,
  });
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const AccountIdentifier = IDL.Vec(IDL.Nat8);
  const ProjectResult = IDL.Variant({
    'ok' : IDL.Text,
    'err' : IDL.Text,
  });
  const UserPersonalInfo = IDL.Record({
    'name' : IDL.Text,
    'email' : IDL.Text,
    'additional' : IDL.Opt(IDL.Text),
  });
  const Tokens = IDL.Record({ 'e8s' : IDL.Nat64 });
  const CycleTopUpResult = IDL.Variant({
    'ok' : IDL.Nat,
    'err' : IDL.Text,
  });
  const HealthStatus = IDL.Variant({
    'ok' : IDL.Null,
    'low' : IDL.Null,
    'critical' : IDL.Null,
  });
  const CycleInfo = IDL.Record({
    'balance' : IDL.Nat,
    'healthStatus' : HealthStatus,
  });
  const CycleCheckResult = IDL.Variant({
    'ok' : IDL.Nat,
    'err' : IDL.Text,
  });
  const ProjectMetadata = IDL.Record({
    'created' : Time,
    'modified' : Time,
    'name' : IDL.Text,
    'size' : IDL.Nat,
    'version' : IDL.Nat,
  });
  const Project = IDL.Record({
    'id' : IDL.Text,
    'owner' : IDL.Principal,
    'metadata' : ProjectMetadata,
    'data' : IDL.Vec(IDL.Nat8),
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  return IDL.Service({
    'addOwnedCustomer' : IDL.Func([OwnedCanister], [], []),
    'adminBanUser' : IDL.Func([IDL.Principal], [], []),
    'adminCreditPixels' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Text],
        [IDL.Nat],
        [],
      ),
    'adminRemovePixels' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Text],
        [IDL.Nat],
        [],
      ),
    'adminUnbanUser' : IDL.Func([IDL.Principal], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'claimPixels' : IDL.Func(
        [IDL.Nat, IDL.Nat, AccountIdentifier],
        [IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text })],
        [],
      ),
    'claimPixelsSimple' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text })],
        [],
      ),
    'deleteProject' : IDL.Func([IDL.Text], [ProjectResult], []),
    'getAdminUserOverview' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Record({
              'principal' : IDL.Principal,
              'name' : IDL.Opt(IDL.Text),
              'email' : IDL.Opt(IDL.Text),
              'pixels' : IDL.Nat,
            })
          ),
        ],
        ['query'],
      ),
    'getAllUserPixelBalances' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat))],
        ['query'],
      ),
    'getAllUsersPersonalInfo' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserPersonalInfo))],
        [],
      ),
    'getAllUsersWithPersonalInfo' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserPersonalInfo))],
        [],
      ),
    'getCallerAccountIdentifier' : IDL.Func([], [IDL.Text], []),
    'getCallerICPBalance' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Nat64, 'err' : IDL.Text })],
        [],
      ),
    'getCallerPixelBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'getCallerPrincipal' : IDL.Func([], [IDL.Principal], []),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], []),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCanisterCycleInfo' : IDL.Func([], [IDL.Opt(CycleInfo)], []),
    'getCanisterCycles' : IDL.Func([], [CycleCheckResult], []),
    'getCanisterHealthStatus' : IDL.Func([], [HealthStatus], []),
    'getCurrentEra' : IDL.Func([], [IDL.Text], ['query']),
    'getEditorVisitCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getOwnedCustomerByCanister' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(OwnedCanister)],
        ['query'],
      ),
    'getOwnedCustomersByUser' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(OwnedCanister)],
        ['query'],
      ),
    'getOwnedCustomersForCaller' : IDL.Func(
        [],
        [IDL.Vec(OwnedCanister)],
        [],
      ),
    'getPersonalInfo' : IDL.Func([], [IDL.Opt(UserPersonalInfo)], []),
    'getPixelPrice' : IDL.Func([], [IDL.Nat64], ['query']),
    'getProject' : IDL.Func([IDL.Text], [IDL.Opt(Project)], []),
    'getRealBackendCycleInfo' : IDL.Func([], [IDL.Opt(CycleInfo)], []),
    'getRealFrontendCycleInfo' : IDL.Func([], [IDL.Opt(CycleInfo)], []),
    'getTotalPixelsSold' : IDL.Func([], [IDL.Nat], ['query']),
    'getTotalProjectCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getUserPersonalInfo' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserPersonalInfo)],
        ['query'],
      ),
    'getUserPixelBalance' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getUserProjectCount' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getUsersByName' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserPersonalInfo))],
        [],
      ),
    'getUsersWithCompleteInfo' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserPersonalInfo))],
        [],
      ),
    'initializeAccessControl' : IDL.Func([], [], []),
    'initializeDemoUserProfile' : IDL.Func([IDL.Text], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'isUserBanned' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'listAllKnownUsers' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listAllUsers' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listAllUsersWithPersonalInfo' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserPersonalInfo))],
        ['query'],
      ),
    'listOwnedCustomers' : IDL.Func([], [IDL.Vec(OwnedCanister)], []),
    'listProjects' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, ProjectMetadata))],
        [],
      ),
    'newProject' : IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [ProjectResult], []),
    'recordEditorVisit' : IDL.Func([], [], []),
    'removeOwnedCustomer' : IDL.Func([IDL.Principal], [], []),
    'requestControllerAccess' : IDL.Func([], [IDL.Text], []),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'savePersonalInfo' : IDL.Func([UserPersonalInfo], [], []),
    'searchUsersByEmail' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserPersonalInfo))],
        [],
      ),
    'setCurrentEra' : IDL.Func([IDL.Text], [], []),
    'setCyclesThresholds' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [], []),
    'topUpCanisterCycles' : IDL.Func([IDL.Nat], [CycleTopUpResult], []),
    'topUpFrontendCanisterCycles' : IDL.Func(
        [IDL.Nat],
        [CycleTopUpResult],
        [],
      ),
    'transferICP' : IDL.Func(
        [AccountIdentifier, IDL.Nat64, IDL.Opt(IDL.Nat64)],
        [IDL.Variant({ 'ok' : IDL.Nat64, 'err' : IDL.Text })],
        [],
      ),
    'updateOwnedCustomer' : IDL.Func(
        [IDL.Principal, OwnedCanister],
        [],
        [],
      ),
    'updatePersonalInfo' : IDL.Func(
        [
          IDL.Record({
            'name' : IDL.Text,
            'email' : IDL.Text,
            'additional' : IDL.Opt(IDL.Text),
          }),
        ],
        [IDL.Text],
        [],
      ),
    'updateProject' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8)],
        [ProjectResult],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
