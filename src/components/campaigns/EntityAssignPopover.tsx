import { useState } from "react";
import { Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { ENTITY_TRACKING_STATUSES, EntityTrackingStatus } from "@/domain/campaigns";
import { cn } from "@/lib/utils";

interface EntityAssignPopoverProps {
  selectedCampaigns: string[];
  onAssign: (entities: string[], status: EntityTrackingStatus) => Promise<void>;
  disabled?: boolean;
  trigger?: React.ReactNode;
}

export function EntityAssignPopover({
  selectedCampaigns,
  onAssign,
  disabled,
  trigger,
}: EntityAssignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [status, setStatus] = useState<EntityTrackingStatus>("Draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: entities = [] } = useSystemEntities();

  const toggleEntity = (entityName: string) => {
    setSelectedEntities(prev =>
      prev.includes(entityName)
        ? prev.filter(e => e !== entityName)
        : [...prev, entityName]
    );
  };

  const handleApply = async () => {
    if (selectedEntities.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onAssign(selectedEntities, status);
      setOpen(false);
      setSelectedEntities([]);
      setStatus("Draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedEntities([]);
      setStatus("Draft");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || selectedCampaigns.length === 0}
          >
            <Building2 className="size-4 mr-1" />
            Assign to Entity
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-md" align="start">
        <div className="space-y-md">
          <div>
            <p className="text-body-sm font-medium mb-sm">Select Entities</p>
            <div className="flex flex-wrap gap-xs">
              {entities.map((entity) => {
                const isSelected = selectedEntities.includes(entity.name);
                return (
                  <Badge
                    key={entity.name}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-smooth",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => toggleEntity(entity.name)}
                  >
                    {isSelected && <Check className="size-3 mr-1" />}
                    {entity.emoji} {entity.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-body-sm font-medium mb-sm">Status</p>
            <Select value={status} onValueChange={(v) => setStatus(v as EntityTrackingStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TRACKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleApply}
            disabled={selectedEntities.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Applying..." : `Apply to ${selectedCampaigns.length} campaign${selectedCampaigns.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
