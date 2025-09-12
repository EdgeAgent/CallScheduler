import { Phone, BarChart3, PhoneCall, Calendar, History, Users, Settings, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, current: true },
  { name: 'Scheduler', href: '/scheduler', icon: Calendar, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2" data-testid="text-app-title">
          <Phone className="h-5 w-5" />
          AI Agent Pro
        </h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )} data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}>
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">Agency Admin</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">admin@agency.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
