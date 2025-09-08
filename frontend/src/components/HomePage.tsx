import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BackgroundLines } from "@/aceternity/background-lines";
import { FeaturesSection } from "@/aceternity/features-section";
import { Button } from "@/aceternity/ui/button";
import SectionWrapper from "@/aceternity/ui/section-wrapper";
import { ArrowRight, Users, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BackgroundBeamsWithCollision } from "@/aceternity/ui/background-beams-with-collision";

const scrollToSection = (id: string): void => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
};

const HomePage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor: Element) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        const id = this.getAttribute("href").substring(1);
        scrollToSection(id);
      });
    });

    // Intersection Observer for scroll indicator
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    return () => {
      if (featuresRef.current) {
        observer.unobserve(featuresRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 py-16 md:py-24">
        <motion.h2
          className="text-center text-3xl md:text-5xl lg:text-7xl font-bold py-4 md:py-10 relative z-20 tracking-tight"
          initial={{
            backgroundPosition: "200% center",
            backgroundSize: "200%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundImage: "linear-gradient(90deg, #000, #4f46e5, #000)",
          }}
          animate={{
            backgroundPosition: "-200% center",
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
          }}
        >
          Welcome to InternSetu
        </motion.h2>
        <p className="max-w-2xl mx-auto text-base md:text-lg text-muted-foreground text-center mb-8">
          Build your career with personalized internship recommendations, easy
          application tools, and resources to help you stand out.
        </p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0">
          <Link
            to="/signup"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-20"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 z-20"
          >
            Login
          </Link>
        </div>
      </BackgroundLines>

      {/* Scroll indicator */}
      {!isScrolled && (
        <div className="w-full flex justify-center absolute bottom-8 left-0 z-10">
          <motion.div
            className="cursor-pointer flex flex-col items-center"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            onClick={() => scrollToSection("features")}
          >
            <span className="text-sm text-muted-foreground mb-2">
              Scroll to explore
            </span>
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </motion.div>
        </div>
      )}

      <div ref={featuresRef}>
        <SectionWrapper>
          <FeaturesSection />
        </SectionWrapper>
      </div>

      <SectionWrapper delay={0.2}>
        <section id="how-it-works" className="py-20 px-4 bg-background">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How InternSetu Works
              </h2>
              <p className="text-xl text-muted-foreground">
                Get started in just a few simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  number: 1,
                  title: "Sign Up / Log In",
                  description:
                    "Create your account and unlock access to tailored opportunities.",
                },
                {
                  number: 2,
                  title: "Complete Your Profile",
                  description:
                    "Upload your resume, add skills, and fill in eligibility details.",
                },
                {
                  number: 3,
                  title: "Set Your Preferences",
                  description:
                    "Choose domains, locations, stipend range, and availability.",
                },
                {
                  number: 4,
                  title: "Get AI-Powered Matches",
                  description:
                    "Receive smart internship recommendations based on your profile.",
                },
                {
                  number: 5,
                  title: "Apply with Ease",
                  description:
                    "Explore details, auto-generate cover letters, and submit applications.",
                },
                {
                  number: 6,
                  title: "Track & Stay Updated",
                  description:
                    "Save internships, monitor applications, and get real-time alerts on your dashboard.",
                },
              ].map((step) => (
                <div
                  key={step.number}
                  className="relative p-6 rounded-xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-200 bg-card/50 hover:bg-card"
                >
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xl font-bold mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionWrapper>

      <SectionWrapper delay={0.3}>
        <section className="py-20 px-4 bg-gradient-to-br from-primary/90 to-primary/70">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Land Your Dream Internship?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join our smart internship platform powered by AI. Get personalized
              matches and start your career journey today.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 bg-background hover:bg-background/90 text-foreground hover:shadow-lg transition-all duration-200"
              asChild
            >
              {/* <Link to="/signup" className="flex items-center justify-center">
                Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
              </Link> */}

              <Link to="/" className="flex items-center justify-center">
                Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      </SectionWrapper>

      {/* Footer */}
      <SectionWrapper delay={0.1}>
        <footer className="bg-background border-t border-border py-12 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    InternSetu
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Empowering students with AI-driven internship opportunities
                  and career growth.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-foreground">Platform</h3>
                <ul className="space-y-2">
                  {["Features", "Pricing", "Security"].map((item) => (
                    <li key={item}>
                      <Link
                        to={`/${item.toLowerCase()}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-foreground">Support</h3>
                <ul className="space-y-2">
                  {["Help Center", "Contact Us", "Community"].map((item) => (
                    <li key={item}>
                      <Link
                        to={`/${item.toLowerCase().replace(" ", "-")}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
                <ul className="space-y-2">
                  {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                    (item) => (
                      <li key={item}>
                        <Link
                          to={`/${item.toLowerCase().replace(" ", "-")}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {item}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
              <p>
                &copy; {new Date().getFullYear()} InternSetu. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
      </SectionWrapper>
    </div>
  );
};

export default HomePage;
