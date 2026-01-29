import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { SavedCopiesTableView } from "@/components/copywriter/SavedCopiesTableView";
import { LanguageColumnToggle } from "@/components/copywriter/LanguageColumnToggle";
import { PageContainer, PageHeader, FilterBar, DataCard } from "@/components/layout";
import {
  useCopywriterCopies,
} from "@/hooks/useCopywriterCopies";
import { useQueryClient } from "@tanstack/react-query";
import { ENTITIES } from "@/lib/constants";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

const ELEMENT_TYPES = ["headline", "description", "primary_text"];
const PLATFORMS = ["ppc", "facebook", "instagram", "tiktok", "snap", "reddit", "whatsapp"];

function CopyWriter() {
  const queryClient = useQueryClient();
  const [addingNewRow, setAddingNewRow] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeLanguages, setActiveLanguages] = useState<string[]>(["en", "ar"]);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: copies, isLoading } = useCopywriterCopies({
    platform: platformFilter !== "all" ? [platformFilter] : undefined,
    entity: entityFilter !== "all" ? [entityFilter] : undefined,
    elementType: typeFilter !== "all" ? typeFilter : undefined,
    search: debouncedSearch,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Copy Writer"
        description="Manage and organize your marketing copy"
        actions={
          <div className="flex gap-sm">
            <LanguageColumnToggle
              activeLanguages={activeLanguages}
              onToggle={setActiveLanguages}
            />
            <Button onClick={() => setAddingNewRow(true)} className="rounded-full">
              <Plus className="h-4 w-4 mr-sm" />
              Add Row
            </Button>
          </div>
        }
      />

      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search copies..."
        }}
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-card rounded-lg">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ELEMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformFilter || "all"} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-card rounded-lg">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter || "all"} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-card rounded-lg">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITIES.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataCard noPadding>
        {isLoading ? (
          <div className="p-md">
            <TableSkeleton columns={6} rows={10} />
          </div>
        ) : (
          <SavedCopiesTableView
            copies={copies || []} 
            activeLanguages={activeLanguages}
            addingNewRow={addingNewRow}
            onNewRowComplete={() => setAddingNewRow(false)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["copywriter-copies"] })}
          />
        )}
      </DataCard>
    </PageContainer>
  );
}

export default CopyWriter;
