"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, User, Settings, LogOut, Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Breadcrumbs from "./Breadcrumbs";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  onMenuClick: () => void;
}

export default function TopHeader({ onMenuClick }: TopHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    setMounted(true);

    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const initials = mounted && user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: Notifications & User Menu */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full flex-shrink-0"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? (
            <Sun className="w-4.5 h-4.5" />
          ) : (
            <Moon className="w-4.5 h-4.5" />
          )}
        </Button>

        {/* Notifications Popover Trigger */}
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            className={cn(
              "h-9 w-9 text-muted-foreground hover:text-foreground relative rounded-full",
              showNotifications && "bg-muted"
            )}
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm">Notifications</span>
              </div>
              <div className="px-4 py-8 text-center">
                <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown Menu */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 focus:outline-none rounded-full p-0.5 hover:ring-2 hover:ring-primary/20 transition-all"
            aria-label="User account menu"
          >
            <Avatar className="w-8 h-8 bg-primary">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-border mb-1.5">
                <p className="text-xs font-medium text-foreground truncate">{mounted ? user?.full_name : "User"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{mounted ? user?.email : ""}</p>
              </div>

              <button
                onClick={() => {
                  router.push("/career-profile");
                  setShowUserDropdown(false);
                }}
                className="w-full px-4 py-2 text-xs font-medium text-left hover:bg-muted hover:text-foreground flex items-center gap-2 transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  router.push("/settings");
                  setShowUserDropdown(false);
                }}
                className="w-full px-4 py-2 text-xs font-medium text-left hover:bg-muted hover:text-foreground flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Settings</span>
              </button>

              <div className="border-t border-border my-1.5" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-xs font-medium text-left text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
