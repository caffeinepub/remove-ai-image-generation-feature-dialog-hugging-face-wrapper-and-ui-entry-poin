import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RoadmapDialog({
  open,
  onOpenChange,
}: RoadmapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="max-w-3xl max-h-[80vh] font-['Inter'] z-[1000]">
          <DialogHeader>
            <DialogTitle>ICPixel Roadmap & Vision</DialogTitle>
            <DialogDescription>
              Building the future of on-chain pixel art creation
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="text-lg font-semibold mb-2">What is ICPixel?</h3>
                <p className="text-muted-foreground">
                  ICPixel is a fully on-chain pixel art editor built on the
                  Internet Computer. Unlike traditional web applications, all
                  your projects, layers, and animations are stored directly on
                  the blockchain, ensuring true ownership and permanence of your
                  digital art.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Current Features</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Full-featured pixel art editor with 11 drawing and selection
                    tools
                  </li>
                  <li>
                    Hierarchical layer system with blend modes and opacity
                    controls
                  </li>
                  <li>Animation timeline with onion skinning and playback</li>
                  <li>
                    On-chain project storage with compression and chunking
                  </li>
                  <li>Internet Identity authentication for secure access</li>
                  <li>Non-custodial ICP wallet integration</li>
                  <li>Export to PNG, WebM, and sprite sheets</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Early Pixels</h3>
                <p className="text-muted-foreground mb-2">
                  Early Pixels are non-transferable reputation credits that
                  recognize early supporters during the Alpha era. They unlock
                  benefits within the platform:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Priority access to new features and experimental tools
                  </li>
                  <li>Tier-based progression system (Starter to Platinum)</li>
                  <li>Early governance participation</li>
                  <li>Recognition as an early supporter</li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Pixels are purchased using ICP at 0.1 ICP per pixel during the
                  Alpha stage. Pricing will increase in Beta (0.25 ICP) and
                  Gamma (0.5 ICP) stages.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">
                  Upcoming Features
                </h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>NFT minting directly from the editor</li>
                  <li>Marketplace for pixel art and assets</li>
                  <li>
                    AI-assisted tools (upscaling, color suggestions, animation
                    interpolation)
                  </li>
                  <li>Collaborative editing and shared projects</li>
                  <li>Mobile and desktop applications</li>
                  <li>Game engine integration (Unity, Godot, Unreal)</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Why On-Chain?</h3>
                <p className="text-muted-foreground mb-2">
                  Storing your art on the Internet Computer provides unique
                  advantages:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>True Ownership:</strong> Your art is controlled by
                    your Internet Identity
                  </li>
                  <li>
                    <strong>Permanence:</strong> Projects persist as long as the
                    blockchain exists
                  </li>
                  <li>
                    <strong>Transparency:</strong> All code is open and
                    verifiable
                  </li>
                  <li>
                    <strong>Composability:</strong> Projects can be referenced
                    and remixed by other apps
                  </li>
                  <li>
                    <strong>No Installation:</strong> Access from any browser,
                    any device
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Get Involved</h3>
                <p className="text-muted-foreground mb-2">
                  ICPixel is built by and for the pixel art community:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Create and share your pixel art</li>
                  <li>Provide feedback and report bugs</li>
                  <li>Purchase Early Pixels to support development</li>
                  <li>Join the community on X (@icpixeleditor)</li>
                  <li>Contribute to the open-source codebase</li>
                </ul>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
