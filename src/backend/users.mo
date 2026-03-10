import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Runtime "mo:core/Runtime";
import Guards "utils/guards";
import Array "mo:core/Array";

module {
  public type UserPersonalInfo = {
    name : Text;
    email : Text;
    additional : ?Text;
  };

  public type UserProfile = {
    name : Text;
  };

  public func savePersonalInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
    personalInfo : UserPersonalInfo,
  ) : () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    if (not personalInfo.email.contains(#char '@')) {
      Runtime.trap("Invalid email address format");
    };

    userPersonalInfo.add(caller, personalInfo);
  };

  public func getPersonalInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
  ) : ?UserPersonalInfo {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    userPersonalInfo.get(caller);
  };

  public func saveCallerUserProfile(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userProfiles : Map.Map<Principal, UserProfile>,
    profile : UserProfile,
  ) : () {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    userProfiles.add(caller, profile);
  };

  public func getCallerUserProfile(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userProfiles : Map.Map<Principal, UserProfile>,
  ) : ?UserProfile {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    Guards.requireUserPermission(caller, accessControlState);

    userProfiles.get(caller);
  };

  public func getUserPersonalInfo(
    caller : Principal,
    user : Principal,
    accessControlState : AccessControl.AccessControlState,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
  ) : ?UserPersonalInfo {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own personal info");
    };

    userPersonalInfo.get(user);
  };

  public func getUserProfile(
    caller : Principal,
    user : Principal,
    accessControlState : AccessControl.AccessControlState,
    userProfiles : Map.Map<Principal, UserProfile>,
  ) : ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };

    userProfiles.get(user);
  };

  public func getAllUsersWithPersonalInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
  ) : [(Principal, UserPersonalInfo)] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireAdminPermission(caller, accessControlState);

    userPersonalInfo.toArray();
  };

  public func getUsersWithCompleteInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
  ) : [(Principal, UserPersonalInfo)] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireAdminPermission(caller, accessControlState);

    userPersonalInfo.toArray().filter(
      func(entry) {
        entry.1.name != "" and entry.1.email != "";
      }
    );
  };

  public func getUsersByName(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
    name : Text,
  ) : [(Principal, UserPersonalInfo)] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireAdminPermission(caller, accessControlState);

    userPersonalInfo.toArray().filter(
      func(entry) { entry.1.name == name }
    );
  };

  public func searchUsersByEmail(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
    email : Text,
  ) : [(Principal, UserPersonalInfo)] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireAdminPermission(caller, accessControlState);

    userPersonalInfo.toArray().filter(
      func(entry) { entry.1.email == email }
    );
  };

  public func listAllUsersWithPersonalInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
    userPersonalInfo : Map.Map<Principal, UserPersonalInfo>,
  ) : [(Principal, UserPersonalInfo)] {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);
    Guards.requireAdminPermission(caller, accessControlState);

    userPersonalInfo.toArray();
  };
};
