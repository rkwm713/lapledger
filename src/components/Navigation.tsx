import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Flag, Search, Trophy, LogIn, LogOut, User } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const links = [
    { to: '/', label: 'Results', icon: Flag },
    { to: '/search', label: 'Search', icon: Search },
    ...(user ? [{ to: '/leagues', label: 'My Leagues', icon: Trophy }] : []),
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* NASCAR Stripe Bar */}
      <div className="h-1 nascar-stripe" />
      
      <nav className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="LapLedger" className="h-8 sm:h-10" />
            </Link>
            
            <div className="flex gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to || 
                  (link.to === '/leagues' && location.pathname.startsWith('/leagues'));
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
