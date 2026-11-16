import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { BackgroundLines } from "@/components/landing/background-lines";
import { FeaturesSection } from "@/components/landing/features-section";
import { SectionWrapper } from "@/components/landing/section-wrapper";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";

const steps = [
  {
    title: "Create an account",
    description: "Sign up with your email or Google in a few seconds.",
  },
  {
    title: "Upload your resume",
    description: "AI fills in your profile. Check it, add anything it missed, and save.",
  },
  {
    title: "See your matches",
    description: "Internships ranked by fit, with the reasons behind every score.",
  },
  {
    title: "Practise and apply",
    description: "Run a mock interview for the role, then save or mark it as applied.",
  },
];

export default function HomePage() {
  const { currentUser } = useAuthContext();
  const [showScrollHint, setShowScrollHint] = useState(true);
  const featuresRef = useRef<HTMLDivElement>(null);

  // Hide the scroll hint once the features section is in view.
  useEffect(() => {
    const target = featuresRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollHint(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const primaryCta = currentUser
    ? { to: "/app", label: "Go to your matches" }
    : { to: "/signup", label: "Get started" };

  return (
    <div className="min-h-screen">
      <BackgroundLines className="flex w-full flex-col items-center justify-center px-4 py-16 md:py-24">
        <h1 className="landing-title relative z-20 py-4 text-center text-4xl font-bold tracking-tight md:py-10 md:text-6xl lg:text-7xl">
          Internships that fit you
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-center text-base text-muted-foreground md:text-lg">
          Upload your resume and InternSetu ranks internships by how well you fit, shows you why,
          and helps you practise the interview.
        </p>
        <div className="relative z-20 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-11 px-8">
            <Link to={primaryCta.to}>{primaryCta.label}</Link>
          </Button>
          {!currentUser && (
            <Button asChild size="lg" variant="outline" className="h-11 px-8">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </BackgroundLines>

      {showScrollHint && (
        <a
          href="#features"
          className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center text-muted-foreground"
        >
          <span className="flex flex-col items-center motion-safe:animate-bounce">
            <span className="mb-2 text-sm">Scroll to explore</span>
            <ChevronDown className="h-6 w-6" />
          </span>
        </a>
      )}

      <div ref={featuresRef}>
        <SectionWrapper>
          <FeaturesSection />
        </SectionWrapper>
      </div>

      <SectionWrapper delay={0.2}>
        <section id="how-it-works" className="bg-background px-4 py-20">
          <div className="container mx-auto">
            <h2 className="mb-16 text-center text-3xl font-bold text-foreground md:text-4xl">
              How it works
            </h2>
            <ol className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-xl border bg-card/50 p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                    {index + 1}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </SectionWrapper>

      <SectionWrapper delay={0.2}>
        <section className="bg-gradient-to-br from-primary/90 to-primary/70 px-4 py-20">
          <div className="container mx-auto text-center">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              Find the internship you are ready for
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-primary-foreground/90">
              It takes about a minute from resume to ranked matches.
            </p>
            <Button asChild size="lg" variant="secondary" className="px-8 py-6 text-lg">
              <Link to={primaryCta.to}>
                {primaryCta.label} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </SectionWrapper>

      <footer className="border-t bg-background px-4 py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>&copy; {new Date().getFullYear()} InternSetu</p>
        </div>
      </footer>
    </div>
  );
}
