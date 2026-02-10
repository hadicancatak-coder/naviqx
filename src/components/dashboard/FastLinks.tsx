import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CheckSquare, Search, Link2, FileText } from "lucide-react";

const links = [
  {
    title: "Tasks",
    description: "Manage your tasks",
    icon: CheckSquare,
    url: "/tasks",
    color: "text-blue-600",
  },
  {
    title: "Google Planner",
    description: "Plan ad campaigns",
    icon: Search,
    url: "/ads/google",
    color: "text-green-600",
  },
  {
    title: "Captions",
    description: "Ad copy library",
    icon: FileText,
    url: "/ads/captions",
    color: "text-purple-600",
  },
  {
    title: "UTM Builder",
    description: "Generate UTM links",
    icon: Link2,
    url: "/utm-planner",
    color: "text-orange-600",
  },
];

export function FastLinks() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-section-title text-foreground mb-md">Quick Access</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md">
        {links.map((link) => (
          <Card
            key={link.url}
            onClick={() => navigate(link.url)}
            className="p-md cursor-pointer hover:shadow-soft hover:border-primary/50 transition-smooth group"
          >
            <div className="flex flex-col items-center text-center gap-sm">
              <link.icon className={`h-8 w-8 ${link.color} group-hover:scale-110 transition-smooth`} />
              <div>
                <p className="text-body font-medium text-foreground">{link.title}</p>
                <p className="text-metadata text-muted-foreground">{link.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
