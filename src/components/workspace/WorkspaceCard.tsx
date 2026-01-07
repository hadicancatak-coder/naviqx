import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { TOOL_COLORS } from "@/lib/constants";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  boardCount?: number;
  onClick?: () => void;
}

export function WorkspaceCard({ 
  name, 
  description, 
  icon = "Folder", 
  color,
  boardCount = 0,
  onClick 
}: WorkspaceCardProps) {
  const navigate = useNavigate();
  const Icon = (Icons[icon as keyof typeof Icons] as LucideIcon) || Icons.Folder;
  const resolvedColor = color || TOOL_COLORS.blue;

  return (
    <Card 
      className="card-glow cursor-pointer hover:bg-card-hover transition-smooth hover:shadow-[0_0_20px_rgba(0,82,204,0.3)]"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-md">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${resolvedColor}15` }}
          >
            <Icon className="h-6 w-6" style={{ color: resolvedColor }} />
          </div>
          <div className="text-metadata text-muted-foreground bg-muted px-3 py-1.5 rounded-full font-medium">
            {boardCount} {boardCount === 1 ? 'board' : 'boards'}
          </div>
        </div>
        <CardTitle className="text-base font-semibold text-foreground mb-2">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-body-sm text-muted-foreground line-clamp-2">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
