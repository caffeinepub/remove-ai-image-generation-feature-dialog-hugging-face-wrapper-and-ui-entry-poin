import { Actor, type HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// ICP Ledger canister ID on mainnet
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const TRANSFER_FEE_E8S = BigInt(10000); // 0.0001 ICP

// Ledger types
export type Subaccount = Uint8Array;
export type Memo = bigint;

export interface TransferArgs {
  to: Uint8Array;
  fee: { e8s: bigint };
  memo: bigint;
  from_subaccount: Uint8Array[];
  created_at_time: { timestamp_nanos: bigint }[];
  amount: { e8s: bigint };
}

export interface TransferResult {
  Ok?: bigint;
  Err?: TransferError;
}

export interface TransferError {
  BadFee?: { expected_fee: { e8s: bigint } };
  InsufficientFunds?: { balance: { e8s: bigint } };
  TxTooOld?: { allowed_window_nanos: bigint };
  TxCreatedInFuture?: null;
  TxDuplicate?: { duplicate_of: bigint };
}

export interface AccountBalanceArgs {
  account: Uint8Array;
}

// ICRC-1 types
export interface ICRC1Account {
  owner: Principal;
  subaccount: Uint8Array[];
}

export interface ICRC1TransferArg {
  from_subaccount: Uint8Array[];
  to: ICRC1Account;
  amount: bigint;
  fee: bigint[];
  memo: Uint8Array[];
  created_at_time: bigint[];
}

export interface ICRC1TransferResult {
  Ok?: bigint;
  Err?: ICRC1TransferError;
}

export interface ICRC1TransferError {
  BadFee?: { expected_fee: bigint };
  BadBurn?: { min_burn_amount: bigint };
  InsufficientFunds?: { balance: bigint };
  TooOld?: null;
  CreatedInFuture?: { ledger_time: bigint };
  Duplicate?: { duplicate_of: bigint };
  TemporarilyUnavailable?: null;
  GenericError?: { error_code: bigint; message: string };
}

// IDL for ICP Ledger
const ledgerIdl = ({ IDL }: any) => {
  const Tokens = IDL.Record({ e8s: IDL.Nat64 });
  const Timestamp = IDL.Record({ timestamp_nanos: IDL.Nat64 });
  const AccountIdentifier = IDL.Vec(IDL.Nat8);
  const SubAccount = IDL.Vec(IDL.Nat8);
  const Memo = IDL.Nat64;

  const TransferArgs = IDL.Record({
    to: AccountIdentifier,
    fee: Tokens,
    memo: Memo,
    from_subaccount: IDL.Opt(SubAccount),
    created_at_time: IDL.Opt(Timestamp),
    amount: Tokens,
  });

  const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: Tokens }),
    InsufficientFunds: IDL.Record({ balance: Tokens }),
    TxTooOld: IDL.Record({ allowed_window_nanos: IDL.Nat64 }),
    TxCreatedInFuture: IDL.Null,
    TxDuplicate: IDL.Record({ duplicate_of: IDL.Nat64 }),
  });

  const TransferResult = IDL.Variant({
    Ok: IDL.Nat64,
    Err: TransferError,
  });

  const AccountBalanceArgs = IDL.Record({
    account: AccountIdentifier,
  });

  return IDL.Service({
    account_balance: IDL.Func([AccountBalanceArgs], [Tokens], ["query"]),
    transfer: IDL.Func([TransferArgs], [TransferResult], []),
  });
};

// IDL for ICRC-1 Ledger
const icrc1LedgerIdl = ({ IDL }: any) => {
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(Subaccount),
  });

  const TransferArg = IDL.Record({
    from_subaccount: IDL.Opt(Subaccount),
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });

  const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({
      error_code: IDL.Nat,
      message: IDL.Text,
    }),
  });

  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  });

  return IDL.Service({
    icrc1_transfer: IDL.Func([TransferArg], [TransferResult], []),
  });
};

/**
 * Pure TypeScript SHA-256/SHA-224 implementation with custom IVs
 * Based on FIPS 180-4 specification
 */
