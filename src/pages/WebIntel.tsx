import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Handshake, Target, Globe, Youtube, Smartphone } from "lucide-react";
import { PageContainer, PageHeader, DataCard, EmptyState } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useWebIntelDeals } from "@/hooks/useWebIntelDeals";
import { useGdnTargetLists } from "@/hooks/useGdnTargetLists";
import { DealsTableView } from "@/components/webintel/DealsTableView";
import { DealFormDialog } from "@/components/webintel/DealFormDialog";
import { DealDetailDialog } from "@/components/webintel/DealDetailDialog";
import { TargetListDialog } from "@/components/webintel/TargetListDialog";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/lib/logger";

export default function WebIntel() {
  const {
    deals,
    isLoading: isLoadingDeals,
    createDeal,
    updateDeal,
    deleteDeal,
  } = useWebIntelDeals();

  const {
    lists,
    isLoading: isLoadingLists,
    createList,
    updateList,
    deleteList,
    getItemCounts,
  } = useGdnTargetLists();

  const [activeTab, setActiveTab] = useState("deals");
  const [dealFormDialogOpen, setDealFormDialogOpen] = useState(false);
  const [dealDetailDialogOpen, setDealDetailDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [viewingDeal, setViewingDeal] = useState<any>(null);
  const [deleteDealConfirmId, setDeleteDealConfirmId] = useState<string | null>(null);

  const [targetListDialogOpen, setTargetListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [deleteListConfirmId, setDeleteListConfirmId] = useState<string | null>(null);

  // Deal handlers
  const handleEditDeal = (deal: any) => {
    setEditingDeal(deal);
    setDealFormDialogOpen(true);
  };

  const handleViewDeal = (deal: any) => {
    setViewingDeal(deal);
    setDealDetailDialogOpen(true);
  };

  const handleSaveDeal = async (dealData: any) => {
    try {
      if (editingDeal) {
        await updateDeal.mutateAsync({ id: editingDeal.id, ...dealData });
        toast.success("Deal updated successfully");
      } else {
        await createDeal.mutateAsync(dealData);
        toast.success("Deal created successfully");
      }
      setEditingDeal(null);
    } catch (error) {
      logger.error("Error saving deal:", error);
      toast.error("Failed to save deal");
    }
  };

  const handleDeleteDeal = (dealId: string) => {
    setDeleteDealConfirmId(dealId);
  };

  const confirmDeleteDeal = async () => {
    if (!deleteDealConfirmId) return;
    try {
      await deleteDeal.mutateAsync(deleteDealConfirmId);
      toast.success("Deal deleted successfully");
      setDeleteDealConfirmId(null);
    } catch (error) {
      logger.error("Error deleting deal:", error);
      toast.error("Failed to delete deal");
    }
  };

  // Target List handlers
  const handleEditList = (list: any) => {
    setEditingList(list);
    setTargetListDialogOpen(true);
  };

  const handleSaveList = async (data: any) => {
    try {
      if (editingList) {
        // Update existing list metadata only - dialog handles item creation
        await updateList.mutateAsync({ id: editingList.id, ...data });
      }
      // For new lists, the dialog already creates the list with items
      // This callback is just a notification that save completed
      setEditingList(null);
      setTargetListDialogOpen(false);
    } catch (error) {
      logger.error("Error saving list:", error);
      toast.error("Failed to save list");
    }
  };

  const handleDeleteList = (listId: string) => {
    setDeleteListConfirmId(listId);
  };

  const confirmDeleteList = async () => {
    if (!deleteListConfirmId) return;
    try {
      await deleteList.mutateAsync(deleteListConfirmId);
      toast.success("Target list deleted");
      setDeleteListConfirmId(null);
    } catch (error) {
      logger.error("Error deleting list:", error);
      toast.error("Failed to delete list");
    }
  };

  const isLoading = isLoadingDeals || isLoadingLists;

  return (
    <PageContainer>
      <PageHeader
        icon={activeTab === "deals" ? Handshake : Target}
        title="Web Intel"
        description="Track brand deals and build GDN audience targeting lists"
        actions={
          <Button
            onClick={() => {
              if (activeTab === "deals") {
                setEditingDeal(null);
                setDealFormDialogOpen(true);
              } else {
                setEditingList(null);
                setTargetListDialogOpen(true);
              }
            }}
            className="rounded-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "deals" ? "Add Deal" : "Create Target List"}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-md">
        <TabsList>
          <TabsTrigger value="deals" className="gap-2">
            <Handshake className="h-4 w-4" />
            Brand Deals
            {deals.length > 0 && (
              <Badge variant="secondary" className="ml-1">{deals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="targets" className="gap-2">
            <Target className="h-4 w-4" />
            Target Lists
            {lists.length > 0 && (
              <Badge variant="secondary" className="ml-1">{lists.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deals">
          <DataCard noPadding>
            {isLoadingDeals ? (
              <div className="p-md">
                <TableSkeleton />
              </div>
            ) : deals.length === 0 ? (
              <EmptyState
                icon={Handshake}
                title="No brand deals yet"
                description="Add your first potential collaboration to start tracking partnerships"
                action={{
                  label: "Add Deal",
                  onClick: () => { setEditingDeal(null); setDealFormDialogOpen(true); }
                }}
              />
            ) : (
              <DealsTableView
                deals={deals}
                onView={handleViewDeal}
                onEdit={handleEditDeal}
                onDelete={handleDeleteDeal}
              />
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="targets">
          <DataCard noPadding>
            {isLoadingLists ? (
              <div className="p-md">
                <TableSkeleton />
              </div>
            ) : lists.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No target lists yet"
                description="Create your first GDN targeting list with websites, YouTube channels, and apps"
                action={{
                  label: "Create Target List",
                  onClick: () => { setEditingList(null); setTargetListDialogOpen(true); }
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => {
                    const counts = getItemCounts(list.id);
                    return (
                      <TableRow key={list.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEditList(list)}>
                        <TableCell className="font-medium">{list.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{list.entity}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-sm">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              {counts.websites}
                            </span>
                            <span className="flex items-center gap-1 text-sm">
                              <Youtube className="h-3 w-3 text-muted-foreground" />
                              {counts.youtube}
                            </span>
                            <span className="flex items-center gap-1 text-sm">
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                              {counts.apps}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(list.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataCard>
        </TabsContent>
      </Tabs>

      {/* Deal Dialogs */}
      <DealFormDialog
        open={dealFormDialogOpen}
        onOpenChange={(open) => { setDealFormDialogOpen(open); if (!open) setEditingDeal(null); }}
        deal={editingDeal}
        onSave={handleSaveDeal}
      />

      <DealDetailDialog
        open={dealDetailDialogOpen}
        onOpenChange={(open) => { setDealDetailDialogOpen(open); if (!open) setViewingDeal(null); }}
        deal={viewingDeal}
        onEdit={() => { setDealDetailDialogOpen(false); handleEditDeal(viewingDeal); }}
        onDelete={() => { setDealDetailDialogOpen(false); handleDeleteDeal(viewingDeal?.id); }}
      />

      <AlertDialog open={deleteDealConfirmId !== null} onOpenChange={(open) => !open && setDeleteDealConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this deal? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDeal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Target List Dialogs */}
      <TargetListDialog
        open={targetListDialogOpen}
        onOpenChange={(open) => { setTargetListDialogOpen(open); if (!open) setEditingList(null); }}
        list={editingList}
        onSave={handleSaveList}
      />

      <AlertDialog open={deleteListConfirmId !== null} onOpenChange={(open) => !open && setDeleteListConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target List</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this target list and all its items? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
