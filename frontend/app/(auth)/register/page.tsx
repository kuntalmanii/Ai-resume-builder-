/**
 * Register page with password strength requirements.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { APIError } from "@/lib/api";
import { Loader2, Mail, Lock, User, CheckCircle, XCircle } from "lucide-react";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function PasswordRequirement({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {met ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
      )}
      <span className={met ? "text-emerald-400" : "text-white/40"}>{label}</span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password", "");
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.full_name, data.email, data.password);
      toast.success("Account created! Welcome to CareerOS AI 🎉");
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof APIError) {
        toast.error(error.detail);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card className="bg-white/[0.04] border-white/10 text-white shadow-2xl shadow-black/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center">
            Create your account
          </CardTitle>
          <CardDescription className="text-center text-white/50">
            Start building your best resume for free
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-white/80">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  aria-describedby={errors.full_name ? "name-error" : undefined}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-violet-500 focus:ring-violet-500/20"
                  {...register("full_name")}
                />
              </div>
              {errors.full_name && (
                <p id="name-error" className="text-rose-400 text-xs" role="alert">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-violet-500 focus:ring-violet-500/20"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-rose-400 text-xs" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-describedby="password-requirements"
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-violet-500 focus:ring-violet-500/20"
                  {...register("password")}
                />
              </div>
              {/* Password requirements */}
              <div id="password-requirements" className="space-y-1 pt-1">
                <PasswordRequirement met={requirements.length} label="At least 8 characters" />
                <PasswordRequirement met={requirements.uppercase} label="One uppercase letter" />
                <PasswordRequirement met={requirements.number} label="One number" />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-white/80">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-describedby={errors.confirm_password ? "confirm-error" : undefined}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-violet-500 focus:ring-violet-500/20"
                  {...register("confirm_password")}
                />
              </div>
              {errors.confirm_password && (
                <p id="confirm-error" className="text-rose-400 text-xs" role="alert">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              id="register-submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white font-medium h-11 mt-2 shadow-lg shadow-purple-900/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
