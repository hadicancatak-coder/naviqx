import { AlertCircle } from "lucide-react";
import ErrorLogs from "./ErrorLogs";

export default function Logs() {
  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-section-title">System Logs</h2>
        <p className="text-muted-foreground mt-1">Monitor application errors</p>
      </div>

      <ErrorLogs />
    </div>
  );
}
