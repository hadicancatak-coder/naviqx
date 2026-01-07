import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UtmBuilder } from "@/components/utm/UtmBuilder";
import { UtmTableGroupedView } from "@/components/utm/UtmTableGroupedView";
import { UtmInlineFilters } from "@/components/utm/UtmInlineFilters";
import { UtmConfigurationTab } from "@/components/utm/UtmConfigurationTab";
import { PageContainer, PageHeader, AlertBanner, DataCard } from "@/components/layout";
import { useUtmLinks, UtmLinkFilters } from "@/hooks/useUtmLinks";
import { Link2, Sparkles, FolderOpen, Archive, Settings, ExternalLink } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const UtmPlanner = () => {
  const [activeTab, setActiveTab] = useState("builder");
  const [filters, setFilters] = useState<UtmLinkFilters>({});
  const [archiveFilters, setArchiveFilters] = useState<UtmLinkFilters>({ status: 'archived' });
  
  const { data: utmLinks = [], isLoading } = useUtmLinks(filters);
  const { data: archivedLinks = [], isLoading: isLoadingArchive } = useUtmLinks(archiveFilters);

  return (
    <PageContainer>
      <PageHeader
        icon={Link2}
        title="UTM Planner"
        description="Create, manage, and track your UTM campaign links"
      />

      <AlertBanner variant="info" title="UTM Link Verification Required">
        You are responsible for UTM links correctness. Check and ensure links are correct and working. System can make mistakes. You may use this{" "}
        <a
          href="https://docs.google.com/spreadsheets/d/1Desiq_cUDzdypT-Y54EUkKDWDj2ZJyQm0mHLpxhBFJs/edit?gid=1643442957#gid=1643442957"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline hover:no-underline"
        >
          Google Sheets
          <ExternalLink className="h-3 w-3" />
        </a>
        {" "}to generate UTMs in case of an error here.
      </AlertBanner>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full lg:w-auto bg-muted/50">
          <TabsTrigger value="builder" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Smart Builder</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Link Bucket</span>
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Archive</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" forceMount hidden={activeTab !== "builder"} className="mt-lg">
          <UtmBuilder />
        </TabsContent>

        <TabsContent value="links" forceMount hidden={activeTab !== "links"} className="mt-lg space-y-md">
          <UtmInlineFilters filters={filters} onFiltersChange={setFilters} />
          <DataCard noPadding>
            {isLoading ? (
              <div className="p-md">
                <TableSkeleton columns={5} rows={8} />
              </div>
            ) : (
              <UtmTableGroupedView links={utmLinks} />
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="archive" forceMount hidden={activeTab !== "archive"} className="mt-lg space-y-md">
          <div className="flex items-center justify-between">
            <div>
            <h3 className="text-heading-sm font-semibold">Archived Links</h3>
              <p className="text-body-sm text-muted-foreground">
                Links that have been archived and are no longer active
              </p>
            </div>
          </div>
          <DataCard noPadding>
            {isLoadingArchive ? (
              <div className="p-md">
                <TableSkeleton columns={5} rows={8} />
              </div>
            ) : archivedLinks.length === 0 ? (
              <div className="p-xl text-center text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-md opacity-50" />
                <p>No archived links yet</p>
                <p className="text-body-sm">Archived links will appear here</p>
              </div>
            ) : (
              <UtmTableGroupedView links={archivedLinks} />
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="config" forceMount hidden={activeTab !== "config"} className="mt-lg">
          <UtmConfigurationTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default UtmPlanner;
