import { useEffect } from "react";
import { motion } from "framer-motion";
import Lenis from "lenis";
import { Header } from "@/components/Header";
import { Footer, ContactCTA } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ArrowRight, Scissors, Needle, PaintBrushHousehold } from "@phosphor-icons/react";

export default function Clothing() {
  useEffect(() => {
    window.scrollTo(0, 0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const benefits = [
    {
      icon: <Scissors weight="thin" className="w-12 h-12 text-primary" />,
      title: "Hand-Woven Art",
      description: "Each piece is crafted with meticulous attention to detail, ensuring a level of craftsmanship that mass-production cannot replicate."
    },
    {
      icon: <Needle weight="thin" className="w-12 h-12 text-primary" />,
      title: "Unique Character",
      description: "No two garments are identical. We celebrate the beauty of variation and the story told through every stitch."
    },
    {
      icon: <PaintBrushHousehold weight="thin" className="w-12 h-12 text-primary" />,
      title: "Timeless Style",
      description: "Designs that transcend fleeting trends, built to be worn, loved, and passed down as heirlooms."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative h-[80dvh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="/assets/woven-1.jpg" 
              alt="Woven Clothing Craftsmanship" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <Container className="relative z-10">
            <div className="max-w-4xl">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block text-primary-foreground/80 text-xs font-bold uppercase tracking-[0.3em] mb-6"
              >
                Creative Resources
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-8xl font-display font-bold text-white mb-8 leading-[1.1]"
              >
                Crafted for <br />
                <span className="italic font-normal">Character.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-white/70 font-display italic leading-relaxed max-w-2xl"
              >
                Bespoke woven clothing that speaks to your uniqueness. Experience the tactile beauty of craftsmanship and the luxury of hand-finished detail.
              </motion.p>
            </div>
          </Container>
        </section>

        {/* Gallery / Benefits */}
        <Section>
          <Container>
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-center mb-32">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">The Art of the Weave.</h2>
                <p className="text-lg text-foreground/70 leading-relaxed mb-10">
                  Our clothing isn't just about fashion; it's about expression. We use traditional techniques to create modern silhouettes that celebrate the individual.
                </p>
                <div className="space-y-6">
                  {benefits.map((benefit) => (
                    <div key={benefit.title} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-secondary/50 flex items-center justify-center">
                        {benefit.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-2 uppercase tracking-widest text-xs">{benefit.title}</h4>
                        <p className="text-sm text-foreground/60 leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img 
                    src="/assets/woven-2.jpg" 
                    alt="Woven Detail" 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 bg-primary p-8 text-primary-foreground hidden md:block">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2">Philosophy</p>
                  <p className="font-display italic text-2xl">"Every thread has a story."</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* Callout Section */}
        <Section className="bg-secondary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
            <img src="/assets/stone-texture.jpg" className="w-full h-full object-cover" alt="" />
          </div>
          <Container>
            <div className="max-w-3xl">
              <h3 className="text-4xl font-display font-bold mb-8">Designed for the Discerning.</h3>
              <p className="text-xl text-foreground/70 leading-relaxed mb-12 italic font-display">
                We believe that what you wear should be a reflection of your journey. Our woven pieces are built to accompany you through the seasons of life.
              </p>
              <div className="flex flex-wrap gap-x-12 gap-y-6">
                {['Custom Fittings', 'Sustainably Sourced', 'Artisanal Techniques'].map((tag) => (
                  <span key={tag} className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary/20 rounded-full" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Container>
        </Section>

        <ContactCTA />
      </main>

      <Footer />
    </div>
  );
}
