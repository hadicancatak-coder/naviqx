import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Trash2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LinkPopoverProps {
  text: string;
  url: string;
  linkIndex: number;
  onEdit: (linkIndex: number, newUrl: string, newText: string) => void;
  onRemove: (linkIndex: number) => void;
  children: React.ReactNode;
}

export function LinkPopover({ text, url, linkIndex, onEdit, onRemove, children }: LinkPopoverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(url);
  const [editText, setEditText] = useState(text);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onEdit(linkIndex, editUrl, editText);
    setIsEditing(false);
  };

  const handleRemove = () => {
    onRemove(linkIndex);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        {!isEditing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-body-sm font-medium">{text}</p>
              <p className="text-metadata text-muted-foreground truncate">{url}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex-1"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="link-text">Text</Label>
              <Input
                id="link-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Link text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                className="flex-1"
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditUrl(url);
                  setEditText(text);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
