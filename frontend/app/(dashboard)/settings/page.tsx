"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Shield, Eye, Trash2, Save } from "lucide-react";
import { mockUser } from "@/lib/mock-data";

export default function SettingsPage() {
  const [fullName, setFullName] = useState(mockUser.full_name);
  const [email, setEmail] = useState(mockUser.email);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Account settings updated successfully!");
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Security settings updated successfully!");
  };

  const handleDeleteData = () => {
    toast.error("Data deletion is irreversible. Confirmation dialog is Sprint 5.");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings, security options, privacy parameters, and GDPR data configurations."
      />

      <div className="pt-2">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md border border-border p-1 bg-card rounded-lg">
            <TabsTrigger value="account" className="text-xs font-semibold rounded-md">Account</TabsTrigger>
            <TabsTrigger value="security" className="text-xs font-semibold rounded-md">Security</TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs font-semibold rounded-md">Privacy</TabsTrigger>
            <TabsTrigger value="delete" className="text-xs font-semibold rounded-md text-destructive">Data Delete</TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card className="border border-border shadow-sm bg-card p-6">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-4">Account Information</h3>
              <form onSubmit={handleSaveAccount} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname" className="text-xs font-semibold">Full Name</Label>
                  <Input
                    id="fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <Button type="submit" className="text-xs font-semibold h-9 gap-1.5">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="border border-border shadow-sm bg-card p-6">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-4">Change Password</h3>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="curr-pass" className="text-xs font-semibold">Current Password</Label>
                  <Input id="curr-pass" type="password" className="text-xs h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass" className="text-xs font-semibold">New Password</Label>
                  <Input id="new-pass" type="password" className="text-xs h-9" />
                </div>
                <Button type="submit" className="text-xs font-semibold h-9 gap-1.5">
                  <Shield className="w-4 h-4" />
                  Update Password
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card className="border border-border shadow-sm bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Privacy & Telemetry</h3>
              <div className="space-y-3 max-w-md text-xs">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="anon-usage" defaultChecked className="mt-0.5 rounded border-border text-primary" />
                  <label htmlFor="anon-usage" className="space-y-0.5">
                    <span className="font-semibold text-foreground block">Share anonymous usage data</span>
                    <span className="text-muted-foreground text-[10px]">Help us improve our parsing and scoring models by sharing anonymous diagnostics.</span>
                  </label>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* GDPR Delete Data Tab */}
          <TabsContent value="delete">
            <Card className="border border-border shadow-sm bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-destructive border-b border-border pb-2">Delete My Account</h3>
              <div className="space-y-3 max-w-md text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Deletes your personal account, saved resumes, target job histories, and parsed career profile documents. This operation is irreversible.
                </p>
                <Button onClick={handleDeleteData} variant="destructive" className="text-xs font-semibold h-9 gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  Delete All My Data
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
