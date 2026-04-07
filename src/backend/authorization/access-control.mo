import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

module {
  // Role hierarchy: guest < user < admin
  public type UserRole = {
    #guest;
    #user;
    #admin;
  };

  // Mutable state object — fields are accessed directly by main.mo for
  // preupgrade/postupgrade serialisation and admin bootstrapping.
  public type AccessControlState = {
    userRoles : Map.Map<Principal, UserRole>;
    var adminAssigned : Bool;
  };

  /// Create a fresh, empty access-control state.
  public func initState() : AccessControlState {
    {
      userRoles = Map.empty<Principal, UserRole>();
      var adminAssigned = false;
    };
  };

  /// Register a caller as #user if they have no role yet.
  /// Anonymous principals are silently skipped.
  public func initialize(state : AccessControlState, caller : Principal) {
    if (caller.isAnonymous()) { return };
    switch (state.userRoles.get(caller)) {
      case (?_) {}; // already registered — leave role unchanged
      case null {
        state.userRoles.add(caller, #user);
      };
    };
  };

  /// Return the role for a principal (#guest when unknown / anonymous).
  public func getUserRole(state : AccessControlState, principal : Principal) : UserRole {
    if (principal.isAnonymous()) { return #guest };
    switch (state.userRoles.get(principal)) {
      case (?role) { role };
      case null { #guest };
    };
  };

  /// True if `principal` holds the #admin role.
  public func isAdmin(state : AccessControlState, principal : Principal) : Bool {
    getUserRole(state, principal) == #admin;
  };

  /// Check whether `caller` meets the minimum permission level for `requiredRole`.
  /// Role order: guest(0) < user(1) < admin(2).
  public func hasPermission(
    state : AccessControlState,
    caller : Principal,
    requiredRole : UserRole,
  ) : Bool {
    let callerRole = getUserRole(state, caller);
    roleLevel(callerRole) >= roleLevel(requiredRole);
  };

  /// Assign a role to `user`.  Only admins may call this.
  public func assignRole(
    state : AccessControlState,
    caller : Principal,
    user : Principal,
    role : UserRole,
  ) {
    if (not hasPermission(state, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    state.userRoles.add(user, role);
  };

  // ── Internal helpers ────────────────────────────────────────────────────────

  private func roleLevel(role : UserRole) : Nat {
    switch (role) {
      case (#guest) { 0 };
      case (#user)  { 1 };
      case (#admin) { 2 };
    };
  };
};
