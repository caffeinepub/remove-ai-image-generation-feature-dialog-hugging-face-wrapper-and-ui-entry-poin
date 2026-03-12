import DonateICPDialog from "@/components/modals/DonateICPDialog";
import GetPixelsDialog from "@/components/modals/GetPixelsDialog";
import ICPInfoDialog from "@/components/modals/ICPInfoDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useGetCallerPixelBalance,
  useGetCurrentEra,
  useGetMyPendingPixelPurchases,
} from "@/hooks/useQueries";
import {
  ChevronRight,
  Clock,
  Heart,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export default function ProfilePixels() {
  const [getPixelsDialogOpen, setGetPixelsDialogOpen] = useState(false);
  const [icpInfoDialogOpen, setIcpInfoDialogOpen] = useState(false);
  const [donateDialogOpen, setDonateDialogOpen] = useState(false);
  const { data: pixelBalance, isLoading } = useGetCallerPixelBalance();
  const { data: currentEra } = useGetCurrentEra();
  const { data: pendingPurchases, isLoading: pendingLoading } =
    useGetMyPendingPixelPurchases();

  const pixelCount = Number(pixelBalance || 0n);
  const era = currentEra || "Alpha";

  const ERA_PRICE_MAP: Record<string, number> = {
    Alpha: 0.1,
    Beta: 0.25,
    Gamma: 0.5,
  };
  const displayPrice = ERA_PRICE_MAP[era];
  const priceToShow = displayPrice ?? 0.1;

  const getTier = (balance: number): string => {
    if (balance >= 1000) return "Maximum";
    if (balance >= 700) return "Platinum";
    if (balance >= 350) return "Gold";
    if (balance >= 150) return "Silver";
    if (balance >= 50) return "Bronze";
    return "Starter";
  };

  const getTierColor = (balance: number): string => {
    if (balance >= 1000)
      return "text-cyan-400 border-cyan-400/50 bg-cyan-400/10";
    if (balance >= 700)
      return "text-purple-400 border-purple-400/50 bg-purple-400/10";
    if (balance >= 350)
      return "text-yellow-400 border-yellow-400/50 bg-yellow-400/10";
    if (balance >= 150)
      return "text-gray-300 border-gray-300/50 bg-gray-300/10";
    if (balance >= 50)
      return "text-orange-400 border-orange-400/50 bg-orange-400/10";
    return "text-muted-foreground border-muted-foreground/50 bg-muted-foreground/10";
  };

  const getNextTier = (
    balance: number,
  ): { name: string; required: number } | null => {
    if (balance >= 1000) return null;
    if (balance >= 700) return { name: "Maximum", required: 1000 };
    if (balance >= 350) return { name: "Platinum", required: 700 };
    if (balance >= 150) return { name: "Gold", required: 350 };
    if (balance >= 50) return { name: "Silver", required: 150 };
    return { name: "Bronze", required: 50 };
  };

  const getCurrentTierThreshold = (balance: number): number => {
    if (balance >= 1000) return 1000;
    if (balance >= 700) return 700;
    if (balance >= 350) return 350;
    if (balance >= 150) return 150;
    if (balance >= 50) return 50;
    return 0;
  };

  const nextTier = getNextTier(pixelCount);
  const currentTierThreshold = getCurrentTierThreshold(pixelCount);

  const progressPercentage = nextTier
    ? ((pixelCount - currentTierThreshold) /
        (nextTier.required - currentTierThreshold)) *
      100
    : 100;

  const tierLadder = [
    { name: "Starter", threshold: 0 },
    { name: "Bronze", threshold: 50 },
    { name: "Silver", threshold: 150 },
    { name: "Gold", threshold: 350 },
    { name: "Platinum", threshold: 700 },
  ];

  const tierRanges = [
    { name: "Starter", range: "0–49 pixels" },
    { name: "Bronze", range: "50–149 pixels" },
    { name: "Silver", range: "150–349 pixels" },
    { name: "Gold", range: "350–699 pixels" },
    { name: "Platinum", range: "700+ pixels" },
  ];

  const hasPendingPurchases = pendingPurchases && pendingPurchases.length > 0;
  const totalPendingPixels =
    pendingPurchases?.reduce((sum, p) => sum + Number(p.pixels), 0) || 0;

  return (
    <>
      <Card className="rounded-sm border shadow-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Pixel Balance
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Your pixel privileges and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 flex-1">
          {/* Pixel Sale Stage Information */}
          <div className="w-full p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-sm">
            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-400">
                Current Sale Stage: {era}
              </div>
              <div className="text-xs text-blue-300">
                Pixels in this stage cost {priceToShow.toFixed(2)} ICP each.
              </div>
            </div>
          </div>

          {/* Pending Purchases Notice */}
          {hasPendingPurchases && (
            <div className="w-full p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="text-xs font-medium text-yellow-400">
                    Pending Approval
                  </div>
                  <div className="text-xs text-yellow-300">
                    You have {pendingPurchases.length} pending purchase
                    {pendingPurchases.length > 1 ? "s" : ""} totaling{" "}
                    {totalPendingPixels} pixel
                    {totalPendingPixels !== 1 ? "s" : ""} awaiting admin
                    approval.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full-Width Visual Section */}
          <div
            id="hw7e6c"
            className="w-full space-y-3 p-3 bg-muted/50 rounded-sm border border-border"
          >
            {/* Large Pixel Balance Display */}
            <div className="text-center space-y-1.5">
              {isLoading ? (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-semibold text-primary">
                    {pixelCount.toLocaleString()}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Pixels
                  </div>

                  {!pendingLoading && totalPendingPixels > 0 && (
                    <div className="pt-1 space-y-0.5">
                      <div className="text-sm text-muted-foreground">
                        Pending Pixels: {totalPendingPixels.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Awaiting admin approval
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tier Badge */}
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 ${getTierColor(pixelCount)}`}
              >
                {getTier(pixelCount)}
              </Badge>
            </div>

            {/* Progress Bar */}
            {nextTier && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{getTier(pixelCount)}</span>
                  <span>{nextTier.name}</span>
                </div>
                <Progress value={progressPercentage} className="h-1.5" />
                <div className="text-center text-xs text-muted-foreground">
                  {nextTier.required - pixelCount} pixels to {nextTier.name}
                </div>
              </div>
            )}

            {pixelCount >= 1000 && (
              <div className="text-center text-xs text-cyan-400 font-medium">
                Maximum tier reached!
              </div>
            )}

            {/* Tier Ladder */}
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground mb-1.5 text-center">
                Tier Progression
              </div>
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {tierLadder.map((tier, index) => (
                  <div key={tier.name} className="flex items-center">
                    <span
                      className={`text-xs ${
                        pixelCount >= tier.threshold
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tier.name}
                    </span>
                    {index < tierLadder.length - 1 && (
                      <ChevronRight className="w-3 h-3 mx-0.5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Ranges */}
            <div className="pt-2 border-t border-border space-y-1">
              {tierRanges.map((tier) => {
                const tierData = tierLadder.find((t) => t.name === tier.name);
                const isActive = tierData
                  ? pixelCount >= tierData.threshold
                  : false;
                return (
                  <div
                    key={tier.name}
                    className="flex justify-between text-xs text-muted-foreground"
                  >
                    <span className={isActive ? "text-primary/80" : ""}>
                      {tier.name}
                    </span>
                    <span>{tier.range}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What Pixels Unlock */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">
              What Pixels Unlock
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pixels unlock priority access to new editor features, early
              governance participation, experimental tools, future tradable
              assets (such as tokens or NFTs), exclusive merchandise, and
              recognition as an early supporter.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="qzv5mn"
              variant="outline"
              size="icon"
              onClick={() => setIcpInfoDialogOpen(true)}
              className="h-8 w-8 rounded-sm"
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDonateDialogOpen(true)}
              className="h-8 rounded-sm px-3 text-xs"
              data-ocid="donate.open_modal_button"
            >
              <Heart className="w-3 h-3 mr-1 text-red-400" />
              Donate
            </Button>
            <Button
              id="15ep1sm"
              onClick={() => setGetPixelsDialogOpen(true)}
              className="flex-1 text-xs h-8 rounded-sm"
            >
              Get Early Pixels
            </Button>
          </div>
        </CardContent>
      </Card>

      <GetPixelsDialog
        open={getPixelsDialogOpen}
        onOpenChange={setGetPixelsDialogOpen}
      />

      <ICPInfoDialog
        open={icpInfoDialogOpen}
        onOpenChange={setIcpInfoDialogOpen}
      />

      <DonateICPDialog
        open={donateDialogOpen}
        onOpenChange={setDonateDialogOpen}
      />
    </>
  );
}
