import Map "mo:core/Map";
import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

module {
  public type OwnedCanister = {
    canisterId : Principal;
    owner : Principal;
    userName : Text;
    created : Time.Time;
    modified : Time.Time;
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
    ownedCanisters.values().toArray().filter(func(c) { c.owner == user });
  };

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
};
