import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface BoardCardProps {
  id: string;
  name: string;
  description: string;
  route: string;
  icon?: string;
  color?: string;
  isStarred?: boolean;
  stats?: string;
  lastUpdated?: string;
  onStarToggle?: (id: string) => void;
}

export function BoardCard({ 
  id,
  name, 
  description, 
  route,
  icon = "FileText", 
  color,
  isStarred = false,
  stats,
  lastUpdated,
  onStarToggle
}: BoardCardProps) {
  const navigate = useNavigate();
  const [starred, setStarred] = useState(isStarred);
  const Icon = (Icons[icon as keyof typeof Icons] as LucideIcon) || Icons.FileText;

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(!starred);
    onStarToggle?.(id);
  };

  return (
    <Card 
      className="card-glow cursor-pointer hover:bg-card-hover transition-smooth hover:shadow-[0_0_20px_rgba(0,82,204,0.3)] relative"
      onClick={() => navigate(route)}
    >
      <CardHeader className="pb-sm">
        <div className="flex items-center justify-between mb-md">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: color ? `${color}15` : 'hsl(var(--muted) / 0.3)' }}
          >
            <Icon className="h-6 w-6" style={{ color: color || 'hsl(var(--primary))' }} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleStarClick}
          >
            <Star 
              className={`h-4 w-4 ${starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
            />
          </Button>
        </div>
        <CardTitle className="text-body font-semibold text-foreground mb-sm">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-sm pt-0">
        <CardDescription className="text-body-sm text-muted-foreground line-clamp-2 min-h-[40px]">
          {description}
        </CardDescription>
        <div className="flex items-center justify-between pt-sm border-t border-border/50">
          {stats && (
            <Badge variant="secondary" className="text-metadata">
              {stats}
            </Badge>
          )}
          {lastUpdated && (
            <span className="text-metadata text-muted-foreground">
              {lastUpdated}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
