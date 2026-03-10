// @density: compact
import { useState, useMemo, useEffect, useCallback } from "react";
import { format, isToday, subDays } from "date-fns";
import { ClipboardList, ClipboardPaste } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useDailyLogEntries,
  useAllUsersDailyLogEntries,
  useYesterdayUnresolved,
} from "@/hooks/useDailyLog";
import { DailyLogDateNav } from "@/components/daily-log/DailyLogDateNav";
import { CarryForwardBanner } from "@/components/daily-log/CarryForwardBanner";
import { DailyLogEntryRow } from "@/components/daily-log/DailyLogEntryRow";
import { DailyLogEntryDialog } from "@/components/daily-log/DailyLogEntryDialog";
import { DailyLogUserSection } from "@/components/daily-log/DailyLogUserSection";
import { DailyLogInlineComposer, AddEntryTrigger } from "@/components/daily-log/DailyLogInlineComposer";
import { DailyLogBulkPasteDialog } from "@/components/daily-log/DailyLogBulkPasteDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import type { DailyLogEntry } from "@/domain/daily-log";

export default function DailyLog() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [date, setDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>("me");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyLogEntry | null>(null);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  const logDate = format(date, "yyyy-MM-dd");
  const isViewingAllUsers = isAdmin && selectedUserId === "all";
  const isViewingSelf = selectedUserId === "me" || selectedUserId === user?.id;

  // Fetch profiles for admin user filter
  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, name, avatar_url").order("name");
      return data ?? [];
    },
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });

  // Entries
  const resolvedUserId = isViewingSelf ? undefined : isViewingAllUsers ? undefined : selectedUserId;
  const singleUserEntries = useDailyLogEntries(logDate, resolvedUserId);
  const allUsersEntries = useAllUsersDailyLogEntries(logDate);
  const { data: unresolvedCount } = useYesterdayUnresolved();

  const entries = isViewingAllUsers ? allUsersEntries.data : singleUserEntries.data;
  const isLoading = isViewingAllUsers ? allUsersEntries.isLoading : singleUserEntries.isLoading;

  // Group entries by user for admin "all" view
  const groupedEntries = useMemo(() => {
    if (!isViewingAllUsers || !entries) return null;
    const groups: Record<string, { profile: { name: string; avatar_url: string | null }; entries: DailyLogEntry[] }> = {};
    for (const entry of entries) {
      if (!groups[entry.user_id]) {
        const profile = profiles?.find((p) => p.user_id === entry.user_id);
        groups[entry.user_id] = {
          profile: { name: profile?.name ?? "Unknown", avatar_url: profile?.avatar_url ?? null },
          entries: [],
        };
      }
      groups[entry.user_id].entries.push(entry);
    }
    // Exclude current user — their log is in "My Log"
    return Object.entries(groups)
      .filter(([userId]) => userId !== user?.id)
      .sort(([, a], [, b]) => a.profile.name.localeCompare(b.profile.name));
  }, [isViewingAllUsers, entries, profiles, user?.id]);

  // User's open tasks for reference
  const { data: myTasks } = useQuery({
    queryKey: ["my-open-tasks-daily-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_at")
        .is("parent_id", null)
        .not("status", "in", '("Completed","Failed")')
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const handleEdit = (entry: DailyLogEntry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  };

  const usersForDialog = useMemo(() => {
    if (!profiles) return [];
    return profiles.map((p) => ({ id: p.user_id, name: p.name ?? "Unknown" }));
  }, [profiles]);

  const dialogForUserId = isViewingSelf || selectedUserId === "me" ? undefined : selectedUserId === "all" ? undefined : selectedUserId;

  // Yesterday banner
  const isYesterday = format(subDays(new Date(), 1), "yyyy-MM-dd") === logDate;

  // Keyboard shortcut: 'n' to open composer
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "n" && !composerOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)) {
      e.preventDefault();
      setComposerOpen(true);
    }
  }, [composerOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <PageContainer>
      <PageHeader
        title="Daily Log"
        description="Plan your day. Track what gets done."
        icon={ClipboardList}
      />

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-md p-sm rounded-xl liquid-glass">
        <DailyLogDateNav date={date} onDateChange={setDate} />

        <div className="flex items-center gap-sm">
          {isAdmin && profiles && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">My Log</SelectItem>
                <SelectItem value="all">All Users</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={() => setBulkPasteOpen(true)} title="Paste list">
            <ClipboardPaste className="h-4 w-4 mr-1" />
            Paste list
          </Button>
        </div>
      </div>

      {/* Yesterday banner */}
      {isYesterday && (
        <div className="p-sm rounded-lg bg-info-soft border border-info/30">
          <p className="text-body-sm text-info-text">
            These are yesterday's plans — update their status before adding today's.
          </p>
        </div>
      )}

      {/* Carry-forward banner */}
      {isToday(date) && isViewingSelf && (
        <CarryForwardBanner
          unresolvedCount={unresolvedCount ?? 0}
          onReviewYesterday={() => setDate(subDays(new Date(), 1))}
        />
      )}

      {/* Entries */}
      <div className="bg-card border border-border rounded-xl">
        {isLoading ? (
          <div className="p-lg text-center text-muted-foreground text-body-sm">Loading...</div>
        ) : isViewingAllUsers && groupedEntries ? (
          <div className="p-sm space-y-sm">
            {groupedEntries.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No entries for this day"
                description="No team members have logged entries for this date."
              />
            ) : (
              groupedEntries.map(([userId, group]) => (
                <DailyLogUserSection
                  key={userId}
                  userName={group.profile.name}
                  avatarUrl={group.profile.avatar_url}
                  entries={group.entries}
                  onEdit={handleEdit}
                />
              ))
            )}
          </div>
        ) : (
          <div className="p-sm">
            {(!entries || entries.length === 0) && !composerOpen ? (
              <EmptyState
                icon={ClipboardList}
                title="No entries yet"
                description="Start planning your day by adding an entry."
                action={{ label: "Add Entry", onClick: () => setComposerOpen(true) }}
              />
            ) : (
              <>
                {entries?.map((entry) => (
                  <DailyLogEntryRow key={entry.id} entry={entry} onEdit={handleEdit} />
                ))}
              </>
            )}

            {/* Inline composer or trigger */}
            {!isViewingAllUsers && (
              composerOpen ? (
                <DailyLogInlineComposer
                  logDate={logDate}
                  forUserId={dialogForUserId}
                  isAdmin={isAdmin}
                  users={usersForDialog}
                  onClose={() => setComposerOpen(false)}
                  onSaved={() => {/* stay open for next entry */}}
                />
              ) : (
                (entries && entries.length > 0) && (
                  <AddEntryTrigger onClick={() => setComposerOpen(true)} />
                )
              )
            )}
          </div>
        )}
      </div>

      {/* Connected Tasks Section */}
      {isViewingSelf && (
        <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
          <CollapsibleTrigger className="flex items-center gap-sm w-full p-sm rounded-xl hover:bg-card-hover transition-smooth text-body-sm font-medium text-foreground">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tasksOpen ? "" : "-rotate-90"}`} />
            Your Assigned Tasks
            {myTasks && <span className="text-metadata text-muted-foreground">({myTasks.length})</span>}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-card border border-border rounded-xl p-sm mt-xs space-y-xs">
              {myTasks?.length === 0 ? (
                <p className="text-metadata text-muted-foreground p-sm">No open tasks</p>
              ) : (
                myTasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-sm h-row-compact px-sm rounded-lg hover:bg-card-hover transition-smooth cursor-pointer"
                  >
                    <span className="text-body-sm text-foreground truncate flex-1">{task.title}</span>
                    <span className="text-metadata text-muted-foreground">{task.status}</span>
                    {task.due_at && (
                      <span className="text-metadata text-muted-foreground">{format(new Date(task.due_at), "d MMM")}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Edit Details Dialog (existing entries only) */}
      <DailyLogEntryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entry={editingEntry}
        logDate={logDate}
        forUserId={dialogForUserId}
        users={usersForDialog}
        isAdmin={isAdmin}
      />

      {/* Bulk Paste Dialog */}
      <DailyLogBulkPasteDialog
        open={bulkPasteOpen}
        onOpenChange={setBulkPasteOpen}
        logDate={logDate}
        forUserId={dialogForUserId}
        isAdmin={isAdmin}
      />
    </PageContainer>
  );
}
