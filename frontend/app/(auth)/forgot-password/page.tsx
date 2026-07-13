"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    // Mock password reset request
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast.success("Password reset link sent to your email!");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] px-4 py-12">
      <Card className="w-full max-w-md border border-border shadow-md">
        <CardHeader className="space-y-1.5 text-center">
          <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-xs">
            Password recovery is currently unavailable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 text-amber-600 dark:text-amber-400 text-xs flex flex-col gap-2.5 mb-4">
            <p className="font-semibold">Email Delivery Infrastructure Pending</p>
            <p className="leading-relaxed">
              The email notification service is currently under development. Password reset requests cannot be processed automatically at this time.
            </p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 opacity-50 cursor-not-allowed">
            <div className="space-y-1.5 pointer-events-none">
              <Label htmlFor="email" className="text-xs font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9 h-[38px] text-xs"
                  disabled
                  required
                />
              </div>
            </div>
            <Button type="button" className="w-full h-[38px] text-xs font-semibold pointer-events-none" disabled>
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/50 pt-4">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
