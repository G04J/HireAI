import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Users, Zap, BarChart3, ChevronRight, Briefcase } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { AuthNav } from '@/components/auth-nav';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 h-20 flex items-center border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">AegisHire</span>
        </Link>
        <nav className="ml-auto flex items-center gap-6">
          <Link href="/employer" className="text-sm font-medium hover:text-primary transition-colors">
            For Employers
          </Link>
          {user ? (
            <Button asChild>
              <Link href="/employer/jobs/new">Post a Job</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">Post a Job</Link>
            </Button>
          )}
          <AuthNav user={user} />
        </nav>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 bg-gradient-to-b from-white to-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-white text-primary w-fit shadow-sm">
                  <Zap className="w-4 h-4 mr-2 text-accent" />
                  AI-Native Recruitment Automation
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight">
                  The Multi-Stage Interview Engine that <span className="text-primary">Scales Trust</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-[600px] leading-relaxed">
                  AegisHire automates your entire interview pipeline. From resume fit checks to complex technical coding and case simulations—all driven by intelligent AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Button size="lg" className="h-12 px-8 text-lg" asChild>
                    <Link href="/employer/jobs/new">Create Pipeline <ChevronRight className="ml-2 w-5 h-5" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
                    <Link href="/employer">View Dashboard</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-50"></div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-primary/20">
                  <Image 
                    src="https://picsum.photos/seed/aegishire-dashboard/800/600"
                    alt="AegisHire Dashboard Preview"
                    width={800}
                    height={600}
                    className="object-cover w-full h-full"
                    data-ai-hint="software dashboard"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 border-t bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Unfair Advantages for Modern Hiring</h2>
              <p className="text-muted-foreground max-w-[700px] mx-auto text-lg">
                Stop spending hundreds of hours on first-round screenings. Let AegisHire handle the heavy lifting while you focus on the final selection.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Briefcase className="w-6 h-6" />}
                title="Multi-Stage Pipelines"
                description="Configure up to 6 custom stages including Behavioral, Coding, Case Simulations, and more."
              />
              <FeatureCard 
                icon={<Zap className="w-6 h-6" />}
                title="AI Resume Fit Check"
                description="Instantly verify if a candidate meets your must-have skills and seniority requirements."
              />
              <FeatureCard 
                icon={<Shield className="w-6 h-6" />}
                title="AI Collaboration Assessment"
                description="Unique mode that allows and evaluates how candidates use AI tools to solve complex problems."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6" />}
                title="Smart Scoring Rubrics"
                description="Define specific criteria and weights for each stage. AI provides consistent, unbiased scores."
              />
              <FeatureCard 
                icon={<Users className="w-6 h-6" />}
                title="Employer Dashboard"
                description="Track every candidate's progress through the pipeline in real-time with detailed audit logs."
              />
              <FeatureCard 
                icon={<ChevronRight className="w-6 h-6" />}
                title="Shareable Public Links"
                description="Generate branded job links and publish them anywhere to start collecting automated interviews."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 border-t bg-muted/30">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">AegisHire</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 AegisHire Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}