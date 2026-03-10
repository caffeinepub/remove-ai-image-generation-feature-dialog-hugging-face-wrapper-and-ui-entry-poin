import AccessControl "../authorization/access-control";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

module {
  public func ensureCallerRegistered(caller : Principal, accessControlState : AccessControl.AccessControlState) {
    if (caller.isAnonymous()) {
      return;
    };
    AccessControl.initialize(accessControlState, caller);
  };

  public func checkBannedUser(caller : Principal, bannedUsers : Map.Map<Principal, Bool>) {
    if (bannedUsers.get(caller) == ?true) {
      Runtime.trap("User is banned");
    };
  };

  public func requireUserPermission(caller : Principal, accessControlState : AccessControl.AccessControlState) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
  };

  public func requireAdminPermission(caller : Principal, accessControlState : AccessControl.AccessControlState) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
  };
};
