import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Flag, Search, Trophy, LogIn, LogOut, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function MobileNav() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'Schedule', icon: Flag },
    { to: '/search', label: 'Search', icon: Search },
    ...(user ? [{ to: '/leagues', label: 'My Leagues', icon: Trophy }] : []),
  ];

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col gap-2 mt-6">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to || 
              (link.to === '/leagues' && location.pathname.startsWith('/leagues'));
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-6 border-t">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </div>
              <Link
                to="/profile"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <User className="h-5 w-5" />
                My Profile
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3" 
                onClick={() => {
                  signOut();
                  handleLinkClick();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button asChild variant="default" className="w-full justify-start gap-3">
              <Link to="/auth" onClick={handleLinkClick}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
