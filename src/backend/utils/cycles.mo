import Cycles "mo:core/Cycles";
import Runtime "mo:core/Runtime";
import AccessControl "../authorization/access-control";
import Principal "mo:core/Principal";

module {
  public type CycleCheckResult = {
    #ok : Nat;
    #err : Text;
  };

  public type CycleTopUpResult = {
    #ok : Nat;
    #err : Text;
  };

  public type HealthStatus = {
    #ok;
    #low;
    #critical;
  };

  public type CycleInfo = {
    balance : Nat;
    healthStatus : HealthStatus;
  };

  public func getCanisterCycles(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    _cyclesThresholds : { ok : Nat; low : Nat; critical : Nat },
  ) : CycleCheckResult {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can check canister cycles");
    };

    let balance = Cycles.balance();
    #ok(balance);
  };

  public func getCanisterHealthStatus(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    cyclesThresholds : { ok : Nat; low : Nat; critical : Nat },
  ) : HealthStatus {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can check canister health status");
    };

    let balance = Cycles.balance();

    if (balance > cyclesThresholds.ok) {
      #ok;
    } else if (balance > cyclesThresholds.low) {
      #low;
    } else { #critical };
  };

  public func getCanisterCycleInfo(
    caller : Principal,
    accessControlState : AccessControl.AccessControlState,
    cyclesThresholds : { ok : Nat; low : Nat; critical : Nat },
  ) : ?CycleInfo {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can check canister cycle info");
    };

    let balance = Cycles.balance();
    let status = if (balance > cyclesThresholds.ok) {
      #ok;
    } else if (balance > cyclesThresholds.low) {
      #low;
    } else { #critical };

    ?{
      balance;
      healthStatus = status;
    };
  };

  public func topUpCanisterCycles(
    caller : Principal,
    amount : Nat,
    accessControlState : AccessControl.AccessControlState,
    _cyclesThresholds : { ok : Nat; low : Nat; critical : Nat },
  ) : CycleTopUpResult {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can top up canister cycles");
    };

    if (amount == 0) {
      return #err("Invalid amount - zero top ups not allowed");
    };

    #ok(amount);
  };
};
