import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_PRINCIPAL, PIXEL_PRICE_E8S } from "@/constants";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useLedgerAgent } from "@/hooks/useLedgerAgent";
import { useGetCurrentEra } from "@/hooks/useQueries";
import { icrc1TransferToPrincipal } from "@/lib/ledger";
import { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GetPixelsDialogCloudProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GetPixelsDialogCloud({
  open,
  onOpenChange,
}: GetPixelsDialogCloudProps) {
  const { actor } = useActor();
  const { agent } = useLedgerAgent();
  const { identity } = useInternetIdentity();
  const { data: currentEra } = useGetCurrentEra();
  const queryClient = useQueryClient();

  const [pixels, setPixels] = useState<string>("100");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const era = currentEra || "Alpha";
  const pixelAmountNum = Number.parseInt(pixels) || 0;
  const pixelAmount = BigInt(pixelAmountNum);
  const costICP = (Number(PIXEL_PRICE_E8S) * pixelAmountNum) / 100_000_000;

  const handleClose = () => {
    if (!isProcessing) {
      setPixels("100");
      setError(null);
      onOpenChange(false);
    }
  };

  const handlePurchase = async () => {
    if (!actor || !agent || !identity) {
      setError("System not ready. Please try again.");
      return;
    }

    if (pixelAmountNum <= 0) {
      setError("Please enter a valid pixel amount.");
      return;
    }

    if (pixelAmountNum > 1000) {
      setError("Maximum 1,000 pixels per purchase.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Get caller's principal
      const callerPrincipal = identity.getPrincipal();

      console.log("[GetPixelsDialogCloud] Purchase initiated:", {
        principal: callerPrincipal.toString(),
        pixels: pixelAmountNum,
      });

      // Step 2: Compute amount in e8s
      const amountE8s = pixelAmount * PIXEL_PRICE_E8S;

      // Step 3: Transfer ICP to admin principal using ICRC-1
      const adminPrincipal = Principal.fromText(ADMIN_PRINCIPAL);
      const txIndex = await icrc1TransferToPrincipal(
        agent,
        adminPrincipal,
        amountE8s,
      );

      console.log("[GetPixelsDialogCloud] Transfer successful:", {
        txIndex: txIndex.toString(),
        amount: amountE8s.toString(),
      });

      // Step 4: Record purchase for manual admin approval (no auto-minting)
      const txIndexNat = txIndex;
      const pixelsNat = BigInt(pixels);

      const recordRes = await actor.recordPixelPurchase(
        txIndexNat,
        pixelsNat,
        amountE8s,
      );

      if ("err" in recordRes) {
        console.warn("Failed to record purchase:", recordRes.err);
        // Continue anyway - payment was successful
      } else {
        console.log("[GetPixelsDialogCloud] Purchase recorded successfully");

        // Invalidate React Query cache immediately after successful recording
        queryClient.invalidateQueries({
          queryKey: ["myPendingPixelPurchases"],
        });
        queryClient.invalidateQueries({ queryKey: ["pixelBalance"] });
      }

      // Success - show toast and close dialog
      toast.success(
        "Payment sent successfully! Your pixel credits will be manually approved by the admin after payment verification.",
      );
      handleClose();
    } catch (err: any) {
      console.error("[GetPixelsDialogCloud] Purchase error:", err);
      setError(err.message || "Purchase failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-[500px] z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-lg">Buy Early Pixels</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Purchase pixels to unlock priority features and governance rights
              for the {era} era
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pixel-amount" className="text-xs">
                Pixel Quantity
              </Label>
              <Input
                id="pixel-amount"
                type="number"
                min="1"
                max="1000"
                value={pixels}
                onChange={(e) => setPixels(e.target.value)}
                disabled={isProcessing}
                className="text-sm"
                placeholder="Enter pixel amount"
              />
              <p className="text-[10px] text-muted-foreground">
                Maximum 1,000 pixels per purchase
              </p>
              <p className="text-[10px] text-muted-foreground/80">
                Note: This limit applies per transaction only. There is no limit
                on total pixels you can own.
              </p>
            </div>

            <div className="p-4 bg-muted rounded-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Price per pixel:
                </span>
                <span className="text-xs font-medium">0.1 ICP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Quantity:</span>
                <span className="text-xs font-medium">
                  {pixelAmountNum} pixels
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Cost:</span>
                  <span className="text-sm font-bold text-primary">
                    {costICP.toFixed(2)} ICP
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-sm">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 text-xs rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={
                  isProcessing || pixelAmountNum <= 0 || pixelAmountNum > 1000
                }
                className="flex-1 text-xs rounded-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Purchase ${pixelAmountNum} Pixels`
                )}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Note: Pixel credits are manually approved by the admin after
              payment is verified.
            </p>

            <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
              By purchasing pixels, you agree to the terms of service.
              Transactions are final and non-refundable.
            </p>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
