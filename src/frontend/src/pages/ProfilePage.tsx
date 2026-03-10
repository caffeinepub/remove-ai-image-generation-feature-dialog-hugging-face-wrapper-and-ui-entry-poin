import Header from "@/components/layout/Header";
import AdminDashboard from "@/components/profile/AdminDashboard";
import PersonalInfoSection from "@/components/profile/PersonalInfoSection";
import ProfileAssets from "@/components/profile/ProfileAssets";
import ProfilePixels from "@/components/profile/ProfilePixels";
import { ProfileWallet } from "@/components/profile/ProfileWallet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useIsCallerAdmin } from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      queryClient.clear();
      navigate({ to: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background font-['Inter']">
      <Header />

      <div className="flex-1 overflow-auto">
        <div className="w-full px-8 py-6 space-y-6">
          {/* Header with left-aligned Back and right-aligned Logout */}
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigate({ to: "/" })}
              variant="outline"
              size="sm"
              className="text-xs h-8"
            >
              <ArrowLeft className="w-3 h-3 mr-1.5" />
              Back to Editor
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              disabled={isLoggingOut}
            >
              <LogOut className="w-3 h-3 mr-1.5" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList
              className="grid w-full max-w-md"
              style={{ gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr" }}
            >
              <TabsTrigger value="profile" className="text-xs">
                My Profile
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="text-xs">
                  Admin Dashboard
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
              {/* 3-column grid layout for top row with items-stretch */}
              <div className="grid grid-cols-3 gap-6 items-stretch">
                {/* Left column: ProfileWallet */}
                <div className="h-full">
                  <ProfileWallet />
                </div>

                {/* Middle column: ProfilePixels */}
                <div className="h-full">
                  <ProfilePixels />
                </div>

                {/* Right column: PersonalInfoSection */}
                <div className="h-full">
                  <PersonalInfoSection />
                </div>
              </div>

              {/* Full-width bottom row: SavedProjects */}
              <div className="col-span-3">
                <ProfileAssets />
              </div>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="mt-6">
                <AdminDashboard />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
