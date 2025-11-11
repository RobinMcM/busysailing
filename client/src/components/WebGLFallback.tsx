import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function WebGLFallback() {
  return (
    <Card 
      className="w-64 h-64 flex items-center justify-center bg-muted/50" 
      data-testid="webgl-fallback"
    >
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            3D Avatar Not Available
          </p>
          <p className="text-xs text-muted-foreground">
            Your browser doesn't support WebGL. Voice responses will still work normally.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
