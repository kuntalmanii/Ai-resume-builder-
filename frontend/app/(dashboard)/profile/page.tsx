/**
 * Career Profile page — multi-section form for structured career data.
 * Sprint 1: Shell with section tabs. Full form implementation in Sprint 2.
 */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { profileAPI } from "@/lib/api";
import {
  GraduationCap,
  Briefcase,
  Code2,
  Award,
  Wrench,
  Trophy,
  Star,
  Globe,
  Heart,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";

const sections = [
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "projects", label: "Projects", icon: Code2 },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "certifications", label: "Certifications", icon: Award },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "positions", label: "Leadership", icon: Star },
  { id: "languages", label: "Languages", icon: Globe },
  { id: "interests", label: "Interests", icon: Heart },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("education");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["career-profile"],
    queryFn: profileAPI.get,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Career Profile</h1>
            <p className="text-xs text-muted-foreground max-w-xl">
              Your career profile stores all your professional history. CareerOS AI uses this to
              suggest verified information that may be missing from your resume.
            </p>
          </div>
          {profile && (
            <Badge
              variant="outline"
              className="border-accent/30 bg-accent-subtle text-accent whitespace-nowrap"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Profile Active
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Evidence Mode Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 flex items-start gap-3 p-4 rounded-md bg-primary-subtle border border-primary/20 text-primary"
      >
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p className="text-xs leading-relaxed">
          <strong className="font-semibold">Evidence Mode:</strong> Information you add here is
          marked as &quot;verified from profile&quot; when used in AI suggestions. Only add
          information that is accurate and factual.
        </p>
      </motion.div>

      {/* Section Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted border border-border p-1 h-auto flex-wrap gap-1 mb-6 w-full justify-start rounded-md">
            {sections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground rounded-md px-3 py-1.5 cursor-pointer font-semibold"
                id={`tab-${section.id}`}
              >
                <section.icon className="w-3.5 h-3.5" />
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.id} value={section.id}>
              <Card className="bg-card border-border text-foreground shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                    <section.icon className="w-4 h-4 text-primary" />
                    {section.label}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Add your {section.label.toLowerCase()} details. This information will be used
                    to power Evidence Mode in AI suggestions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-xl bg-[#F1F3F6] border border-border flex items-center justify-center mb-4 text-muted-foreground">
                      <section.icon className="w-8 h-8" />
                    </div>
                    <p className="text-muted-foreground text-xs mb-4">
                      No {section.label.toLowerCase()} added yet.
                    </p>
                    <Button
                      id={`add-${section.id}`}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs h-[36px] px-4 rounded-sm"
                    >
                      + Add {section.label}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
}
