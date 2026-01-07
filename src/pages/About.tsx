import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Mail, Edit, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: string | null;
  updated_at: string;
}

// Simple markdown renderer
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1 list-disc list-inside ml-md mb-md">
          {listItems.map((item, i) => (
            <li key={i} className="text-body-sm text-muted-foreground">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-heading-md font-semibold mt-lg mb-sm text-foreground">
          {trimmed.replace('## ', '')}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-heading-sm font-semibold mt-md mb-sm text-foreground">
          {trimmed.replace('### ', '')}
        </h3>
      );
    } else if (trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(trimmed.replace('- ', ''));
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      flushList();
      elements.push(
        <p key={index} className="text-body font-medium text-foreground mt-2">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    } else if (trimmed === '---') {
      flushList();
      elements.push(<hr key={index} className="my-6 border-border" />);
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={index} className="text-body-sm text-muted-foreground mb-2">
          {trimmed}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

export default function About() {
  const { userRole } = useAuth();
  const [pageData, setPageData] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPageData();
  }, []);

  const fetchPageData = async () => {
    const { data, error } = await supabase
      .from('cms_pages')
      .select('*')
      .eq('slug', 'about')
      .single();

    if (error) {
      console.error('Error fetching about page:', error);
    } else {
      setPageData(data);
    }
    setLoading(false);
  };

  const handleEdit = () => {
    if (pageData) {
      setEditContent(pageData.content);
      setEditVersion(pageData.version || '');
      setEditDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (!pageData) return;
    setSaving(true);

    const { error } = await supabase
      .from('cms_pages')
      .update({
        content: editContent,
        version: editVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageData.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Page updated');
      setEditDialogOpen(false);
      fetchPageData();
    }
    setSaving(false);
  };

  const currentVersion = pageData?.version || "2.0";

  return (
    <div className="p-lg space-y-lg max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        title="Prisma"
        description="Comprehensive Task & Campaign Management Platform"
        actions={
          userRole === 'admin' ? (
            <Button variant="outline" onClick={handleEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Page
            </Button>
          ) : undefined
        }
      />

      {/* App Information */}
      <Card className="p-lg bg-card border-border">
        <div className="flex items-start gap-lg">
          <div className="flex-1">
            <Badge variant="secondary" className="mb-md">
              Version {currentVersion}
            </Badge>
            <p className="text-body-sm text-muted-foreground">
              Prisma is a powerful platform designed to streamline task management, campaign coordination, and team
              collaboration. Built with security and efficiency in mind, it helps teams stay organized and productive.
              Created by and for the CFI Global Performance Marketing Team.
            </p>
          </div>
        </div>
      </Card>

      {/* CMS Content */}
      <Card className="p-lg bg-card border-border">
        <div className="flex items-center gap-sm mb-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-heading-md font-semibold">What's New</h2>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-md">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        ) : pageData ? (
          <div className="prose prose-sm max-w-none">
            {renderMarkdown(pageData.content)}
          </div>
        ) : (
          <p className="text-muted-foreground">Content not available.</p>
        )}
      </Card>

      {/* Support & Contact */}
      <Card className="p-lg bg-card border-border">
        <div className="flex items-center gap-sm mb-md">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-heading-sm font-semibold">Support & Contact</h2>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-body-sm font-medium">Support Email</p>
            <a href="mailto:h.catak@cfi.trade" className="text-body-sm text-primary hover:underline">
              h.catak@cfi.trade
            </a>
          </div>

          <div>
            <p className="text-body-sm font-medium">Organization</p>
            <p className="text-body-sm text-muted-foreground">PerMar at CFI Financial Group</p>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-metadata text-muted-foreground pt-4">
        <p>© 2025 Prisma. All rights reserved.</p>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit About Page</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-md py-md">
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={editVersion}
                onChange={(e) => setEditVersion(e.target.value)}
                placeholder="e.g., 2.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[400px] font-mono text-body-sm"
                placeholder="Use markdown formatting..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
