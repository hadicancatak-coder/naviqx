import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LpMapListCompact } from "@/components/lp-planner/LpMapListCompact";
import { LpCanvas } from "@/components/lp-planner/LpCanvas";
import { useLpMapWithSections } from "@/hooks/useLpMaps";

const LpPlanner = () => {
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: selectedMap, refetch: refetchMap } = useLpMapWithSections(selectedMapId);

  const handleSelectMap = useCallback((mapId: string | null) => {
    setSelectedMapId(mapId);
  }, []);

  const handleRefreshMap = useCallback(() => {
    refetchMap();
    queryClient.invalidateQueries({ queryKey: ["lp-maps"] });
  }, [refetchMap, queryClient]);

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Left Panel - Map List (30%) */}
      <div className="w-[280px] flex-shrink-0 border-r border-border">
        <LpMapListCompact
          selectedMapId={selectedMapId}
          onSelectMap={handleSelectMap}
        />
      </div>

      {/* Right Panel - Canvas (70%) */}
      <div className="flex-1 min-w-0">
        <LpCanvas
          map={selectedMap || null}
          onRefresh={handleRefreshMap}
        />
      </div>
    </div>
  );
};

export default LpPlanner;
