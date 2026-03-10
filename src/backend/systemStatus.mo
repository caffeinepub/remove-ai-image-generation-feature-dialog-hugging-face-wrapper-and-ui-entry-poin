import AccessControl "authorization/access-control";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Guards "utils/guards";
import Principal "mo:core/Principal";

module {
  // Validates that the caller is authorized to record an editor visit
  // Returns () on success, traps on authorization failure
  public func recordEditorVisit(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    bannedUsers : Map.Map<Principal, Bool>,
  ) {
    Guards.ensureCallerRegistered(caller, accessControlState);
    Guards.checkBannedUser(caller, bannedUsers);

    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can record editor visits");
    };
  };
};
