import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const reportSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  link: z.string().trim().url("Please enter a valid URL").max(500, "URL must be less than 500 characters"),
});

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReportDialog({ open, onOpenChange, onSuccess }: ReportDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [updateFrequency, setUpdateFrequency] = useState("monthly");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = reportSchema.parse({
        title,
        link,
      });

      const { error } = await supabase.from("reports").insert({
        title: validated.title,
        link: validated.link,
        update_frequency: updateFrequency,
        type: "sheet",
        created_by: user?.id
      });

      if (error) throw error;

      toast({ title: "Success", description: "Report created successfully" });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create report", variant: "destructive" });
      }
    }
  };

  const resetForm = () => {
    setTitle("");
    setLink("");
    setUpdateFrequency("monthly");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Report</DialogTitle>
          <DialogDescription>Add a new report link</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
            />
          </div>

          <div>
            <Label htmlFor="link">Link *</Label>
            <Input
              id="link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="frequency">Update Frequency</Label>
            <Select value={updateFrequency} onValueChange={setUpdateFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-xs justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Report</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
