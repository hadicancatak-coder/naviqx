import type { UnsafeAny } from '@/types/unsafe';

export function exportTasksToCSV(tasks: UnsafeAny[], filename: string = "tasks.csv") {
  // Define CSV headers
  const headers = [
    "Title",
    "Status",
    "Priority",
    "Assignees",
    "Teams",
    "Due Date",
    "Created At",
    "Created By",
    "Description",
  ];

  // Convert tasks to CSV rows
  const rows = tasks.map(task => [
    task.title || "",
    task.status || "",
    task.priority || "",
    task.assignees?.map((a: UnsafeAny) => a.full_name || a.email).join("; ") || "",
    Array.isArray(task.teams) ? task.teams.join("; ") : "",
    task.due_date ? new Date(task.due_date).toLocaleDateString() : "",
    task.created_at ? new Date(task.created_at).toLocaleDateString() : "",
    task.created_by || "",
    task.description || "",
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell);
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
