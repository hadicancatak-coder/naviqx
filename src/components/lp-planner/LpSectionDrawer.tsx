import { useState, useMemo } from "react";
import { Search, Image, Plus, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLpSections, LpSection } from "@/hooks/useLpSections";
import { cn } from "@/lib/utils";

interface LpSectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSection: (section: LpSection) => void;
  onCreateSection: () => void;
}

import { sectionTypeBadgeColors } from "@/domain/lp-sections";

export const LpSectionDrawer = ({
  open,
  onOpenChange,
  onSelectSection,
  onCreateSection,
}: LpSectionDrawerProps) => {
  const [search, setSearch] = useState("");

  const { data: sections = [], isLoading } = useLpSections({ isActive: true });

  const filteredSections = useMemo(() => {
    return sections.filter((section) =>
      section.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [sections, search]);

  // Group sections by type
  const groupedSections = useMemo(() => {
    const groups: Record<string, LpSection[]> = {};
    filteredSections.forEach((section) => {
      const type = section.section_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(section);
    });
    return groups;
  }, [filteredSections]);

  const handleSelect = (section: LpSection) => {
    onSelectSection(section);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Add Section</SheetTitle>
            <Button size="sm" variant="outline" onClick={onCreateSection} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              New Section
            </Button>
          </div>
        </SheetHeader>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="p-md space-y-lg">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-body-sm">
                Loading sections...
              </div>
            ) : Object.keys(groupedSections).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-body-sm">
                No sections found
              </div>
            ) : (
              Object.entries(groupedSections).map(([type, typeSections]) => (
                <div key={type}>
                  <h4 className="text-metadata font-medium text-muted-foreground uppercase tracking-wider mb-sm">
                    {type}
                  </h4>
                  <div className="grid grid-cols-2 gap-sm">
                    {typeSections.map((section) => {
                      const firstImage = section.sample_images[0];
                      const badgeColor = sectionTypeBadgeColors[section.section_type] || sectionTypeBadgeColors.custom;
                      
                      return (
                        <button
                          key={section.id}
                          onClick={() => handleSelect(section)}
                          className="group flex flex-col items-start p-3 rounded-xl border bg-card hover:bg-card-hover hover:border-primary/30 transition-all text-left"
                        >
                          {/* Thumbnail */}
                          {firstImage ? (
                            <div className="w-full h-16 rounded-lg overflow-hidden mb-2 bg-muted">
                              <img
                                src={firstImage.url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-16 rounded-lg bg-muted/50 flex items-center justify-center mb-2">
                              <Image className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}

                          <span className="font-medium text-body-sm truncate w-full">
                            {section.name}
                          </span>
                          <div className="flex items-center gap-sm mt-1">
                            {section.entity && (
                              <span className="text-metadata text-muted-foreground truncate">
                                {section.entity.name}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
