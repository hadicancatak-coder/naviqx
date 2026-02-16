import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Copy, Check, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { UtmBulkActionsBar } from "./UtmBulkActionsBar";
import { useDeleteUtmLink } from "@/hooks/useUtmLinks";
import { useAuth } from "@/contexts/AuthContext";
import { exportUtmLinksToCSV } from "@/lib/utmExport";

const PAGE_SIZE = 25;

interface UtmLink {
  id: string;
  full_url: string;
  created_at: string;
  created_by: string;
  name: string | null;
  campaign_name: string | null;
  platform: string | null;
  creator?: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

interface UtmArchiveTableProps {
  links: UtmLink[];
  isLoading?: boolean;
}

const getPageNumbers = (currentPage: number, totalPages: number): (number | "ellipsis")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (currentPage > 3) pages.push("ellipsis");
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (currentPage < totalPages - 2) pages.push("ellipsis");
  if (totalPages > 1) pages.push(totalPages);
  return pages;
};

export const UtmArchiveTable: React.FC<UtmArchiveTableProps> = ({
  links,
  isLoading,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { userRole } = useAuth();
  const deleteUtmLink = useDeleteUtmLink();

  const isAdmin = userRole === "admin";

  // Reset page when links change (e.g. filters applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [links]);

  const totalPages = Math.ceil(links.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, links.length);
  const visibleLinks = useMemo(
    () => links.slice(startIndex, endIndex),
    [links, startIndex, endIndex]
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(visibleLinks.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleCopy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBulkCopy = async () => {
    const selectedLinks = links.filter((l) => selectedIds.has(l.id));
    const urls = selectedLinks.map((l) => l.full_url).join("\n");
    await navigator.clipboard.writeText(urls);
    toast.success(`Copied ${selectedLinks.length} URLs to clipboard`);
  };

  const handleBulkExport = () => {
    const selectedLinks = links.filter((l) => selectedIds.has(l.id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exportUtmLinksToCSV(selectedLinks as any, "utm_links_export.csv");
    toast.success(`Exported ${selectedLinks.length} links`);
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      toast.error("Only admins can delete links");
      return;
    }
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await deleteUtmLink.mutateAsync(id);
    }
    setSelectedIds(new Set());
    toast.success(`Deleted ${idsToDelete.length} links`);
  };

  const allSelected = visibleLinks.length > 0 && visibleLinks.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateUrl = (url: string, maxLength = 60) => {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No archived links found.
      </div>
    );
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="space-y-4">
      <UtmBulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onExport={handleBulkExport}
        onDelete={isAdmin ? handleBulkDelete : undefined}
        onBulkCopy={handleBulkCopy}
      />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
              <TableHead className="w-[140px]">Campaign</TableHead>
              <TableHead className="w-[160px]">UTM Name</TableHead>
              <TableHead className="w-[100px]">Platform</TableHead>
              <TableHead className="min-w-[280px]">Link</TableHead>
              <TableHead className="w-[140px]">Created By</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[60px] text-right">Copy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLinks.map((link) => (
              <TableRow
                key={link.id}
                className="hover:bg-card-hover transition-smooth"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(link.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(link.id, checked as boolean)
                    }
                    aria-label={`Select link ${link.id}`}
                  />
                </TableCell>
                <TableCell>
                  <span className="text-body-sm font-medium text-foreground">
                    {link.campaign_name || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-body-sm text-foreground">
                    {link.name || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  {link.platform ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-metadata font-medium bg-muted text-muted-foreground">
                      {link.platform}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-body-sm font-mono text-muted-foreground cursor-help">
                          {truncateUrl(link.full_url, 50)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-[500px] break-all"
                      >
                        {link.full_url}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={link.creator?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(link.creator?.name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-body-sm text-foreground truncate max-w-[100px]">
                      {link.creator?.name || "Unknown"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-metadata text-muted-foreground">
                    {format(new Date(link.created_at), "MMM dd, yy")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCopy(link.full_url, link.id)}
                  >
                    {copiedId === link.id ? (
                      <Check className="h-4 w-4 text-success-text" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-metadata text-muted-foreground">
            Showing {startIndex + 1}–{endIndex} of {links.length} links
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {pageNumbers.map((page, idx) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
