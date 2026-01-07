import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Target, Edit, Search, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KPI {
  id: string;
  description: string;
  weight: number;
  timeline?: string;
}

interface ProfileWithKPIs {
  user_id: string;
  name: string;
  avatar_url: string;
  email: string;
  kpis: any;
  quarterly_kpis: any;
}

export function TeamKPIsManager() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileWithKPIs[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithKPIs | null>(null);
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [kpiType, setKpiType] = useState<'annual' | 'quarterly'>('annual');
  const [localKPIs, setLocalKPIs] = useState<KPI[]>([]);

  useEffect(() => {
    fetchTeamKPIs();
  }, []);

  useEffect(() => {
    if (selectedProfile && kpiDialogOpen) {
      const kpis = kpiType === 'annual' ? selectedProfile.kpis : selectedProfile.quarterly_kpis;
      setLocalKPIs(Array.isArray(kpis) ? kpis : []);
    }
  }, [selectedProfile, kpiDialogOpen, kpiType]);

  const fetchTeamKPIs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, email, kpis, quarterly_kpis")
        .order("name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditKPIs = (profile: ProfileWithKPIs, type: 'annual' | 'quarterly') => {
    setSelectedProfile(profile);
    setKpiType(type);
    setKpiDialogOpen(true);
  };

  const handleSaveKPIs = async () => {
    if (!selectedProfile) return;

    const field = kpiType === 'annual' ? 'kpis' : 'quarterly_kpis';
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: localKPIs })
        .eq("user_id", selectedProfile.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${kpiType === 'annual' ? 'Annual' : 'Quarterly'} KPIs updated successfully`,
      });

      setKpiDialogOpen(false);
      fetchTeamKPIs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addKPI = () => {
    setLocalKPIs([...localKPIs, { id: crypto.randomUUID(), description: '', weight: 0, timeline: 'Q1' }]);
  };

  const updateKPI = (id: string, field: keyof KPI, value: any) => {
    setLocalKPIs(localKPIs.map(kpi => kpi.id === id ? { ...kpi, [field]: value } : kpi));
  };

  const removeKPI = (id: string) => {
    setLocalKPIs(localKPIs.filter(kpi => kpi.id !== id));
  };

  const totalWeight = localKPIs.reduce((sum, kpi) => sum + (kpi.weight || 0), 0);

  const getKPIStats = () => {
    const totalMembers = profiles.length;
    const membersWithAnnualKPIs = profiles.filter(p => Array.isArray(p.kpis) && p.kpis.length > 0).length;
    const membersWithQuarterlyKPIs = profiles.filter(p => Array.isArray(p.quarterly_kpis) && p.quarterly_kpis.length > 0).length;
    const avgKPIsPerPerson = profiles.reduce((acc, p) => {
      const kpiCount = (Array.isArray(p.kpis) ? p.kpis.length : 0) + (Array.isArray(p.quarterly_kpis) ? p.quarterly_kpis.length : 0);
      return acc + kpiCount;
    }, 0) / (totalMembers || 1);

    return { totalMembers, membersWithAnnualKPIs, membersWithQuarterlyKPIs, avgKPIsPerPerson };
  };

  const stats = getKPIStats();

  const filteredProfiles = search
    ? profiles.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team KPIs Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team KPIs Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-body-sm text-muted-foreground">Team Members</p>
              <p className="text-heading-lg font-bold">{stats.totalMembers}</p>
            </div>
            <div className="p-4 bg-info-soft rounded-lg">
              <p className="text-body-sm text-muted-foreground">With Annual KPIs</p>
              <p className="text-heading-lg font-bold text-info-text">{stats.membersWithAnnualKPIs}</p>
            </div>
            <div className="p-4 bg-purple-soft rounded-lg">
              <p className="text-body-sm text-muted-foreground">With Quarterly KPIs</p>
              <p className="text-heading-lg font-bold text-purple-text">{stats.membersWithQuarterlyKPIs}</p>
            </div>
            <div className="p-4 bg-success-soft rounded-lg">
              <p className="text-body-sm text-muted-foreground">Avg KPIs/Person</p>
              <p className="text-heading-lg font-bold text-success-text">{stats.avgKPIsPerPerson.toFixed(1)}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Team Members List */}
          <div className="space-y-3">
            {filteredProfiles.map(profile => {
              const annualKPIs = Array.isArray(profile.kpis) ? profile.kpis : [];
              const quarterlyKPIs = Array.isArray(profile.quarterly_kpis) ? profile.quarterly_kpis : [];
              const annualWeight = annualKPIs.reduce((sum: number, kpi: any) => sum + (kpi.weight || 0), 0);
              const quarterlyWeight = quarterlyKPIs.reduce((sum: number, kpi: any) => sum + (kpi.weight || 0), 0);

              return (
                <div key={profile.user_id} className="p-4 border rounded-lg hover:bg-muted/50 transition-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>{profile.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold">{profile.name}</h4>
                        <p className="text-body-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-info-soft text-info-text border-info/30">
                            📊 Annual: {annualKPIs.length} ({annualWeight}%)
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditKPIs(profile, 'annual')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="bg-purple-soft text-purple-text border-purple/30">
                            📈 Quarterly: {quarterlyKPIs.length} ({quarterlyWeight}%)
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditKPIs(profile, 'quarterly')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Show KPIs inline */}
                  {annualKPIs.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-metadata font-semibold text-muted-foreground mb-2">Annual KPIs:</p>
                      <div className="space-y-1">
                        {annualKPIs.map((kpi: any, idx: number) => (
                          <div key={idx} className="text-body-sm flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-info" />
                            <span className="flex-1">{kpi.description}</span>
                            <Badge variant="secondary" className="text-metadata">{kpi.weight}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProfiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No team members found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline KPI Editor Dialog */}
      <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {kpiType === 'annual' ? 'Annual' : 'Quarterly'} KPIs - {selectedProfile?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total Weight: <span className={totalWeight > 100 ? 'text-destructive font-bold' : 'font-medium'}>{totalWeight}%</span>
                {totalWeight > 100 && <span className="text-destructive ml-2">(exceeds 100%)</span>}
              </p>
              <Button size="sm" variant="outline" onClick={addKPI}>
                <Plus className="h-4 w-4 mr-1" /> Add KPI
              </Button>
            </div>

            <div className="space-y-3">
              {localKPIs.map((kpi) => (
                <div key={kpi.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="KPI Description"
                      value={kpi.description}
                      onChange={(e) => updateKPI(kpi.id, 'description', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Weight %"
                          value={kpi.weight || ''}
                          onChange={(e) => updateKPI(kpi.id, 'weight', parseInt(e.target.value) || 0)}
                          min={0}
                          max={100}
                        />
                      </div>
                      {kpiType === 'quarterly' && (
                        <Select
                          value={kpi.timeline || 'Q1'}
                          onValueChange={(value) => updateKPI(kpi.id, 'timeline', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Q1">Q1</SelectItem>
                            <SelectItem value="Q2">Q2</SelectItem>
                            <SelectItem value="Q3">Q3</SelectItem>
                            <SelectItem value="Q4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeKPI(kpi.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {localKPIs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-body-sm">No KPIs defined. Click "Add KPI" to create one.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveKPIs} disabled={totalWeight > 100}>
              Save KPIs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
