import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useState } from "react";
import LoginButton from "../auth/LoginButton";
import GetPixelsDialog from "../modals/GetPixelsDialog";
import ICPInfoDialog from "../modals/ICPInfoDialog";
import MenuBar from "./MenuBar";

export default function Header() {
  const [showGetPixelsDialog, setShowGetPixelsDialog] = useState(false);
  const [showICPInfoDialog, setShowICPInfoDialog] = useState(false);

  return (
    <>
      <header className="h-14 bg-card border-b border-border flex items-center shrink-0">
        <div className="flex items-center justify-between w-full relative">
          {/* Left: Menu Bar */}
          <div className="flex items-center pl-4">
            <MenuBar />
          </div>

          {/* Center: PNG Logo (absolutely positioned) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
            <img
              src="/assets/logoicpixel.png"
              alt="ICPixel"
              className="h-11 w-auto"
              style={{ display: "block" }}
            />
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 pr-4">
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setShowGetPixelsDialog(true)}
                variant="default"
                size="sm"
                className="font-['Inter'] text-sm h-7 px-2.5 bg-primary hover:bg-primary/90 text-black"
              >
                Get Early Pixels
              </Button>
              <Button
                onClick={() => setShowICPInfoDialog(true)}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-accent"
                title="Learn about ICP and Pixels"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            <LoginButton />
          </div>
        </div>
      </header>

      <GetPixelsDialog
        open={showGetPixelsDialog}
        onOpenChange={setShowGetPixelsDialog}
      />

      <ICPInfoDialog
        open={showICPInfoDialog}
        onOpenChange={setShowICPInfoDialog}
      />
    </>
  );
}
