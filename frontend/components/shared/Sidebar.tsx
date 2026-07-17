/**
 * Sidebar navigation component for the dashboard.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  User,
  BarChart3,
  LogOut,
  Sparkles,
  PlusCircle,
  Target,
  Layout,
  Settings,
  HelpCircle,
  Briefcase,
  MailOpen,
  Globe,
  MessageSquareCode,
  Map,
  TrendingUp,
  Bell,
  Users,
} from "lucide-react";

const candidateNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Applications Tracker",
    href: "/applications",
    icon: Briefcase,
  },
  {
    label: "My Resumes",
    href: "/resumes",
    icon: FileText,
  },
  {
    label: "Create Resume",
    href: "/resumes/new",
    icon: PlusCircle,
  },
  {
    label: "Resume Analyzer",
    href: "/upload",
    icon: BarChart3,
  },
  {
    label: "Cover Letters",
    href: "/cover-letters",
    icon: MailOpen,
  },
  {
    label: "LinkedIn Optimizer",
    href: "/linkedin",
    icon: Globe,
  },
  {
    label: "Portfolio Builder",
    href: "/portfolio",
    icon: Globe,
  },
  {
    label: "Interview Prep",
    href: "/interviews",
    icon: MessageSquareCode,
  },
  {
    label: "Career Roadmap",
    href: "/roadmap",
    icon: Map,
  },
  {
    label: "Career Analytics",
    href: "/analytics",
    icon: TrendingUp,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];

const recruiterNavItems = [
  {
    label: "Recruiter Portal",
    href: "/recruiter",
    icon: Users,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
  },
];

const footerItems = [
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Help",
    href: "#help",
    icon: HelpCircle,
    isAction: true,
  },
];

interface SidebarContentProps {
  onClose?: () => void;
}

export function SidebarContent({ onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isRecruiter = mounted && user?.role === "recruiter";
  const currentNavItems = isRecruiter ? recruiterNavItems : candidateNavItems;

  const initials = mounted && user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
    router.push("/login");
    onClose?.();
  };

  const handleFooterItemClick = (item: typeof footerItems[0]) => {
    if (item.isAction) {
      toast.info("Help & Support center is coming soon!");
    } else {
      router.push(item.href);
    }
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Logo */}
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight text-foreground">
          CareerOS AI
        </span>
      </div>

      <Separator className="bg-border/60" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {currentNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && item.href !== "/resumes/new" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 border",
                  isActive
                    ? "bg-primary-subtle text-primary border-primary/10"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-border/60" />

      {/* Footer Nav */}
      <div className="px-3 py-2 space-y-1">
        {footerItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.label}
              onClick={() => handleFooterItemClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border text-left",
                isActive
                  ? "bg-primary-subtle text-primary border-primary/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <Separator className="bg-border/60" />

      {/* User section */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md">
          <Avatar className="w-8 h-8 bg-primary flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {mounted ? user?.full_name : "Loading..."}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {mounted ? user?.email : ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-card border-r border-border z-40">
        <SidebarContent />
      </aside>
    </>
  );
}
