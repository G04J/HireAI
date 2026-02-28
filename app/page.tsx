import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Users, Zap, BarChart3, ChevronRight, Briefcase, CheckCircle, Star } from 'lucide-react';
import { PipelineDemo } from '@/components/pipeline-demo';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="px-6 h-20 flex items-center border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-xl text-white group-hover:scale-105 transition-transform shadow-lg shadow-blue-600/40">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AegisHire</span>
        </Link>
        <nav className="ml-auto flex items-center gap-6">
          <Link href="/employer" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            For Employers
          </Link>
          <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30">
            <Link href="/employer/jobs/new">Post a Job</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative py-28 md:py-40 overflow-hidden">
          {/* Gradient orb background */}
          <div className="absolute inset-0 bg-slate-950">
            <div className="absolute top-[-80px] left-[5%] w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[130px]" />
            <div className="absolute bottom-[-40px] right-[5%] w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[120px]" />
            <div className="absolute top-[40%] left-[45%] w-[300px] h-[300px] bg-cyan-500/15 rounded-full blur-[90px]" />
          </div>
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center gap-8 max-w-5xl mx-auto">

              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-500/40 px-5 py-2 text-sm font-medium bg-blue-500/10 text-blue-300 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                AI-Native Recruitment Automation
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/30 text-blue-200 font-semibold">NEW</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.05]">
                Hire the Best.
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
                  10&times; Faster.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed">
                Automate your entire interview pipeline — resume checks, coding tests, behavioral simulations, and more. All scored by AI, consistently and at scale.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button size="lg" className="h-14 px-10 text-lg bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-2xl shadow-blue-600/40 font-semibold" asChild>
                  <Link href="/employer/jobs/new">
                    Create Pipeline <ChevronRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link href="/employer">View Dashboard</Link>
                </Button>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 pt-8 mt-4 border-t border-white/10 w-full">
                {[
                  { value: '<10s', label: 'Resume screening' },
                  { value: '6',    label: 'Interview stages'  },
                  { value: '99%',  label: 'Screening time saved' },
                  { value: '24/7', label: 'Automated interviews' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl md:text-4xl font-black text-white">{s.value}</div>
                    <div className="text-sm text-slate-400 mt-1 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DEMO */}
        <section className="py-24 bg-slate-950 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/8 rounded-full blur-[100px]" />
          </div>
          <div className="relative container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center rounded-full border border-blue-500/30 px-4 py-1.5 text-sm font-medium bg-blue-500/10 text-blue-300 mb-6">
                <Zap className="w-4 h-4 mr-2 text-cyan-400" />
                Try It Yourself
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Build a pipeline in{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  30 seconds
                </span>
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-lg">
                Add stages, toggle AI collaboration mode, set pass thresholds — then switch to Results to see how candidates get ranked automatically.
              </p>
            </div>
            <div className="max-w-5xl mx-auto">
              <PipelineDemo />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 border-y border-white/5 relative overflow-hidden bg-slate-900/40">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-cyan-500/30 px-4 py-1.5 text-sm font-medium bg-cyan-500/10 text-cyan-300 mb-6">
                How It Works
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                From posting to hire in{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  3 steps
                </span>
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto text-lg">
                Go from job posting to a ranked shortlist in minutes, not weeks.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  icon: <Briefcase className="w-6 h-6" />,
                  title: 'Build Your Pipeline',
                  desc: 'Define interview stages, scoring rubrics, and must-have requirements in minutes.',
                },
                {
                  step: '02',
                  icon: <Zap className="w-6 h-6" />,
                  title: 'Candidates Interview 24/7',
                  desc: 'Share a single link. Candidates complete AI-driven interviews on their own schedule.',
                },
                {
                  step: '03',
                  icon: <BarChart3 className="w-6 h-6" />,
                  title: 'Review Top Talent',
                  desc: 'Get AI-ranked candidates with detailed scores, full transcripts, and audit logs.',
                },
              ].map((item) => (
                <div key={item.step} className="card-animated-border rounded-2xl">
                  <div className="relative p-8 rounded-2xl bg-slate-800/40 overflow-hidden h-full">
                    <div className="absolute top-4 right-6 text-7xl font-black text-blue-400/40 leading-none select-none">
                      {item.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-24 bg-slate-950">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
                Every tool to find{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  the right hire
                </span>
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto text-lg">
                Stop wasting hundreds of hours on first-round screenings. Let AegisHire handle the heavy lifting.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <DarkFeatureCard
                icon={<Briefcase className="w-6 h-6" />}
                title="Multi-Stage Pipelines"
                description="Configure up to 6 custom stages: Behavioral, Coding, Case Simulations, and more."
                gradient="from-blue-600 to-blue-700"
              />
              <DarkFeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="AI Resume Fit Check"
                description="Instantly verify must-have skills and seniority requirements before a single interview."
                gradient="from-cyan-600 to-cyan-700"
              />
              <DarkFeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="AI Collaboration Mode"
                description="Evaluate how candidates leverage AI tools to solve complex problems — a first-of-its-kind hiring signal."
                gradient="from-indigo-600 to-indigo-700"
              />
              <DarkFeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Smart Scoring Rubrics"
                description="Define criteria and weights for each stage. AI delivers consistent, unbiased scores every time."
                gradient="from-blue-600 to-indigo-600"
              />
              <DarkFeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Real-Time Dashboard"
                description="Track every candidate's progress with stage-by-stage reports and full audit logs."
                gradient="from-cyan-600 to-blue-600"
              />
              <DarkFeatureCard
                icon={<ChevronRight className="w-6 h-6" />}
                title="Shareable Public Links"
                description="Generate branded job links and publish anywhere to start collecting automated interviews instantly."
                gradient="from-indigo-600 to-blue-600"
              />
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-[-80px] left-[20%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-40px] right-[20%] w-48 h-48 bg-white/10 rounded-full blur-3xl" />

          <div className="relative container mx-auto px-6 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white mb-8 backdrop-blur-sm">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              Built for Modern Hiring Teams
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              Ready to Transform Your Hiring?
            </h2>
            <p className="text-blue-100 text-xl mb-10 leading-relaxed">
              Create your first AI-powered interview pipeline in under 5 minutes. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-14 px-10 text-xl bg-white text-blue-700 hover:bg-blue-50 shadow-2xl font-bold border-0" asChild>
                <Link href="/employer/jobs/new">
                  Get Started Free <ChevronRight className="ml-2 w-6 h-6" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-xl border-white/40 text-white hover:bg-white/10 hover:text-white bg-transparent" asChild>
                <Link href="/employer">View Demo</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 text-blue-200 text-sm">
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Free to start</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Setup in minutes</div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/10 bg-slate-950">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">AegisHire</span>
          </div>
          <p className="text-sm text-slate-500">© 2025 AegisHire Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="text-sm text-slate-500 hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DarkFeatureCard({
  icon, title, description, gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="card-animated-border rounded-2xl">
      <div className="p-8 rounded-2xl bg-slate-900/60 h-full">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-6 shadow-lg`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
