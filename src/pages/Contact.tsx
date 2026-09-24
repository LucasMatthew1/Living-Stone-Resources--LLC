import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer, ContactSection } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { useEffect } from "react";
import Lenis from "lenis";

export default function Contact() {
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground scroll-smooth">
      <Header />
      <main className="pt-24">
        {/* Contact Hero */}
        <Section className="pb-0">
          <Container>
            <div className="max-w-4xl">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-accent text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block"
              >
                Get In Touch
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl font-display font-bold mb-8 leading-tight"
              >
                Let's Build Your <span className="italic font-normal">Next Chapter.</span>
              </motion.h1>
            </div>
          </Container>
        </Section>

        {/* Contact Form Section */}
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
