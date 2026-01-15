import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LpTypesManager } from "./LpTypesManager";
import { UtmPlatformManager } from "./UtmPlatformManager";
import { UtmMediumManager } from "./UtmMediumManager";
import { CampaignLibrary } from "./CampaignLibrary";
import { EntitiesManager } from "./EntitiesManager";
import { LpLinksManager } from "./LpLinksManager";

export function UtmConfigurationTab() {
  const [activeTab, setActiveTab] = useState("lp-links");

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-heading-lg font-bold tracking-tight">UTM Configuration</h2>
        <p className="text-muted-foreground">
          Manage LP links, entities, platforms, mediums, campaigns, and landing page types
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lp-links">LP Links</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="mediums">Mediums</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="lp-types">LP Types</TabsTrigger>
        </TabsList>

        <TabsContent value="lp-links" className="space-y-md">
          <LpLinksManager />
        </TabsContent>

        <TabsContent value="entities" className="space-y-md">
          <EntitiesManager />
        </TabsContent>

        <TabsContent value="platforms" className="space-y-md">
          <UtmPlatformManager />
        </TabsContent>

        <TabsContent value="mediums" className="space-y-md">
          <UtmMediumManager />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-md">
          <CampaignLibrary />
        </TabsContent>

        <TabsContent value="lp-types" className="space-y-md">
          <LpTypesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
