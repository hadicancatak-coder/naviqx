import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdVersions, useRestoreAdVersion, AdVersion } from '@/hooks/useAdVersions';
import { History, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AdVersionHistoryProps {
  adId: string;
}

export function AdVersionHistory({ adId }: AdVersionHistoryProps) {
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<AdVersion | null>(null);
  const { data: versions, isLoading } = useAdVersions(adId);
  const restoreVersion = useRestoreAdVersion();

  const handleRestore = async (snapshotData: Record<string, unknown>, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { id, created_at, updated_at, version, ...restoreData } = snapshotData;
    restoreVersion.mutate({ adId, versionData: restoreData });
    setShowRestoreConfirm(null);
  };

  if (isLoading) {
    return <div className="text-body-sm text-muted-foreground">Loading history...</div>;
  }

  return (
    <Card className="p-md">
      <div className="flex items-center gap-sm mb-md">
        <History className="w-4 h-4" />
        <h3 className="font-semibold">Version History</h3>
      </div>

      <ScrollArea className="h-96">
        {versions && versions.length > 0 ? (
          <div className="space-y-sm">
            {versions.map((version) => (
              <div key={version.id} className="border rounded-lg p-sm">
                <div className="flex items-start justify-between mb-sm">
                  <div>
                    <p className="font-medium text-body-sm">Version {version.version_number}</p>
                    <p className="text-metadata text-muted-foreground">
                      {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <AlertDialog open={showRestoreConfirm?.id === version.id} onOpenChange={(open) => !open && setShowRestoreConfirm(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setShowRestoreConfirm(version); }}
                      >
                        <RotateCcw className="w-3 h-3 mr-xs" />
                        Restore
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore this version?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create a new version with the restored content.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => handleRestore(version.snapshot_data, e)}
                        >
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {version.changed_fields && version.changed_fields.length > 0 && (
                  <div className="flex flex-wrap gap-xs mt-sm">
                    {version.changed_fields.map((field) => (
                      <Badge key={field} variant="secondary" className="text-metadata">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground text-center py-lg">
            No version history yet
          </p>
        )}
      </ScrollArea>
    </Card>
  );
}
