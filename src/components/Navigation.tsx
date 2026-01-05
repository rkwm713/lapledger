import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Flag, Search } from "lucide-react";

export function Navigation() {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Recent Results', icon: Flag },
    { to: '/search', label: 'Search', icon: Search },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-6">
        <Link to="/" className="font-bold text-lg flex items-center gap-2">
          <Flag className="h-5 w-5" />
          NASCAR Results
        </Link>
        
        <div className="flex gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
