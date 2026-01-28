import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText, Layers, Plus, Search, ChevronsRight, ChevronsDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdContextMenu } from "./AdContextMenu";
import { MoveAdDialog } from "./MoveAdDialog";
import { DuplicateAdDialog } from "./DuplicateAdDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import { TreeNode } from "@/hooks/useAccountStructure";

interface AccountStructureTreeProps {
  selectedNodeId?: string;
  onSelectNode: (node: TreeNode) => void;
  onCreateCampaign?: (entityName: string) => void;
  onCreateAdGroup?: (campaignId: string, campaignName: string) => void;
  onCreateAd?: (adGroupId: string, adGroupName: string) => void;
}

export function AccountStructureTree({ 
  selectedNodeId, 
  onSelectNode,
  onCreateCampaign,
  onCreateAdGroup,
  onCreateAd 
}: AccountStructureTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [moveDialogState, setMoveDialogState] = useState<{open: boolean, adId: string, currentAdGroupId?: string} | null>(null);
  const [duplicateDialogState, setDuplicateDialogState] = useState<{open: boolean, adId: string} | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch entities from entity_presets
  const { data: entityPresets } = useQuery({
    queryKey: ['entity-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_presets')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch campaigns with entity info
  const { data: campaigns } = useQuery({
    queryKey: ['search-campaigns-tree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch ad groups
  const { data: adGroups } = useQuery({
    queryKey: ['ad-groups-tree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch ads with version counts
  const { data: ads } = useQuery({
    queryKey: ['ads-tree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('id, name, ad_group_id, approval_status')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch ad version counts
  const { data: versionCounts } = useQuery({
    queryKey: ['ad-version-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_versions')
        .select('ad_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(v => {
        counts[v.ad_id] = (counts[v.ad_id] || 0) + 1;
      });
      return counts;
    }
  });

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allNodeIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          allNodeIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(buildTree());
    setExpandedNodes(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleDeleteAd = async (adId: string) => {
    setDeleteConfirmId(adId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', deleteConfirmId);
    
    if (error) {
      logger.error('Delete ad error:', error);
      toast.error("Failed to delete ad: " + (error.message || "Unknown error"));
    } else {
      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['ads'] });
      await queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['ad-groups'] });
      toast.success("Ad deleted successfully");
    }
    
    setDeleteConfirmId(null);
  };

  const buildTree = (): TreeNode[] => {
    if (!entityPresets) return [];

    const tree: TreeNode[] = [];

    entityPresets.forEach(preset => {
      preset.entities?.forEach((entityName: string) => {
        const entityNode: TreeNode = {
          id: `entity-${entityName}`,
          type: 'entity',
          name: entityName,
          children: []
        };

        // Find campaigns for this entity
        const entityCampaigns = campaigns?.filter(c => c.entity === entityName) || [];
        
        entityCampaigns.forEach(campaign => {
          const campaignNode: TreeNode = {
            id: `campaign-${campaign.id}`,
            type: 'campaign',
            name: campaign.name,
            status: campaign.status,
            parentId: entityNode.id,
            children: [],
            languages: campaign.languages || []
          };

          // Find ad groups for this campaign
          const campaignAdGroups = adGroups?.filter(ag => ag.campaign_id === campaign.id) || [];
          
          campaignAdGroups.forEach(adGroup => {
            const adGroupNode: TreeNode = {
              id: `adgroup-${adGroup.id}`,
              type: 'adgroup',
              name: adGroup.name,
              status: adGroup.status,
              parentId: campaignNode.id,
              children: []
            };

            // Find ads for this ad group
            const adGroupAds = ads?.filter(ad => ad.ad_group_id === adGroup.id) || [];
            
            adGroupAds.forEach(ad => {
              const adNode: TreeNode = {
                id: `ad-${ad.id}`,
                type: 'ad',
                name: ad.name,
                status: ad.approval_status || 'pending',
                versionCount: versionCounts?.[ad.id] || 0,
                parentId: adGroupNode.id
              };
              adGroupNode.children?.push(adNode);
            });

            campaignNode.children?.push(adGroupNode);
          });

          entityNode.children?.push(campaignNode);
        });

        // Always add entity to tree, even if it has no campaigns
        tree.push(entityNode);
      });
    });

    return tree;
  };

  const filterTree = (nodes: TreeNode[]): TreeNode[] => {
    if (!searchQuery) return nodes;

    return nodes.reduce<TreeNode[]>((acc, node) => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
      const filteredChildren = node.children ? filterTree(node.children) : [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });
      }
      
      return acc;
    }, []);
  };

  const renderNode = (node: TreeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    const getIcon = () => {
      switch (node.type) {
        case 'entity':
          return <Layers className="h-4 w-4 text-primary" />;
        case 'campaign':
          return hasChildren && isExpanded ? <FolderOpen className="h-4 w-4 text-info" /> : <Folder className="h-4 w-4 text-info" />;
        case 'adgroup':
          return hasChildren && isExpanded ? <FolderOpen className="h-4 w-4 text-purple" /> : <Folder className="h-4 w-4 text-purple" />;
        case 'ad':
          return <FileText className="h-4 w-4 text-success" />;
        default:
          return null;
      }
    };

    const getStatusBadge = () => {
      if (!node.status) return null;
      
      const statusColors: Record<string, string> = {
        active: 'bg-success-soft text-success-text border-success/30',
        draft: 'bg-neutral-soft text-neutral-text border-border',
        paused: 'bg-warning-soft text-warning-text border-warning/30',
        pending: 'bg-info-soft text-info-text border-info/30',
        approved: 'bg-success-soft text-success-text border-success/30',
        rejected: 'bg-destructive-soft text-destructive-text border-destructive/30'
      };

      return (
        <Badge variant="outline" className={cn("text-xs h-5", statusColors[node.status] || '')}>
          {node.status}
        </Badge>
      );
    };

    const nodeContent = (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
            isSelected && "bg-muted"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onSelectNode(node)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0 hover:bg-muted rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          {getIcon()}
          
          <span className="flex-1 text-sm truncate">{node.name}</span>
          
          {/* Quick Action Button - only on hover */}
          {hoveredNode === node.id && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (node.type === 'entity') onCreateCampaign?.(node.name);
                if (node.type === 'campaign') onCreateAdGroup?.(node.id.replace('campaign-', ''), node.name);
                if (node.type === 'adgroup') onCreateAd?.(node.id.replace('adgroup-', ''), node.name);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          
          {node.versionCount && node.versionCount > 0 && (
            <Badge variant="secondary" className="text-xs h-5 shrink-0">
              v{node.versionCount}
            </Badge>
          )}
          
          {getStatusBadge()}
          
          {/* Language badges for campaigns */}
          {node.type === 'campaign' && (node as any).languages && (node as any).languages.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {(node as any).languages.map((lang: string) => (
                <Badge key={lang} variant="outline" className="text-xs h-5 px-1">
                  {lang}
                </Badge>
              ))}
            </div>
          )}
          
          {hasChildren && (
            <Badge variant="outline" className="text-xs h-5 shrink-0">
              {node.children?.length}
            </Badge>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children?.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );

    // Wrap ads in context menu
    if (node.type === 'ad') {
      const adId = node.id.replace('ad-', '');
      const adGroupId = node.parentId?.replace('adgroup-', '');
      
      return (
        <AdContextMenu
          key={node.id}
          node={node}
          onMove={() => setMoveDialogState({ open: true, adId, currentAdGroupId: adGroupId })}
          onDuplicate={() => setDuplicateDialogState({ open: true, adId })}
          onDelete={() => handleDeleteAd(adId)}
          onEdit={() => onSelectNode(node)}
        >
          {nodeContent}
        </AdContextMenu>
      );
    }

    return nodeContent;
  };

  const tree = buildTree();
  const filteredTree = filterTree(tree);

  const totalCampaigns = campaigns?.length || 0;
  const totalAdGroups = adGroups?.length || 0;
  const totalAds = ads?.length || 0;

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Account Structure</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={expandAll}
              title="Expand All"
            >
              <ChevronsDown />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={collapseAll}
              title="Collapse All"
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{tree.length} entities</span>
          <span>•</span>
          <span>{totalCampaigns} campaigns</span>
          <span>•</span>
          <span>{totalAdGroups} groups</span>
          <span>•</span>
          <span>{totalAds} ads</span>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "No matches found" : "No campaigns found. Create a campaign to get started."}
            </div>
          ) : (
            filteredTree.map(node => renderNode(node))
          )}
        </div>
      </ScrollArea>

      {/* Move and Duplicate Dialogs */}
      {moveDialogState && (
        <MoveAdDialog
          open={moveDialogState.open}
          onOpenChange={(open) => !open && setMoveDialogState(null)}
          adId={moveDialogState.adId}
          currentAdGroupId={moveDialogState.currentAdGroupId}
          onSuccess={() => {
            setMoveDialogState(null);
            // Refresh queries will happen automatically via React Query
          }}
        />
      )}

      {duplicateDialogState && (
        <DuplicateAdDialog
          open={duplicateDialogState.open}
          onOpenChange={(open) => !open && setDuplicateDialogState(null)}
          adId={duplicateDialogState.adId}
          onSuccess={() => {
            setDuplicateDialogState(null);
          }}
        />
      )}

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ad? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
