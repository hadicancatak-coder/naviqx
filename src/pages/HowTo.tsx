import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Save, X, BookOpen } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCmsPage, useUpdateCmsPage } from "@/hooks/useCmsPage";

// Simple markdown renderer
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let inList = false;
  let listItems: { text: string; isNumbered: boolean; number?: number }[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      const isNumbered = listItems[0].isNumbered;
      if (isNumbered) {
        elements.push(
          <ol key={`list-${elements.length}`} className="space-y-1 list-decimal list-inside ml-md mb-md">
            {listItems.map((item, i) => (
              <li key={i} className="text-body-sm text-muted-foreground">{item.text}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-1 list-disc list-inside ml-md mb-md">
            {listItems.map((item, i) => (
              <li key={i} className="text-body-sm text-muted-foreground">{item.text}</li>
            ))}
          </ul>
        );
      }
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
      listItems.push({ text: trimmed.replace('- ', ''), isNumbered: false });
    } else if (/^\d+\.\s/.test(trimmed)) {
      inList = true;
      listItems.push({ text: trimmed.replace(/^\d+\.\s/, ''), isNumbered: true });
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

export default function HowTo() {
  const { userRole } = useAuth();
  const { data: pageData, isLoading } = useCmsPage("how-to");
  const updatePage = useUpdateCmsPage();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState("");

  const handleEdit = () => {
    if (pageData) {
      setEditContent(pageData.content);
      setEditDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (!pageData) return;
    
    await updatePage.mutateAsync({
      id: pageData.id,
      content: editContent,
    });
    
    setEditDialogOpen(false);
  };

  return (
    <PageContainer size="narrow" className="animate-fade-in">
      <PageHeader
        title="How to Use Prisma"
        description="Learn how to get the most out of the platform"
        actions={
          userRole === 'admin' ? (
            <Button variant="outline" onClick={handleEdit} className="gap-sm">
              <Edit className="h-4 w-4" />
              Edit Page
            </Button>
          ) : undefined
        }
      />

      {/* Content */}
      <Card className="p-lg liquid-glass-elevated border-border/50">
        <div className="flex items-center gap-sm mb-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-heading-md font-semibold">User Guide</h2>
        </div>

        {isLoading ? (
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col liquid-glass-elevated border-border/50">
          <DialogHeader>
            <DialogTitle>Edit How To Page</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-md py-md">
            <div className="space-y-sm">
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
            <Button onClick={handleSave} disabled={updatePage.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updatePage.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
