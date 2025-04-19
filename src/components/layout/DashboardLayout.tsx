import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { getCurrentUser, logoutUser } from "@/lib/services/userService";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, ClipboardList, Home, Settings, Users, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { User } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Get the user on mount only
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (!currentUser) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      roles: ["user"]
    },
    {
      href: "/orders",
      label: "Orders",
      icon: <ClipboardList className="h-5 w-5" />,
      roles: ["user"]
    },
    {
      href: "/admin",
      label: "Admin",
      icon: <Settings className="h-5 w-5" />,
      roles: ["admin"]
    },
    {
      href: "/photographers",
      label: "Photographers",
      icon: <Users className="h-5 w-5" />,
      roles: ["admin"]
    }
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-primary text-primary-foreground p-4 fixed h-screen">
        <div className="py-4 text-center">
          <h1 className="text-xl font-bold">Photofine Color Lab</h1>
        </div>
        <ScrollArea className="flex-1 pt-6">
          <div className="flex flex-col space-y-2 pr-4">
            {filteredNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start text-primary-foreground hover:bg-primary/90",
                  location.pathname === item.href && "bg-primary/90"
                )}
                onClick={() => navigate(item.href)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t border-primary-foreground/20 pt-4 mt-6">
          <div className="flex items-center mb-4 px-2">
            <UserIcon className="h-5 w-5 mr-2" />
            <span className="text-sm truncate max-w-[160px]">{user.name}</span>
            {isAdmin && (
              <span className="ml-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full whitespace-nowrap">
                Admin
              </span>
            )}
          </div>
          <Button 
            variant="secondary" 
            className="w-full text-primary-foreground bg-primary-foreground/20 hover:bg-primary-foreground/30 border border-primary-foreground/30" 
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>

      {/* Mobile header - improved */}
      <header className="lg:hidden bg-primary text-primary-foreground flex justify-between items-center px-4 py-3 w-full fixed top-0 z-30 shadow-md">
        <div className="flex items-center">
          <h1 className="text-base sm:text-lg font-bold truncate max-w-[200px] sm:max-w-none">Photofine Color Lab</h1>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center">
            <span className="text-xs truncate max-w-[80px] sm:max-w-[120px]">{user.name}</span>
          </div>
          {isAdmin && (
            <span className="mx-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] sm:text-xs rounded-full whitespace-nowrap">
              Admin
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary-foreground ml-1 p-1 h-8 w-8" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile bottom navigation - improved */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {filteredNavItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col h-14 px-1 sm:px-2 rounded-none w-full max-w-[100px]",
                location.pathname === item.href 
                  ? "bg-primary/10 text-primary border-t-2 border-primary" 
                  : "text-muted-foreground"
              )}
              onClick={() => navigate(item.href)}
            >
              {item.icon}
              <span className="text-[10px] sm:text-xs mt-1 truncate w-full text-center">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main content area - improved padding for mobile */}
      <main className="flex-1 pt-16 pb-20 px-3 sm:px-4 lg:pb-6 lg:pt-6 lg:px-8 lg:ml-64">
        <div className="max-w-7xl mx-auto w-full py-3 sm:py-4">
          {children}
        </div>
      </main>
    </div>
  );
};
