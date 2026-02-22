import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  Bug,
  Lock,
  Shield,
  Settings,
  HelpCircle,
  MessageSquare,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Server },
  { title: "Patches", url: "/patches", icon: Bug },
  { title: "Credentials", url: "/credentials", icon: Lock },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Help Center", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground tracking-tight">InfraPilot</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-sm text-sidebar-foreground">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">Search anything...</span>
          <span className="ml-auto text-[10px] text-sidebar-foreground/40 border border-sidebar-border rounded px-1">⌘K</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const active =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-sidebar-border space-y-0.5">
        {bottomItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
