import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Library, Search } from 'lucide-react';
import { useAdElements } from '@/hooks/useAdElements';
import { Badge } from '@/components/ui/badge';

interface ElementQuickInsertProps {
  elementType: 'headline' | 'description' | 'sitelink' | 'callout';
  onInsert: (content: string) => void;
}

export function ElementQuickInsert({ elementType, onInsert }: ElementQuickInsertProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: elements } = useAdElements({
    elementType,
    search: search || undefined,
  });

  const handleInsert = (content: string | Record<string, unknown>) => {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    onInsert(text);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Library className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search saved elements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>

          <ScrollArea className="h-72">
            <div className="space-y-2">
              {elements && elements.length > 0 ? (
                elements.map((element) => {
                  const content = typeof element.content === 'string' 
                    ? element.content 
                    : JSON.stringify(element.content);
                  
                  return (
                    <div
                      key={element.id}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleInsert(element.content)}
                    >
                      <p className="text-sm">{content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {element.entity && element.entity.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {element.entity[0]}
                          </Badge>
                        )}
                        {element.google_status === 'approved' && (
                          <Badge variant="outline" className="text-xs status-success">
                            Approved
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          Used {element.use_count}x
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No saved elements found
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
