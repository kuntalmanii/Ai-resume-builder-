/**
 * CareerOS AI Landing Page
 * Premium dark landing page with gradient hero, feature cards, and CTA.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Brain,
  Target,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Resume Analysis",
    description:
      "Get explainable ATS scores across 7 categories. Never see an arbitrary number — every point is backed by a reason.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Target,
    title: "Job Description Matching",
    description:
      "Paste any JD and instantly see keyword matches, missing skills, and experience gaps with your resume.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Shield,
    title: "Evidence Mode",
    description:
      "Every AI suggestion shows its source — resume, profile, or inference. Accept, edit, or reject with full transparency.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: FileText,
    title: "Smart Career Profile",
    description:
      "Store your complete career history once. CareerOS AI suggests verified information missing from your resume.",
    color: "from-orange-500 to-amber-600",
  },
  {
    icon: Zap,
    title: "ATS-Safe Templates",
    description:
      "Professional templates designed to pass applicant tracking systems without sacrificing design.",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Sparkles,
    title: "AI Improvements",
    description:
      "Enhance bullet points, rewrite weak content, fix grammar — with AI that explains every change it makes.",
    color: "from-indigo-500 to-violet-600",
  },
];

const stats = [
  { value: "7", label: "Scoring Categories" },
  { value: "100%", label: "Explainable AI" },
  { value: "3", label: "ATS Templates" },
  { value: "0", label: "Fabricated Claims" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CareerOS AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white shadow-lg shadow-purple-900/30">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[80px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300 px-4 py-1.5"
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              AI-Powered Resume Intelligence
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Land the job with
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              AI that explains itself
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Build ATS-optimized resumes, get explainable quality scores, match any job description, and
            improve your resume with AI that shows its work — never fabricating a single claim.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white shadow-xl shadow-purple-900/40 px-8 h-12 text-base font-medium"
              >
                Start for free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white h-12 px-8 text-base font-medium"
              >
                Sign in
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          className="relative max-w-3xl mx-auto mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-white/50 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to land your next role
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              A complete career intelligence platform — not just another resume template site.
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Evidence Mode Highlight */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-4 py-1.5"
            >
              <Shield className="w-3 h-3 mr-1.5" />
              Evidence Mode
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              AI that never makes things up
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-2xl mx-auto">
              Every AI recommendation labels its source. Know exactly whether a suggestion
              is based on your resume, your career profile, the job description, or AI inference.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {[
                { label: "From your resume", color: "bg-violet-500/20 border-violet-500/30 text-violet-300", icon: "📄" },
                { label: "From your career profile", color: "bg-blue-500/20 border-blue-500/30 text-blue-300", icon: "👤" },
                { label: "AI inference — clearly flagged", color: "bg-amber-500/20 border-amber-500/30 text-amber-300", icon: "🤖" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-4 rounded-xl border ${item.color} flex items-center gap-3`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-violet-600/20 to-purple-700/20 border border-violet-500/20"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Build your best resume today
          </h2>
          <p className="text-white/50 text-lg mb-8">
            Free to start. No credit card required.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white shadow-xl shadow-purple-900/40 px-10 h-12 text-base font-medium"
            >
              Create your resume
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold">CareerOS AI</span>
          </div>
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} CareerOS AI. Built with transparency.
          </p>
        </div>
      </footer>
    </div>
  );
}
