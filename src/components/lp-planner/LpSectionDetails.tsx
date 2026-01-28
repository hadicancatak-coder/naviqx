import { ExternalLink, Image, Link2, FileText, Edit2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/layout/EmptyState";
import { LpSection, useDeleteLpSection } from "@/hooks/useLpSections";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LpSectionDetailsProps {
  section: LpSection | null;
  onEdit: () => void;
}

import { sectionTypeCardColors } from "@/domain/lp-sections";

export const LpSectionDetails = ({ section, onEdit }: LpSectionDetailsProps) => {
  const deleteSection = useDeleteLpSection();

  if (!section) {
    return (
      <div className="h-full flex items-center justify-center bg-card border-l border-border">
        <EmptyState
          icon={FileText}
          title="No section selected"
          description="Select a section from the library or map to view details"
        />
      </div>
    );
  }

  const typeColor = sectionTypeCardColors[section.section_type] || sectionTypeCardColors.other;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-md border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{section.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn("text-metadata", typeColor)}>
                {section.section_type}
              </Badge>
              {section.entity && (
                <Badge variant="outline" className="text-metadata">
                  {section.entity.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Section</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{section.name}"? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteSection.mutate(section.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-md space-y-lg">
          {section.description && (
            <div>
              <h4 className="text-metadata font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </h4>
              <p className="text-body-sm">{section.description}</p>
            </div>
          )}

          {section.brief_content && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Brief / Instructions
              </h4>
              <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                {section.brief_content}
              </div>
            </div>
          )}

          {section.sample_images.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Sample Images ({section.sample_images.length})
              </h4>
              <div className="space-y-3">
                {section.sample_images.map((image) => (
                  <div key={image.id} className="rounded-lg overflow-hidden border">
                    <img
                      src={image.url}
                      alt={image.caption || "Section image"}
                      className="w-full object-cover"
                    />
                    {image.caption && (
                      <p className="text-xs text-muted-foreground p-2 bg-muted/50">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.website_links.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Reference Links ({section.website_links.length})
              </h4>
              <div className="space-y-2">
                {section.website_links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">
                      {link.label || link.url}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
