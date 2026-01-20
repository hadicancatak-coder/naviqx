import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleUtmBuilder } from "@/components/utm/SimpleUtmBuilder";
import { UtmArchiveTable } from "@/components/utm/UtmArchiveTable";
import { UtmInlineFilters } from "@/components/utm/UtmInlineFilters";
import { UtmConfigurationTab } from "@/components/utm/UtmConfigurationTab";
import { PageContainer, PageHeader, AlertBanner, DataCard } from "@/components/layout";
import { useUtmLinks, UtmLinkFilters } from "@/hooks/useUtmLinks";
import { Link2, Wand2, Archive, Settings, ExternalLink } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const UtmPlanner = () => {
  const [activeTab, setActiveTab] = useState("builder");
  const [archiveFilters, setArchiveFilters] = useState<UtmLinkFilters>({});
  
  const { data: allLinks = [], isLoading: isLoadingArchive } = useUtmLinks(archiveFilters);

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
        <TabsList className="grid grid-cols-3 w-full lg:w-auto bg-muted/50">
          <TabsTrigger value="builder" className="gap-2">
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Builder</span>
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

        <TabsContent value="builder" className="mt-lg">
          <SimpleUtmBuilder />
        </TabsContent>

        <TabsContent value="archive" className="mt-lg space-y-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-heading-sm font-semibold">All Generated Links</h3>
              <p className="text-body-sm text-muted-foreground">
                View and manage all UTM links created through the Builder
              </p>
            </div>
          </div>
          <UtmInlineFilters filters={archiveFilters} onFiltersChange={setArchiveFilters} />
          {isLoadingArchive ? (
            <DataCard noPadding>
              <div className="p-md">
                <TableSkeleton columns={5} rows={8} />
              </div>
            </DataCard>
          ) : allLinks.length === 0 ? (
            <DataCard noPadding>
              <div className="p-xl text-center text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-md opacity-50" />
                <p>No UTM links yet</p>
                <p className="text-body-sm">Generate links in the Builder tab to see them here</p>
              </div>
            </DataCard>
          ) : (
            <UtmArchiveTable links={allLinks} isLoading={isLoadingArchive} />
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-lg">
          <UtmConfigurationTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default UtmPlanner;
