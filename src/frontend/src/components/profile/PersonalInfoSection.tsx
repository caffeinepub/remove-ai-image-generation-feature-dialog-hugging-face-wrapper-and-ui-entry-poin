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
import { Textarea } from "@/components/ui/textarea";
import { useGetPersonalInfo, useSavePersonalInfo } from "@/hooks/useQueries";
import { Loader2, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PersonalInfoSection() {
  const { data: personalInfo, isLoading } = useGetPersonalInfo();
  const savePersonalInfoMutation = useSavePersonalInfo();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [additional, setAdditional] = useState("");

  useEffect(() => {
    if (personalInfo) {
      setName(personalInfo.name);
      setEmail(personalInfo.email);
      setAdditional(personalInfo.additional || "");
    }
  }, [personalInfo]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      await savePersonalInfoMutation.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        additional: additional.trim() || undefined,
      });
      toast.success("Personal information saved successfully");
    } catch (error: any) {
      console.error("Save personal info error:", error);
      toast.error(error?.message || "Failed to save personal information");
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-sm border shadow-sm h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            Personal Info
          </CardTitle>
          <CardDescription className="text-[10px]">
            Manage your contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6 flex-1">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm border shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          Personal Info
        </CardTitle>
        <CardDescription className="text-[10px]">
          Manage your contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs">
            Full Name *
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={savePersonalInfoMutation.isPending}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={savePersonalInfoMutation.isPending}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="additional" className="text-xs">
            Additional Info
          </Label>
          <Textarea
            id="additional"
            placeholder="Any additional contact information"
            value={additional}
            onChange={(e) => setAdditional(e.target.value)}
            disabled={savePersonalInfoMutation.isPending}
            rows={2}
            className="text-xs resize-none"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={savePersonalInfoMutation.isPending}
          className="w-full h-8 text-xs"
        >
          {savePersonalInfoMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3 h-3 mr-1.5" />
              Save Information
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
