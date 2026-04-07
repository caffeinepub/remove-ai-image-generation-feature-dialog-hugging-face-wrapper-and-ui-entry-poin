// createActorWithConfig is called by ActorContext with a pre-built HttpAgent.
// It wires the agent to the backend canister using the generated IDL factory.
import { Actor, type HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./declarations/backend.did";
import type { backendInterface } from "./backend";

const CANISTER_ID: string =
  // injected by vite-plugin-environment at build time
  (typeof process !== "undefined" && (process.env as Record<string, string>).CANISTER_BACKEND) ||
  // fallback for local dev without env
  "ueo2d-raaaa-aaaaj-a2uuq-cai";

export function createActorWithConfig(agent: HttpAgent): backendInterface {
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  }) as unknown as backendInterface;
}
