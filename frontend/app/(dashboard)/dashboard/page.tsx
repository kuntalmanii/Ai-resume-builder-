/**
 * Dashboard home — stats overview and quick actions.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  PlusCircle,
  Upload,
  BarChart3,
  ArrowRight,
  Target,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    id: "create-resume",
    label: "Create Resume",
    description: "Build a new resume from scratch",
    href: "/resumes/new",
    icon: PlusCircle,
    gradient: "bg-primary text-primary-foreground hover:bg-primary/90",
    primary: true,
  },
  {
    id: "upload-resume",
    label: "Upload Resume",
    description: "Import your existing PDF or DOCX",
    href: "/resumes/upload",
    icon: Upload,
    gradient: "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/40",
    primary: false,
  },
  {
    id: "analyze-resume",
    label: "Analyze Resume",
    description: "Get ATS score and AI suggestions",
    href: "/analyze",
    icon: BarChart3,
    gradient: "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/40",
    primary: false,
  },
  {
    id: "match-jd",
    label: "Match Job Description",
    description: "Compare resume against a job posting",
    href: "/analyze?tab=jd",
    icon: Target,
    gradient: "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/40",
    primary: false,
  },
];

const gettingStarted = [
  { step: 1, label: "Complete your Career Profile", href: "/profile", icon: User },
  { step: 2, label: "Create your first resume", href: "/resumes/new", icon: FileText },
  { step: 3, label: "Run ATS Analysis", href: "/analyze", icon: BarChart3 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground">
          Good morning, {firstName} 👋
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          What would you like to work on today?
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {quickActions.map((action) => (
          <motion.div key={action.id} variants={itemVariants}>
            <Link href={action.href}>
              <div
                className={cn(
                  "group relative p-5 rounded-md border flex flex-col justify-between h-full transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                  action.primary
                    ? "bg-primary border-primary hover:bg-primary/95 text-primary-foreground"
                    : "bg-card border-border hover:border-border-strong text-foreground hover:bg-muted/30"
                )}
              >
                <div>
                  <div
                    className={cn(
                      "w-9 h-9 rounded-md flex items-center justify-center mb-4 shadow-sm",
                      action.primary ? "bg-white/10 text-white" : "bg-[#F1F3F6] text-primary"
                    )}
                  >
                    <action.icon className="w-4 h-4" />
                  </div>
                  <h3 className={cn("font-bold text-sm", action.primary ? "text-white" : "text-foreground")}>
                    {action.label}
                  </h3>
                  <p className={cn("text-xs mt-1 leading-normal", action.primary ? "text-white/80" : "text-muted-foreground")}>
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Getting Started */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-border text-foreground shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {gettingStarted.map((item) => (
                <Link key={item.step} href={item.href}>
                  <div className="flex items-center gap-4 p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 transition-all group">
                    <div className="w-8 h-8 rounded-full bg-primary-subtle border border-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary shadow-xs">
                      {item.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground/80 group-hover:text-primary transition-colors">
                        {item.label}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-border text-foreground shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Resumes", value: "2", icon: FileText },
                { label: "Analyses Run", value: "12", icon: BarChart3 },
                { label: "Avg ATS Score", value: "85", icon: Target },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-[#F1F3F6] border border-border/20 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-none">{stat.label}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
