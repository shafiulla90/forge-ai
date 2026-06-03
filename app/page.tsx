import { ArrowRight, Rocket, Shield, Zap, Globe } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-background selection:bg-primary/30">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10 animate-pulse duration-[10s]" />
        
        <div className="max-w-4xl w-full text-center flex flex-col items-center gap-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-primary uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-700">
            <Rocket className="w-3.5 h-3.5" />
            V1.0 is now live
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Describe it.<br />Forge it. Ship it.
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-white/50 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The first AI-powered Salesforce Builder that connects to your org, reads your metadata, and implements your vision in seconds.
          </p>

          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-sm shadow-[0_20px_40px_rgba(47,129,247,0.3)] transition-all flex items-center gap-2 group"
            >
              Get Started for Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold text-sm transition-all">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl w-full mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4 group hover:bg-white/[0.04] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold">Metadata-Aware AI</h3>
          <p className="text-sm text-white/40 leading-relaxed">
            Forge reads your actual Salesforce org metadata to ensure every field, object, and class matches your specific setup.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4 group hover:bg-white/[0.04] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-forge-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 text-forge-success" />
          </div>
          <h3 className="text-lg font-bold">Safe Deployment</h3>
          <p className="text-sm text-white/40 leading-relaxed">
            Human-in-the-loop deployments with automated rollbacks and comprehensive AI self-evaluation before shipping to production.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4 group hover:bg-white/[0.04] transition-all">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Globe className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold">Multi-Org DevOps</h3>
          <p className="text-sm text-white/40 leading-relaxed">
            Manage your entire pipeline from Dev to Production with Jira and GitHub integration built-in.
          </p>
        </div>
      </section>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
