import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

const PLATFORMS = [
  { value: "ppc", label: "PPC" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "snap", label: "Snap" },
  { value: "reddit", label: "Reddit" },
  { value: "whatsapp", label: "WhatsApp" },
];

interface PlatformMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function PlatformMultiSelect({ value, onChange, disabled }: PlatformMultiSelectProps) {
  const togglePlatform = (platform: string) => {
    const newValue = value.includes(platform)
      ? value.filter(v => v !== platform)
      : [...value, platform];
    onChange(newValue);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto min-h-8 justify-start gap-2 flex-wrap"
          disabled={disabled}
        >
          {value.length === 0 ? (
            <span className="text-muted-foreground">Select platforms</span>
          ) : (
            value.map((platform) => (
              <Badge key={platform} variant="secondary" className="text-metadata">
                {PLATFORMS.find(p => p.value === platform)?.label || platform}
              </Badge>
            ))
          )}
          <ChevronDown className="h-3 w-3 ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2">
        <div className="space-y-2">
          {PLATFORMS.map((platform) => (
            <div key={platform.value} className="flex items-center gap-2">
              <Checkbox
                id={`platform-${platform.value}`}
                checked={value.includes(platform.value)}
                onCheckedChange={() => togglePlatform(platform.value)}
              />
              <label
                htmlFor={`platform-${platform.value}`}
                className="text-body-sm cursor-pointer flex-1"
              >
                {platform.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
