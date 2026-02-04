import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Target, Sparkles, Calendar, Clock, Users, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Project } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

interface Assignee {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
}

interface ProjectBriefProps {
  project: Project;
  assignees?: Assignee[];
  onEdit?: () => void;
  isReadOnly?: boolean;
}

export function ProjectBrief({ project, assignees = [], onEdit, isReadOnly = false }: ProjectBriefProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Parse outcomes if stored as JSON array string
  const outcomes = project.outcomes 
    ? (typeof project.outcomes === 'string' 
        ? (project.outcomes.startsWith('[') 
            ? JSON.parse(project.outcomes) as string[]
            : project.outcomes.split('\n').filter(Boolean))
        : [])
    : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="liquid-glass-elevated rounded-xl overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-md cursor-pointer hover:bg-card-hover transition-smooth">
            <div className="flex items-center gap-sm">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <h2 className="text-heading-sm font-semibold text-foreground">Project Brief</h2>
            </div>
            
            <div className="flex items-center gap-sm">
              {!isReadOnly && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="h-8 gap-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-lg pb-lg space-y-md">
            {/* Purpose */}
            {project.purpose && (
              <div className="flex items-start gap-sm">
                <div className="p-xs bg-primary/10 rounded-lg shrink-0 mt-0.5">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-metadata font-medium text-muted-foreground mb-xs">Purpose</p>
                  <p className="text-body text-foreground">{project.purpose}</p>
                </div>
              </div>
            )}

            {/* Description (rich text) */}
            {project.description && (
              <div className="flex items-start gap-sm">
                <div className="p-xs bg-info/10 rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-info-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-metadata font-medium text-muted-foreground mb-xs">Description</p>
                  <div 
                    className="text-body text-foreground prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:text-heading-lg [&_h2]:text-heading-md [&_h3]:text-heading-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.description) }}
                  />
                </div>
              </div>
            )}

            {/* Expected Outcomes */}
            {outcomes.length > 0 && (
              <div className="flex items-start gap-sm">
                <div className="p-xs bg-success/10 rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-success-text" />
                </div>
                <div>
                  <p className="text-metadata font-medium text-muted-foreground mb-xs">Expected Outcomes</p>
                  <ul className="space-y-xs">
                    {outcomes.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-xs text-body text-foreground">
                        <span className="text-success-text mt-1">•</span>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-lg pt-sm border-t border-border">
              {project.due_date && (
                <div className="flex items-center gap-xs text-metadata text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due {format(new Date(project.due_date), "MMMM d, yyyy")}</span>
                </div>
              )}
              
              <div className="flex items-center gap-xs text-metadata text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated {format(new Date(project.updated_at), "MMM d, yyyy")}</span>
              </div>

              {/* Assignees */}
              {assignees.length > 0 && (
                <div className="flex items-center gap-sm ml-auto">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {assignees.slice(0, 4).map((assignee) => (
                      <Tooltip key={assignee.id}>
                        <TooltipTrigger>
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-metadata bg-muted">
                              {assignee.profiles?.name?.[0] || assignee.profiles?.email?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          {assignee.profiles?.name || assignee.profiles?.email || "Unknown"}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {assignees.length > 4 && (
                      <Avatar className="h-7 w-7 border-2 border-background">
                        <AvatarFallback className="text-metadata bg-muted">
                          +{assignees.length - 4}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
