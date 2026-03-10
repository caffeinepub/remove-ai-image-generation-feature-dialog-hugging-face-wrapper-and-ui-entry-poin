import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useLedgerAgent } from "@/hooks/useLedgerAgent";
import {
  canonicalAccountId,
  queryICPBalance,
  resolveRecipientToAccountId,
  transferICP,
} from "@/lib/ledger";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Format ICP amount for display
function formatICP(e8s: bigint): string {
  return (Number(e8s) / 100000000).toFixed(8);
}

// Parse ICP amount from string
function parseICP(icp: string): bigint {
  const amount = Number.parseFloat(icp);
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Invalid ICP amount");
  }
  return BigInt(Math.floor(amount * 100000000));
}

export function ProfileWallet() {
  const { identity } = useInternetIdentity();
  const { agent } = useLedgerAgent();
  const queryClient = useQueryClient();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principal = identity?.getPrincipal();

  // Derive canonical account identifier from principal
  const { data: accountId } = useQuery({
    queryKey: ["accountIdentifier", principal?.toString()],
    queryFn: async () => {
      if (!principal || principal.isAnonymous()) {
        throw new Error("No authenticated principal");
      }

      const accountIdentifier = canonicalAccountId(principal);

      console.log("[ProfileWallet] Canonical account ID derived:", {
        principal: principal.toString(),
        accountId: accountIdentifier,
      });

      return accountIdentifier;
    },
    enabled: !!principal && !principal.isAnonymous(),
    staleTime: Number.POSITIVE_INFINITY, // Account ID never changes for a given principal
  });

  // Query ICP balance using canonical account identifier
  const {
    data: balance,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["icpBalance", accountId],
    queryFn: async () => {
      if (!agent || !accountId) {
        throw new Error("Agent or account ID not available");
      }

      console.log(
        "[ProfileWallet] Querying balance for canonical account:",
        accountId,
      );
      const balanceE8s = await queryICPBalance(agent, accountId);
      console.log(
        "[ProfileWallet] Balance retrieved:",
        formatICP(balanceE8s),
        "ICP",
      );

      return balanceE8s;
    },
    enabled: !!agent && !!accountId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Transfer ICP mutation
  const transferMutation = useMutation({
    mutationFn: async ({
      toAccountId,
      amountE8s,
    }: { toAccountId: string; amountE8s: bigint }) => {
      if (!agent) {
        throw new Error("Agent not available");
      }

      console.log("[ProfileWallet] Initiating transfer:", {
        from: accountId,
        to: toAccountId,
        amount: formatICP(amountE8s),
      });

      const blockHeight = await transferICP(agent, toAccountId, amountE8s);

      console.log("[ProfileWallet] Transfer successful:", {
        blockHeight: blockHeight.toString(),
        from: accountId,
        to: toAccountId,
      });

      return blockHeight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icpBalance"] });
    },
  });

  const handleCopyPrincipal = () => {
    if (principal) {
      navigator.clipboard.writeText(principal.toString());
      toast.success("Principal copied to clipboard");
    }
  };

  const handleCopyAccountId = () => {
    if (accountId) {
      navigator.clipboard.writeText(accountId);
      toast.success("Account ID copied to clipboard");
    }
  };

  const handleSend = async () => {
    if (!accountId || !agent) {
      toast.error("Wallet not initialized");
      return;
    }

    if (!recipient.trim()) {
      toast.error("Please enter a recipient");
      return;
    }

    if (!amount.trim()) {
      toast.error("Please enter an amount");
      return;
    }

    // Resolve recipient to account ID (supports both principals and account IDs)
    let resolvedRecipientAccountId: string;

    try {
      resolvedRecipientAccountId = resolveRecipientToAccountId(recipient);
    } catch (err: any) {
      toast.error(err.message || "Invalid principal or account ID");
      return;
    }

    try {
      const amountE8s = parseICP(amount);
      const fee = BigInt(10000); // 0.0001 ICP

      if (amountE8s <= fee) {
        toast.error(
          "Amount must be greater than the transfer fee (0.0001 ICP)",
        );
        return;
      }

      if (balance && amountE8s + fee > balance) {
        toast.error("Insufficient balance for transfer including fee");
        return;
      }

      const blockHeight = await transferMutation.mutateAsync({
        toAccountId: resolvedRecipientAccountId,
        amountE8s,
      });

      toast.success(`ICP transfer successful! Block: ${blockHeight}`);
      setRecipient("");
      setAmount("");

      // Refetch balance after successful transfer
      setTimeout(() => refetchBalance(), 2000);
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Transfer failed");
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="rounded-sm border shadow-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-['Inter']">ICP Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 font-['Inter'] flex-1">
          <p className="text-xs text-muted-foreground">
            Please log in to access your ICP wallet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm border shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-['Inter']">ICP Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 font-['Inter'] flex-1">
        {/* Principal */}
        <div className="space-y-1.5">
          <Label className="text-xs">Your Principal</Label>
          <div className="flex gap-2">
            <Input
              value={principal?.toString() || ""}
              readOnly
              className="font-mono text-[9px] h-8"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyPrincipal}
              disabled={!principal}
              className="h-8 w-8 shrink-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Your unique Internet Identity principal
          </p>
        </div>

        {/* Account ID */}
        <div className="space-y-1.5">
          <Label className="text-xs">Account ID</Label>
          <div className="flex gap-2">
            <Input
              value={accountId || "Loading..."}
              readOnly
              className="font-mono text-[9px] h-8"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyAccountId}
              disabled={!accountId}
              className="h-8 w-8 shrink-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Your ICP ledger account identifier
          </p>
        </div>

        {/* Balance */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Balance</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchBalance()}
              disabled={isLoadingBalance || !accountId}
              className="h-6 text-[10px]"
            >
              {isLoadingBalance ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="text-xl font-bold">
            {isLoadingBalance
              ? "Loading..."
              : balance !== undefined
                ? `${formatICP(balance)} ICP`
                : "0.00000000 ICP"}
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Balance updates automatically every 10 seconds
          </p>
        </div>

        {/* Send ICP */}
        <div className="space-y-3 pt-3 border-t">
          <h3 className="text-xs font-semibold">Send ICP</h3>

          <div className="space-y-1.5">
            <Label htmlFor="recipient" className="text-xs">
              Recipient
            </Label>
            <Input
              id="recipient"
              placeholder="Principal or Account ID"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono text-[10px] h-8"
              disabled={transferMutation.isPending}
            />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Enter a principal or 64-char hex account ID
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs">
              Amount (ICP)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.00000001"
              min="0.0001"
              placeholder="0.00000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={transferMutation.isPending}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Fee: 0.0001 ICP
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={
              transferMutation.isPending || !recipient || !amount || !accountId
            }
            className="w-full h-8 text-xs"
          >
            {transferMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-3 w-3 mr-1.5" />
                Send ICP
              </>
            )}
          </Button>
        </div>

        {/* Receive ICP Info */}
        <div className="space-y-1.5 pt-3 border-t">
          <h3 className="text-xs font-semibold">Receive ICP</h3>
          <p className="text-[10px] text-muted-foreground leading-tight">
            To receive ICP, share your <strong>Principal</strong> or{" "}
            <strong>Account ID</strong> above with the sender. This wallet is{" "}
            <strong>non-custodial</strong> - all transactions are signed
            directly with your Internet Identity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
