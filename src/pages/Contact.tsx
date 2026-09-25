import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer, ContactSection } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { useEffect } from "react";
import Lenis from "lenis";

export default function Contact() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
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
        {/* Contact Hero */}
        <Section className="pb-0">
          <Container>
            <div className="max-w-4xl">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-primary text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block"
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

        {/* Map Section */}
        <Section className="pt-0">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative w-full h-[450px] bg-secondary/20 overflow-hidden group border border-primary/10 shadow-2xl"
            >
              <div className="absolute inset-0 pointer-events-none border-[12px] border-background z-10" />
              <iframe
                title="Office Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.238804689255!2d-74.26189332342371!3d40.7347499713898!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c254924c5e8f47%3A0x6b772421f185c7b3!2s4%20S%20Orange%20Ave%20%23340%2C%20South%20Orange%2C%20NJ%2007079!5e0!3m2!1sen!2sus!4v1715854321098!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(1) contrast(1.2) invert(0.9) opacity(0.8)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale-filter hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute bottom-12 left-12 z-20 bg-background/90 backdrop-blur-md p-6 max-w-xs border border-primary/10 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">Our Office</p>
                <p className="text-sm font-display italic text-foreground/80 leading-relaxed">
                  4 South Orange Ave 340,<br />
                  South Orange, NJ 07079
                </p>
              </div>
            </motion.div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
