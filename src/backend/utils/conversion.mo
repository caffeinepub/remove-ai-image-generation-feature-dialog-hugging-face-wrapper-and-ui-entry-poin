import Blob "mo:core/Blob";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
  public func principalToAccountIdentifier(principal : Principal) : Blob {
    let principalBlob = principal.toBlob();
    let subaccount : [Nat8] = Array.tabulate(32, func(_ : Nat) : Nat8 { 0 });
    let combined = Blob.fromArray(
      principalBlob.toArray().concat(subaccount)
    );
    combined;
  };

  public func isValidAccountIdentifier(accountId : Text) : Bool {
    let stripped = if (accountId.startsWith(#text "0x")) {
      let chars = accountId.chars();
      let _ = chars.next();
      let _ = chars.next();
      Text.fromIter(chars);
    } else {
      accountId;
    };
    if (stripped.size() != 64) {
      return false;
    };
    for (char in stripped.chars()) {
      let isHex = (char >= '0' and char <= '9') or
        (char >= 'a' and char <= 'f') or
        (char >= 'A' and char <= 'F');
      if (not isHex) {
        return false;
      };
    };
    true;
  };

  public func hexToBlob(hex : Text) : ?Blob {
    let stripped = if (hex.startsWith(#text "0x")) {
      let chars = hex.chars();
      let _ = chars.next();
      let _ = chars.next();
      Text.fromIter(chars);
    } else {
      hex;
    };
    if (stripped.size() % 2 != 0) {
      return null;
    };
    var bytes : [Nat8] = [];
    let chars = stripped.chars();
    label parsing loop {
      switch (chars.next()) {
        case null { break parsing };
        case (?c1) {
          switch (chars.next()) {
            case null { return null };
            case (?c2) {
              let byte = hexCharToNat8(c1, c2);
              switch (byte) {
                case null { return null };
                case (?b) {
                  bytes := bytes.concat([b]);
                };
              };
            };
          };
        };
      };
    };
    ?Blob.fromArray(bytes);
  };

  public func hexCharToNat8(c1 : Char, c2 : Char) : ?Nat8 {
    let n1 = charToNat(c1);
    let n2 = charToNat(c2);
    switch (n1, n2) {
      case (?v1, ?v2) {
        ?(Nat8.fromNat(v1 * 16 + v2));
      };
      case (_n1, null) { null };
      case (null, _n2) { null };
    };
  };

  public func charToNat(c : Char) : ?Nat {
    if (c >= '0' and c <= '9') {
      ?(Nat32.toNat(Char.toNat32(c) - Char.toNat32('0')));
    } else if (c >= 'a' and c <= 'f') {
      ?(Nat32.toNat(Char.toNat32(c) - Char.toNat32('a') + 10));
    } else if (c >= 'A' and c <= 'F') {
      ?(Nat32.toNat(Char.toNat32(c) - Char.toNat32('A') + 10));
    } else {
      null;
    };
  };
};
