import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminCreditPixels,
  useAdminCreditPixelsForPurchase,
  useGetAdminUserOverview,
  useGetCurrentEra,
  useGetEditorVisitCount,
  useGetRealBackendCycleInfo,
  useGetRealFrontendCycleInfo,
  useGetTotalPixelsSold,
  useGetTotalProjectCount,
  useListPendingPixelPurchases,
  useSetCurrentEra,
} from "@/hooks/useQueries";
import { Principal } from "@icp-sdk/core/principal";
import {
  Calendar,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  FolderOpen,
  Loader2,
  Server,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function formatCycles(cycles: bigint): string {
  const trillion = BigInt(1_000_000_000_000);
  const billion = BigInt(1_000_000_000);

  if (cycles >= trillion) {
    return `${(Number(cycles) / Number(trillion)).toFixed(2)}T`;
  }
  if (cycles >= billion) {
    return `${(Number(cycles) / Number(billion)).toFixed(2)}B`;
  }
  return cycles.toString();
}

function getHealthBadge(status: string) {
  switch (status) {
    case "ok":
      return (
        <Badge variant="default" className="bg-green-600">
          OK
        </Badge>
      );
    case "low":
      return (
        <Badge variant="default" className="bg-yellow-600">
          Low
        </Badge>
      );
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

export default function AdminDashboard() {
  const { data: editorVisitCount, isLoading: visitCountLoading } =
    useGetEditorVisitCount();
  const { data: userOverview, isLoading: userOverviewLoading } =
    useGetAdminUserOverview();
  const { data: totalProjects, isLoading: projectsLoading } =
    useGetTotalProjectCount();
  const { data: backendCycleInfo, isLoading: backendCyclesLoading } =
    useGetRealBackendCycleInfo();
  const { data: frontendCycleInfo, isLoading: frontendCyclesLoading } =
    useGetRealFrontendCycleInfo();
  const { data: totalPixelsSold, isLoading: totalPixelsLoading } =
    useGetTotalPixelsSold();
  const { data: currentEra, isLoading: eraLoading } = useGetCurrentEra();
  const { data: pendingPurchases, isLoading: pendingPurchasesLoading } =
    useListPendingPixelPurchases();
  const setCurrentEraMutation = useSetCurrentEra();
  const adminCreditPixelsMutation = useAdminCreditPixels();
  const creditPurchase = useAdminCreditPixelsForPurchase();

  const [selectedEra, setSelectedEra] = useState<string>("");
  const [creditPrincipal, setCreditPrincipal] = useState<string>("");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [creditReason, setCreditReason] = useState<string>("");
  const [creditingTxIndex, setCreditingTxIndex] = useState<bigint | null>(null);

  // Update selected era when current era loads
  useMemo(() => {
    if (currentEra && !selectedEra) {
      setSelectedEra(currentEra);
    }
  }, [currentEra, selectedEra]);

  const handleEraChange = async (newEra: string) => {
    setSelectedEra(newEra);
    try {
      await setCurrentEraMutation.mutateAsync(newEra);
      toast.success(`Era updated to ${newEra}`);
    } catch (error: any) {
      console.error("Set era error:", error);
      toast.error(error?.message || "Failed to update era");
      // Revert selection on error
      setSelectedEra(currentEra || "Alpha");
    }
  };

  const handleCreditPixels = async () => {
    // Validate inputs
    if (!creditPrincipal.trim()) {
      toast.error("Please enter a user principal");
      return;
    }

    if (
      !creditAmount.trim() ||
      Number.isNaN(Number(creditAmount)) ||
      Number(creditAmount) <= 0
    ) {
      toast.error("Please enter a valid pixel amount");
      return;
    }

    // Show confirmation dialog
    if (!confirm("I confirm that I verified this payment on the ICP ledger.")) {
      return;
    }

    try {
      const principal = Principal.fromText(creditPrincipal.trim());
      const amount = BigInt(creditAmount);
      const reason = creditReason.trim() || "Manual credit";

      await adminCreditPixelsMutation.mutateAsync({
        user: principal,
        amount,
        reason,
      });

      toast.success(`Successfully credited ${creditAmount} pixels to user`);

      // Clear form
      setCreditPrincipal("");
      setCreditAmount("");
      setCreditReason("");
    } catch (error: any) {
      console.error("Credit pixels error:", error);
      toast.error(error?.message || "Failed to credit pixels");
    }
  };

  const handleCreditPurchase = async (txIndex: bigint, pixels: bigint) => {
    setCreditingTxIndex(txIndex);
    try {
      await creditPurchase.mutateAsync({
        txIndex,
        reason: "Manual admin approval",
      });
      toast.success(
        `Successfully credited ${pixels.toString()} pixels for transaction ${txIndex.toString()}`,
      );
    } catch (error: any) {
      console.error("Credit purchase error:", error);
      toast.error(error?.message || "Failed to credit pixels for purchase");
    } finally {
      setCreditingTxIndex(null);
    }
  };

  const handleCopyTxIndex = (txIndex: bigint) => {
    navigator.clipboard.writeText(txIndex.toString());
    toast.success("Transaction index copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Top Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Editor Visits</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {visitCountLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {editorVisitCount?.toString() || "0"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {userOverviewLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {userOverview?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {totalProjects?.toString() || "0"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pixels Sold
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totalPixelsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {totalPixelsSold?.toString() || "0"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Backend Cycles
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {backendCyclesLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : backendCycleInfo ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {formatCycles(backendCycleInfo.balance)}
                </div>
                {getHealthBadge(backendCycleInfo.healthStatus)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Frontend Cycles
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {frontendCyclesLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : frontendCycleInfo ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {formatCycles(frontendCycleInfo.balance)}
                </div>
                {getHealthBadge(frontendCycleInfo.healthStatus)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
          <CardDescription>Manage system settings and access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="font-medium">Current Era</h4>
                <p className="text-sm text-muted-foreground">
                  Set the current era for the application. This affects pixel
                  tier labels and descriptions.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="era-select" className="text-xs">
                  Select Era
                </Label>
                <Select
                  value={selectedEra}
                  onValueChange={handleEraChange}
                  disabled={eraLoading || setCurrentEraMutation.isPending}
                >
                  <SelectTrigger id="era-select" className="w-[200px]">
                    <SelectValue placeholder="Select era..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alpha">Alpha</SelectItem>
                    <SelectItem value="Beta">Beta</SelectItem>
                    <SelectItem value="Gamma">Gamma</SelectItem>
                  </SelectContent>
                </Select>
                {setCurrentEraMutation.isPending && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Updating era...
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users & Pixels Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Users & Pixels</CardTitle>
          <CardDescription>
            Comprehensive user information including names, emails, and pixel
            balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userOverviewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : userOverview && userOverview.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Principal ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pixel Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userOverview.map((user) => (
                  <TableRow key={user.principal.toString()}>
                    <TableCell className="font-mono text-xs">
                      {user.principal.toString()}
                    </TableCell>
                    <TableCell>
                      {user.name ? (
                        <span className="text-sm">{user.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No name
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.email ? (
                        <span className="text-sm">{user.email}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No email
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {user.pixels.toString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users registered yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Pixel Purchases Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Pending Pixel Purchases</CardTitle>
          <CardDescription>
            Review and approve pending pixel purchase transactions.{" "}
            <a
              href="https://dashboard.internetcomputer.org/transactions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600"
            >
              View all transactions
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPurchasesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pendingPurchases && pendingPurchases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Index</TableHead>
                  <TableHead>Buyer Principal</TableHead>
                  <TableHead>Pixels</TableHead>
                  <TableHead>ICP Amount</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPurchases.map((p) => (
                  <TableRow key={p.txIndex.toString()}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {p.txIndex.toString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyTxIndex(p.txIndex)}
                          className="h-6 w-6 p-0"
                          title="Copy transaction index"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.buyer.toString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{p.pixels.toString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {(Number(p.amountE8s) / 100_000_000).toFixed(2)} ICP
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          Number(p.createdAt) / 1_000_000,
                        ).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCreditPurchase(p.txIndex, p.pixels)
                        }
                        disabled={
                          creditingTxIndex === p.txIndex ||
                          creditPurchase.isPending
                        }
                      >
                        {creditingTxIndex === p.txIndex ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Crediting...
                          </>
                        ) : (
                          "Credit"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pending pixel purchases
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Pixel Credit Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Manual Pixel Credit</CardTitle>
          <CardDescription>
            Manually credit pixels to users after verifying ICP ledger payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <Coins className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credit-principal">User Principal</Label>
                  <Input
                    id="credit-principal"
                    type="text"
                    placeholder="Enter user principal..."
                    value={creditPrincipal}
                    onChange={(e) => setCreditPrincipal(e.target.value)}
                    disabled={adminCreditPixelsMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit-amount">Pixel Amount</Label>
                  <Input
                    id="credit-amount"
                    type="number"
                    placeholder="Enter pixel amount..."
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    disabled={adminCreditPixelsMutation.isPending}
                    min="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit-reason">Reason (optional)</Label>
                <Input
                  id="credit-reason"
                  type="text"
                  placeholder="Enter reason for crediting pixels..."
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  disabled={adminCreditPixelsMutation.isPending}
                />
              </div>
              <Button
                onClick={handleCreditPixels}
                disabled={adminCreditPixelsMutation.isPending}
                className="w-full md:w-auto"
              >
                {adminCreditPixelsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Crediting Pixels...
                  </>
                ) : (
                  "Credit Pixels"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
