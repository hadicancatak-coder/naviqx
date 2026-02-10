import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Upload, X, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CampaignAsset {
  id: string;
  campaign_id: string | null;
  ad_id: string | null;
  asset_type: string;
  asset_url: string;
  file_name: string | null;
  dimensions: string | null;
  aspect_ratio: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  policy_status: string;
  sort_order: number;
  created_at: string;
}

// Asset type definitions with their constraints
const ASSET_TYPE_CONFIG: Record<string, { label: string; accept: string; aspectRatio: string; category: 'image' | 'video' | 'logo' }> = {
  image_square: { label: 'Image 1:1', accept: 'image/*', aspectRatio: '1:1', category: 'image' },
  image_landscape: { label: 'Image 1.91:1', accept: 'image/*', aspectRatio: '1.91:1', category: 'image' },
  video_landscape: { label: 'Video Landscape', accept: 'video/*', aspectRatio: '16:9', category: 'video' },
  video_square: { label: 'Video Square', accept: 'video/*', aspectRatio: '1:1', category: 'video' },
  video_portrait: { label: 'Video Portrait', accept: 'video/*', aspectRatio: '9:16', category: 'video' },
  logo_square: { label: 'Logo 1:1', accept: 'image/*', aspectRatio: '1:1', category: 'logo' },
  logo_wide: { label: 'Logo 4:1', accept: 'image/*', aspectRatio: '4:1', category: 'logo' },
};

const POLICY_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

interface AssetPickerProps {
  adId?: string;
  campaignId?: string;
  assetTypes: string[]; // which types to show
  onAssetsChange?: (assets: CampaignAsset[]) => void;
}

export function AssetPicker({ adId, campaignId, assetTypes, onAssetsChange }: AssetPickerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch assets for this ad/campaign
  const { data: assets = [] } = useQuery({
    queryKey: ['campaign-assets', adId, campaignId],
    queryFn: async () => {
      let query = supabase.from('campaign_assets').select('*').order('sort_order');
      if (adId) query = query.eq('ad_id', adId);
      else if (campaignId) query = query.eq('campaign_id', campaignId);
      else return [];
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CampaignAsset[];
    },
    enabled: !!(adId || campaignId),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, assetType }: { file: File; assetType: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const storagePath = `${campaignId || 'general'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-assets')
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase.from('campaign_assets').insert({
        campaign_id: campaignId || null,
        ad_id: adId || null,
        asset_type: assetType,
        asset_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        aspect_ratio: ASSET_TYPE_CONFIG[assetType]?.aspectRatio || null,
        created_by: user?.id || null,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Asset uploaded');
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase.from('campaign_assets').delete().eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Asset removed');
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
    },
  });

  const handleFileUpload = useCallback((assetType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ASSET_TYPE_CONFIG[assetType]?.accept || 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error('File size must be under 20MB');
          return;
        }
        uploadMutation.mutate({ file, assetType });
      }
    };
    input.click();
  }, [uploadMutation]);

  const filteredAssets = typeFilter === 'all' 
    ? assets.filter(a => assetTypes.includes(a.asset_type))
    : assets.filter(a => a.asset_type === typeFilter);

  const categories = assetTypes.reduce<Record<string, string[]>>((acc, type) => {
    const cat = ASSET_TYPE_CONFIG[type]?.category || 'image';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(type);
    return acc;
  }, {});

  return (
    <div className="space-y-md">
      {/* Upload slots by category */}
      {Object.entries(categories).map(([category, types]) => (
        <div key={category} className="space-y-sm">
          <Label className="text-metadata font-medium text-muted-foreground uppercase tracking-wide">
            {category === 'image' ? 'Images' : category === 'video' ? 'Videos' : 'Logos'}
          </Label>
          <div className="grid grid-cols-2 gap-sm">
            {types.map(assetType => {
              const config = ASSET_TYPE_CONFIG[assetType];
              const typeAssets = assets.filter(a => a.asset_type === assetType);
              
              return (
                <div key={assetType} className="space-y-xs">
                  <span className="text-metadata text-muted-foreground">{config?.label}</span>
                  
                  {/* Existing assets */}
                  {typeAssets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onDelete={() => deleteMutation.mutate(asset.id)} />
                  ))}

                  {/* Upload slot */}
                  <button
                    onClick={() => handleFileUpload(assetType)}
                    disabled={uploadMutation.isPending}
                    className={cn(
                      "w-full border-2 border-dashed border-border rounded-lg p-sm",
                      "flex flex-col items-center justify-center gap-xs",
                      "hover:border-primary/50 hover:bg-card-hover transition-smooth cursor-pointer",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-metadata">Upload {config?.aspectRatio}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Assets grid */}
      {filteredAssets.length > 0 && (
        <div className="space-y-sm">
          <Label className="text-metadata font-medium text-muted-foreground uppercase tracking-wide">
            Uploaded Assets ({filteredAssets.length})
          </Label>
          <div className="grid grid-cols-2 gap-sm">
            {filteredAssets.map(asset => (
              <AssetCard key={asset.id} asset={asset} onDelete={() => deleteMutation.mutate(asset.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset, onDelete }: { asset: CampaignAsset; onDelete: () => void }) {
  const config = ASSET_TYPE_CONFIG[asset.asset_type];
  const policyBadge = POLICY_BADGE[asset.policy_status] || POLICY_BADGE.pending;
  const isImage = asset.mime_type?.startsWith('image/');

  return (
    <Card className="bg-card border-border rounded-lg overflow-hidden group relative">
      {/* Thumbnail */}
      <div className="aspect-square bg-muted/50 flex items-center justify-center relative">
        {isImage ? (
          <img src={asset.asset_url} alt={asset.file_name || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center space-y-xs">
            <Image className="h-6 w-6 text-muted-foreground/50 mx-auto" />
            <span className="text-metadata text-muted-foreground">{config?.label}</span>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 p-xs bg-destructive/80 text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-smooth"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Info */}
      <div className="p-xs space-y-xs">
        <p className="text-metadata text-foreground truncate">{asset.file_name || config?.label}</p>
        <div className="flex items-center justify-between">
          <Badge variant={policyBadge.variant} className="text-[10px]">
            {policyBadge.label}
          </Badge>
          {asset.aspect_ratio && (
            <span className="text-[10px] text-muted-foreground">{asset.aspect_ratio}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