function sha256WithIV(data: Uint8Array, ivWords: number[]): Uint8Array {
  // SHA-256 constants
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  // Initial hash values (can be customized for SHA-224)
  let H0 = ivWords[0];
  let H1 = ivWords[1];
  let H2 = ivWords[2];
  let H3 = ivWords[3];
  let H4 = ivWords[4];
  let H5 = ivWords[5];
  let H6 = ivWords[6];
  let H7 = ivWords[7];

  // Pre-processing: adding padding bits
  const msgLen = data.length;
  const bitLen = msgLen * 8;

  // Calculate padded length (must be multiple of 64 bytes)
  const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);

  // Append '1' bit (0x80)
  padded[msgLen] = 0x80;

  // Append length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, (bitLen / 0x100000000) >>> 0, false);

  // Process message in 512-bit chunks
  const W = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }

    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    // Initialize working variables
    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    // Main loop
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Add compressed chunk to current hash value
    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  // Produce final hash value (big-endian)
  const hash = new Uint8Array(32);
  const hashView = new DataView(hash.buffer);
  hashView.setUint32(0, H0, false);
  hashView.setUint32(4, H1, false);
  hashView.setUint32(8, H2, false);
  hashView.setUint32(12, H3, false);
  hashView.setUint32(16, H4, false);
  hashView.setUint32(20, H5, false);
  hashView.setUint32(24, H6, false);
  hashView.setUint32(28, H7, false);

  return hash;
}

/**
 * Right rotate helper function
 */
function rotr(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

/**
 * SHA-224 hash implementation
 * SHA-224 uses different initial hash values than SHA-256 and outputs 28 bytes (7 words)
 * Reference: FIPS 180-4 Section 5.3.2
 */
function sha224(data: Uint8Array): Uint8Array {
  // SHA-224 initial hash values (different from SHA-256)
  const sha224IVs = [
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511,
    0x64f98fa7, 0xbefa4fa4,
  ];

  const hash256 = sha256WithIV(data, sha224IVs);
  // SHA-224 outputs the first 7 words (28 bytes)
  return hash256.slice(0, 28);
}

/**
 * CRC32 checksum implementation
 * Uses the standard CRC32 polynomial (0xEDB88320)
 */
function crc32(data: Uint8Array): Uint8Array {
  const CRC32_POLY = 0xedb88320;
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ CRC32_POLY : crc >>> 1;
    }
  }

  crc = crc ^ 0xffffffff;

  // Convert to big-endian 4-byte array
  return new Uint8Array([
    (crc >> 24) & 0xff,
    (crc >> 16) & 0xff,
    (crc >> 8) & 0xff,
    crc & 0xff,
  ]);
}

/**
 * Canonical account identifier derivation for ICP ledger.
 *
 * This is the single source of truth for converting a principal to an account identifier.
 * It implements the official DFINITY specification:
 *
 * account_identifier = CRC32(h) || h
 * where h = SHA224("\x0A" || "account-id" || principal || subaccount)
 *
 * This produces a 32-byte account identifier (4 bytes CRC32 + 28 bytes SHA224)
 * that matches the ICP Dashboard and ledger canister expectations exactly.
 *
 * Reference: https://internetcomputer.org/docs/references/ledger#_account_identifier
 *
 * @param principal - The principal to convert
 * @returns Hex string representation of the account identifier (64 characters)
 */
