import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LpMapListCompact } from "@/components/lp-planner/LpMapListCompact";
import { LpCanvas } from "@/components/lp-planner/LpCanvas";
import { useLpMapWithSections } from "@/hooks/useLpMaps";
import { PageContainer } from "@/components/layout";

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
    /* eslint-disable-next-line no-restricted-syntax */
    <PageContainer size="full" className="!p-0 !pt-0 !pb-0">
      <div className="h-[calc(100vh-80px)] flex">
        {/* Left Panel - Map List (30%) */}
        <div className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto">
          <LpMapListCompact
            selectedMapId={selectedMapId}
            onSelectMap={handleSelectMap}
          />
        </div>

        {/* Right Panel - Canvas (70%) */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <LpCanvas
            map={selectedMap || null}
            onRefresh={handleRefreshMap}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default LpPlanner;
