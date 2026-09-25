import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Eye, Target } from "@phosphor-icons/react";
import { useEffect } from "react";
import Lenis from "lenis";

export default function About() {
  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground scroll-smooth">
      <Header />
      <main className="pt-24">
        {/* Hero Section */}
        <Section className="relative overflow-hidden py-24 md:py-32">
          <Container>
            <div className="max-w-4xl">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-primary text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block"
              >
                Our Story
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-8 leading-tight"
              >
                Building Foundations for <span className="italic font-normal">Living Well.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl font-display italic text-foreground/80 leading-relaxed max-w-2xl"
              >
                Living Stone Resources was born from a simple belief: that the structures we build—in business, in finance, and in our personal style—should endure.
              </motion.p>
            </div>
          </Container>
        </Section>

        {/* Narrative Section */}
        <Section className="bg-secondary/30">
          <Container>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                <img 
                  src="/assets/about-narrative.jpg" 
                  alt="Craftsmanship" 
                  className="absolute inset-0 w-full h-full object-cover grayscale hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="space-y-8">
                <h2 className="text-4xl font-display font-bold">The Architecture of Growth.</h2>
                <div className="space-y-6 text-lg leading-relaxed text-foreground/80">
                  <p>
                    We provide a unique intersection of services designed to support the modern entrepreneur and individual. From the precision of bookkeeping to the creative expression of woven clothing, every resource we offer is a building block for your success.
                  </p>
                  <p>
                    Our approach is holistic. We understand that a well-organized business allows for a more creative life, and that personal confidence—expressed through style and beauty—is the fuel for professional achievement.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border">
                  <div>
                    <span className="text-3xl font-display font-bold block mb-2 text-primary">10+</span>
                    <span className="text-xs uppercase tracking-widest text-primary/60 font-bold">Years Experience</span>
                  </div>
                  <div>
                    <span className="text-3xl font-display font-bold block mb-2 text-primary">500+</span>
                    <span className="text-xs uppercase tracking-widest text-primary/60 font-bold">Clients Built Up</span>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* Values Section */}
        <Section>
          <Container>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-6 p-8 bg-secondary/30 border border-border/50">
                <Target size={40} weight="thin" className="text-primary" />
                <h3 className="text-2xl font-display font-bold">Our Mission</h3>
                <p className="text-foreground/70 leading-relaxed">
                  To provide practical guidance and creative resources that empower individuals to build their businesses and lives on solid ground.
                </p>
              </div>
              <div className="space-y-6 p-8 bg-secondary/30 border border-border/50">
                <Eye size={40} weight="thin" className="text-primary" />
                <h3 className="text-2xl font-display font-bold">Our Vision</h3>
                <p className="text-foreground/70 leading-relaxed">
                  To become the premier resource for integrated business and lifestyle solutions, where professional excellence meets creative character.
                </p>
              </div>
              <div className="space-y-6 p-8 bg-secondary/30 border border-border/50">
                <Users size={40} weight="thin" className="text-primary" />
                <h3 className="text-2xl font-display font-bold">Our Community</h3>
                <p className="text-foreground/70 leading-relaxed">
                  We believe in building together. Our community is a space for growth, sharing, and the celebration of unique character.
                </p>
              </div>
            </div>
          </Container>
        </Section>

        {/* CTA */}
        <Section className="bg-primary text-primary-foreground py-32">
          <Container className="text-center">
            <h2 className="text-5xl md:text-7xl font-display font-bold mb-12">Join the Movement.</h2>
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-16 px-12 text-sm uppercase tracking-widest font-bold group" asChild>
              <a href="/contact">
                Start Your Journey
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
