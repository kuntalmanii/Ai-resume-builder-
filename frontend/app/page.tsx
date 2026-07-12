/**
 * CareerOS AI Landing Page
 * Premium dark landing page with gradient hero, interactive browser mockup,
 * social proof, testimonials, step-by-step workflow, and advanced CTAs.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Brain,
  Target,
  Shield,
  Zap,
  ArrowRight,
  Sparkles,
  Menu,
  X,
  Star,
  CheckCircle,
  TrendingUp,
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

const testimonials = [
  {
    quote: "CareerOS AI helped me identify exactly what key phrases my resume was missing. Landed three interviews in a week!",
    author: "Sarah Jenkins",
    role: "Product Manager at Stripe",
    avatar: "SJ",
  },
  {
    quote: "The Evidence Mode is a game-changer. I love knowing exactly why the AI makes suggestions instead of just getting blind rewrites.",
    author: "David Chen",
    role: "Lead Software Engineer",
    avatar: "DC",
  },
  {
    quote: "Clean templates and extremely transparent scoring. By far the best resume tool I've used.",
    author: "Elena Rostova",
    role: "UX Researcher at Figma",
    avatar: "ER",
  }
];

const steps = [
  {
    step: "01",
    title: "Upload & Parse",
    description: "Import your existing resume or fill out your career profile in seconds.",
  },
  {
    step: "02",
    title: "AI ATS Audit",
    description: "Get explainable scores across 7 key ATS categories with exact line source references.",
  },
  {
    step: "03",
    title: "Target & Optimize",
    description: "Align bullet points to specific job descriptions with zero fabricated claims.",
  }
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#060608]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">CareerOS AI</span>
          </Link>
          
          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 font-semibold text-sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white shadow-lg shadow-purple-900/30 font-semibold text-sm">
                Get started free
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger menu */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed top-16 left-0 right-0 z-40 bg-[#060608] border-b border-white/5 p-5 flex flex-col gap-4 shadow-xl"
          >
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10">
                Sign in
              </Button>
            </Link>
            <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                Get started free
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-purple-600/5 rounded-full blur-[80px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-violet-500/20 bg-violet-500/10 text-violet-300 px-4 py-1.5 font-medium tracking-wide text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
              AI-Powered Resume Intelligence
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent"
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
            className="text-base sm:text-lg text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed"
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
                className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white shadow-xl shadow-purple-900/40 px-8 h-12 text-sm font-semibold"
              >
                Start for free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-white h-12 px-8 text-sm font-semibold"
              >
                Sign in
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* High Fidelity App Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative max-w-5xl mx-auto mt-12 overflow-hidden rounded-xl border border-white/10 bg-[#0E0E12]/80 shadow-2xl backdrop-blur-xl"
        >
          {/* Mockup Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="bg-white/5 border border-white/5 rounded-md px-16 py-1 text-[10px] text-white/30 truncate max-w-[280px]">
              career-os.ai/dashboard/resumes
            </div>
            <div className="w-12 h-2" />
          </div>

          {/* Mockup Dashboard Content */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#0E0E12]">
            {/* Sidebar Mockup */}
            <div className="hidden md:flex flex-col gap-4 border-r border-white/5 pr-4 text-white/40">
              <div className="h-6 w-32 bg-white/5 rounded-md" />
              <div className="space-y-2 mt-4">
                <div className="h-7 bg-white/5 border-l-2 border-violet-500 rounded-r-md" />
                <div className="h-7 w-[80%] bg-white/[0.02] rounded-md" />
                <div className="h-7 w-[90%] bg-white/[0.02] rounded-md" />
                <div className="h-7 w-[75%] bg-white/[0.02] rounded-md" />
              </div>
            </div>

            {/* Dashboard Workspace Mockup */}
            <div className="md:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-5 w-44 bg-white/10 rounded-md" />
                  <div className="h-3 w-32 bg-white/5 rounded-md mt-1.5" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                    85
                  </div>
                  <div className="h-3 w-16 bg-emerald-500/10 rounded-md" />
                </div>
              </div>

              {/* Score breakdown bar charts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Impact words", score: "90%", color: "bg-violet-500" },
                  { label: "Keywords match", score: "78%", color: "bg-blue-500" },
                  { label: "ATS format", score: "95%", color: "bg-emerald-500" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-center text-[10px] text-white/40 font-medium">
                      <span>{item.label}</span>
                      <span className="text-white/60">{item.score}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: item.score }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Code/Resume Highlight Mockup */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 font-mono text-[11px] leading-relaxed text-white/55 space-y-2">
                <div>
                  <span className="text-white/20 mr-2 select-none">01</span>
                  <span>Led cross-functional coordination for mobile deployment.</span>
                </div>
                <div className="bg-amber-500/15 border-l-2 border-amber-500 px-2.5 py-1.5 rounded-r-md text-amber-300">
                  <div className="font-bold flex items-center gap-1.5 text-[10px]">
                    <TrendingUp className="w-3 h-3" />
                    AI Suggestion: Quantify impact (medium priority)
                  </div>
                  <div className="text-[10px] text-amber-300/80 mt-0.5">
                    "Led cross-functional coordination for mobile deployment, accelerating release schedule by 15%."
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trusted By logo section */}
        <div className="max-w-6xl mx-auto mt-20 text-center space-y-6">
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
            Trusted by professionals securing roles at
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 grayscale opacity-30 select-none">
            <span className="font-bold text-sm tracking-widest font-heading">GOOGLE</span>
            <span className="font-bold text-sm tracking-widest font-heading">MICROSOFT</span>
            <span className="font-bold text-sm tracking-widest font-heading">META</span>
            <span className="font-bold text-sm tracking-widest font-heading">STRIPE</span>
            <span className="font-bold text-sm tracking-widest font-heading">FIGMA</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-gradient-to-b from-[#060608] via-violet-950/5 to-[#060608]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-xs">
              Workflow
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-2">
              Optimize in three simple steps
            </h2>
            <p className="text-white/50 text-sm max-w-lg mx-auto">
              Our automated workflow highlights gaps and suggests improvements instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((item, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                <div className="text-3xl font-extrabold text-violet-500/20 font-heading leading-none">
                  {item.step}
                </div>
                <h3 className="font-bold text-base text-white">{item.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Everything you need to land your next role
            </h2>
            <p className="text-white/50 text-sm max-w-lg mx-auto">
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
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group relative p-6 rounded-2xl bg-[#0E0E12] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-white/50 text-xs leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Evidence Mode Highlight */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-emerald-500/20 bg-emerald-500/10 text-emerald-300 px-4 py-1.5 text-xs"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Evidence Mode
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              AI that never makes things up
            </h2>
            <p className="text-white/50 text-sm mb-10 max-w-xl mx-auto">
              Every AI recommendation labels its source. Know exactly whether a suggestion
              is based on your resume, your career profile, the job description, or AI inference.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {[
                { label: "From your resume", color: "bg-violet-500/10 border-violet-500/20 text-violet-300", icon: "📄" },
                { label: "From your career profile", color: "bg-blue-500/10 border-blue-500/20 text-blue-300", icon: "👤" },
                { label: "AI inference — clearly flagged", color: "bg-amber-500/10 border-amber-500/20 text-amber-300", icon: "🤖" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${item.color} flex items-center gap-3`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-violet-500/20 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-xs">
              Reviews
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mt-4 mb-2">
              Success stories
            </h2>
            <p className="text-white/50 text-sm">
              Read how candidates landed interviews at leading companies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-white/80 text-xs italic leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-6 border-t border-white/5 pt-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold font-heading">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">{t.author}</h4>
                    <span className="text-[10px] text-white/40 mt-1 block">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats section */}
      <section className="py-12 border-t border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center p-3">
              <div className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent font-heading">
                {stat.value}
              </div>
              <div className="text-[10px] font-bold text-white/30 mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Card with Animated Glowing Border */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center p-12 rounded-2xl bg-[#0E0E12] border border-violet-500/20 relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-30 pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 font-heading">
            Build your best resume today
          </h2>
          <p className="text-white/50 text-xs mb-8">
            Free to start. No credit card required.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-0 text-white shadow-xl shadow-purple-900/40 px-10 h-11 text-xs font-bold"
            >
              Create your resume
              <ArrowRight className="ml-2 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 bg-[#040406]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">CareerOS AI</span>
            </div>
            <p className="text-[11px] text-white/40 max-w-xs leading-relaxed">
              We focus on building honest, factual, and fully explainable career tools powered by state-of-the-art AI models.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-[11px] text-white/55">
                <li><Link href="/register" className="hover:text-white transition-colors">Resume builder</Link></li>
                <li><Link href="/analyze" className="hover:text-white transition-colors">ATS Scan</Link></li>
                <li><Link href="/profile" className="hover:text-white transition-colors">Career Profile</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Transparency</h4>
              <ul className="space-y-2 text-[11px] text-white/55">
                <li><Link href="/" className="hover:text-white transition-colors">Evidence Mode</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">ATS compliance</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">Privacy policy</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Connect</h4>
              <ul className="space-y-2 text-[11px] text-white/55">
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><Link href="/" className="hover:text-white transition-colors">Contact sales</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-white/5">
          <p className="text-[10px] text-white/20">
            © {new Date().getFullYear()} CareerOS AI. All rights reserved.
          </p>
          <div className="flex gap-4 text-[10px] text-white/20">
            <Link href="/" className="hover:text-white/40 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-white/40 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