export function canonicalAccountId(principal: Principal): string {
  // Use 32-byte zero subaccount (default subaccount)
  const subaccount = new Uint8Array(32);

  // Build the data to hash: "\x0A" + "account-id" + principal + subaccount
  const principalBytes = principal.toUint8Array();

  // Domain separator: byte 0x0A followed by ASCII "account-id"
  const domainSeparator = new Uint8Array([0x0a]);
  const accountIdString = new TextEncoder().encode("account-id");

  const data = new Uint8Array(
    domainSeparator.length +
      accountIdString.length +
      principalBytes.length +
      subaccount.length,
  );

  let offset = 0;
  data.set(domainSeparator, offset);
  offset += domainSeparator.length;
  data.set(accountIdString, offset);
  offset += accountIdString.length;
  data.set(principalBytes, offset);
  offset += principalBytes.length;
  data.set(subaccount, offset);

  // Compute SHA-224 hash
  const hash = sha224(data);

  // Compute CRC32 checksum of the hash
  const checksum = crc32(hash);

  // Concatenate: CRC32(hash) || hash
  const accountIdentifier = new Uint8Array(32);
  accountIdentifier.set(checksum, 0);
  accountIdentifier.set(hash, 4);

  // Convert to hex string
  return Array.from(accountIdentifier)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Dev-only runtime assertion to verify correct SHA-224 implementation
if (import.meta.env.DEV) {
  const testPrincipal = Principal.fromText(
    "qed3y-ibcj7-nfsh6-6wmee-oorik-oitj5-oj6fl-n7k4l-y4clp-dkbee-kae",
  );
  const expectedAccountId =
    "0f05f83fb167a711cab91132955a5ce48ed92673bfcd69f5861991e727926f4f";
  const actualAccountId = canonicalAccountId(testPrincipal);

  if (actualAccountId !== expectedAccountId) {
    throw new Error(
      `SHA-224 implementation verification failed!\nExpected: ${expectedAccountId}\nActual:   ${actualAccountId}`,
    );
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(stripped.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(stripped.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Validate if a string is a valid principal format
 * Principals contain dashes and end with a checksum
 */
function isPrincipalFormat(input: string): boolean {
  // Principal format: groups of alphanumeric characters separated by dashes
  // Example: aaaaa-bbb-ccc-ddd-eee
  return input.includes("-") && /^[a-z0-9-]+$/.test(input);
}

/**
 * Validate if a string is a valid 64-character hexadecimal account ID
 */
function isAccountIdFormat(input: string): boolean {
  const stripped = input.startsWith("0x") ? input.slice(2) : input;

  if (stripped.length !== 64) {
    return false;
  }

  return /^[0-9a-fA-F]{64}$/.test(stripped);
}

/**
 * Resolve recipient input to account ID.
 * Accepts either:
 * - Internet Identity principal (e.g., "aaaaa-bbb-ccc-ddd-eee")
 * - 64-character hexadecimal account ID (with or without "0x" prefix)
 *
 * @param input - Principal or account ID string
 * @returns Lowercase hex account ID (64 characters, no prefix)
 * @throws Error if input is invalid
 */
export function resolveRecipientToAccountId(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Recipient cannot be empty");
  }

  // Check if it's a principal format
  if (isPrincipalFormat(trimmed)) {
    try {
      const principal = Principal.fromText(trimmed);
      return canonicalAccountId(principal);
    } catch (_error) {
      throw new Error("Invalid principal format");
    }
  }

  // Check if it's an account ID format
  if (isAccountIdFormat(trimmed)) {
    // Remove 0x prefix if present and return lowercase
    const stripped = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    return stripped.toLowerCase();
  }

  // If neither format matches, provide helpful error
  throw new Error(
    "Invalid recipient format. Please enter either:\n" +
      "• A principal (e.g., aaaaa-bbb-ccc-ddd-eee)\n" +
      "• A 64-character hex account ID",
  );
}

/**
 * Query ICP balance for an account identifier
 * Uses the authenticated identity from the HttpAgent
 */
export async function queryICPBalance(
  agent: HttpAgent,
  accountId: string,
): Promise<bigint> {
  const ledgerActor = Actor.createActor(ledgerIdl, {
    agent,
    canisterId: ICP_LEDGER_CANISTER_ID,
  });

  const accountBytes = hexToBytes(accountId);
  const result: any = await ledgerActor.account_balance({
    account: accountBytes,
  });

  return result.e8s;
}

/**
 * Transfer ICP to another account
 * Uses the authenticated identity from the HttpAgent
 */
export async function transferICP(
  agent: HttpAgent,
  toAccountId: string,
  amountE8s: bigint,
  memo?: bigint,
): Promise<bigint> {
  const ledgerActor = Actor.createActor(ledgerIdl, {
    agent,
    canisterId: ICP_LEDGER_CANISTER_ID,
  });

  const toBytes = hexToBytes(toAccountId);

  // Use empty arrays for optional fields (not undefined)
  const transferArgs = {
    to: toBytes,
    fee: { e8s: TRANSFER_FEE_E8S },
    memo: memo || BigInt(0),
    from_subaccount: [], // Empty array for no subaccount
    created_at_time: [], // Empty array for no timestamp
    amount: { e8s: amountE8s },
  };

  const result: any = await ledgerActor.transfer(transferArgs);

  if ("Ok" in result) {
    return result.Ok;
  }
  if ("Err" in result) {
    const err = result.Err;
    if ("BadFee" in err) {
      throw new Error(`Bad fee - expected: ${err.BadFee.expected_fee.e8s} e8s`);
    }
    if ("InsufficientFunds" in err) {
      throw new Error(
        `Insufficient funds - balance: ${err.InsufficientFunds.balance.e8s} e8s`,
      );
    }
    if ("TxTooOld" in err) {
      throw new Error("Transaction too old");
    }
    if ("TxCreatedInFuture" in err) {
      throw new Error("Transaction created in future");
    }
    if ("TxDuplicate" in err) {
      throw new Error(
        `Duplicate transaction - block: ${err.TxDuplicate.duplicate_of}`,
      );
    }
    throw new Error("Transfer failed with unknown error");
  }
  throw new Error("Unexpected transfer result format");
}

/**
 * Transfer ICP directly to a principal using ICRC-1 standard.
 * This function uses the icrc1_transfer method which accepts principals directly
 * without requiring account identifier conversion.
 *
 * @param agent - HttpAgent with authenticated identity
 * @param toPrincipal - Target principal to receive ICP
 * @param amountE8s - Amount to transfer in e8s (1 ICP = 100,000,000 e8s)
 * @returns Transaction index (block height) as bigint
 * @throws Error if transfer fails
 */
export async function icrc1TransferToPrincipal(
  agent: HttpAgent,
  toPrincipal: Principal,
  amountE8s: bigint,
): Promise<bigint> {
  const ledgerActor = Actor.createActor(icrc1LedgerIdl, {
    agent,
    canisterId: ICP_LEDGER_CANISTER_ID,
  });

  const transferArg: ICRC1TransferArg = {
    from_subaccount: [], // No subaccount
    to: {
      owner: toPrincipal,
      subaccount: [], // Default subaccount
    },
    amount: amountE8s,
    fee: [], // Let ledger use default fee
    memo: [], // No memo
    created_at_time: [], // No timestamp
  };

  const result: any = await ledgerActor.icrc1_transfer(transferArg);

  if ("Ok" in result) {
    return result.Ok;
  }
  if ("Err" in result) {
    const err = result.Err;
    if ("BadFee" in err) {
      throw new Error(`Bad fee - expected: ${err.BadFee.expected_fee} e8s`);
    }
    if ("BadBurn" in err) {
      throw new Error(
        `Bad burn - min amount: ${err.BadBurn.min_burn_amount} e8s`,
      );
    }
    if ("InsufficientFunds" in err) {
      throw new Error(
        `Insufficient funds - balance: ${err.InsufficientFunds.balance} e8s`,
      );
    }
    if ("TooOld" in err) {
      throw new Error("Transaction too old");
    }
    if ("CreatedInFuture" in err) {
      throw new Error(
        `Transaction created in future - ledger time: ${err.CreatedInFuture.ledger_time}`,
      );
    }
    if ("Duplicate" in err) {
      throw new Error(
        `Duplicate transaction - block: ${err.Duplicate.duplicate_of}`,
      );
    }
    if ("TemporarilyUnavailable" in err) {
      throw new Error("Ledger temporarily unavailable");
    }
    if ("GenericError" in err) {
      throw new Error(
        `Transfer failed: ${err.GenericError.message} (code: ${err.GenericError.error_code})`,
      );
    }
    throw new Error("Transfer failed with unknown error");
  }
  throw new Error("Unexpected transfer result format");
}
