import { useState } from "react";
import { Ticket, ExternalLink, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterBar } from "@/components/layout/FilterBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTickets, TicketStatus } from "@/hooks/useTickets";
import { EmptyState } from "@/components/layout/EmptyState";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "update_needed", label: "Update Needed" },
  { value: "successful", label: "Successful" },
  { value: "failed", label: "Failed" },
];

const STATUS_STYLES: Record<TicketStatus, string> = {
  pending: "status-warning",
  update_needed: "status-info",
  successful: "status-success",
  failed: "status-destructive",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "Pending",
  update_needed: "Update Needed",
  successful: "Successful",
  failed: "Failed",
};

export default function Tickets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus>("pending");

  const { data: tickets, isLoading, addTicket, updateStatus, deleteTicket } = useTickets({
    search,
    status: statusFilter,
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTicket.mutate(
      { title: newTitle.trim(), link: newLink.trim() || undefined, status: newStatus },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setNewTitle("");
          setNewLink("");
          setNewStatus("pending");
        },
      }
    );
  };

  return (
    <div className="space-y-lg">
      <PageHeader
        title="Tickets"
        description="Track tickets raised to dev"
        icon={Ticket}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-md">
                <div className="space-y-xs">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Ticket title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-xs">
                  <Label>Link</Label>
                  <Input
                    placeholder="https://jira.example.com/..."
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                  />
                </div>
                <div className="space-y-xs">
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TicketStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={!newTitle.trim() || addTicket.isPending}>
                  {addTicket.isPending ? "Adding..." : "Add Ticket"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search tickets..." }}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-xl">Loading...</div>
      ) : !tickets?.length ? (
        <EmptyState
          icon={Ticket}
          title="No tickets yet"
          description="Add a ticket to start tracking dev requests"
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="flex items-center gap-xs">
                      <span className="font-medium text-foreground">{ticket.title}</span>
                      {ticket.link && (
                        <a
                          href={ticket.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-smooth"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) =>
                        updateStatus.mutate({ id: ticket.id, status: v as TicketStatus })
                      }
                    >
                      <SelectTrigger className="w-[150px] h-8 border-none bg-transparent p-0">
                        <Badge className={STATUS_STYLES[ticket.status]}>
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ticket.creator_name}</TableCell>
                  <TableCell className="text-muted-foreground text-metadata">
                    {format(new Date(ticket.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTicket.mutate(ticket.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
