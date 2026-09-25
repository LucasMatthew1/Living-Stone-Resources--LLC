import { useEffect } from "react";
import { motion } from "framer-motion";
import Lenis from "lenis";
import { Header } from "@/components/Header";
import { Footer, ContactCTA } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ArrowRight, Heart, Sparkle, UserFocus } from "@phosphor-icons/react";

export default function Beauty() {
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
      icon: <UserFocus weight="thin" className="w-12 h-12 text-primary" />,
      title: "Personalized Guidance",
      description: "Beauty solutions tailored to your unique features, lifestyle, and aspirations."
    },
    {
      icon: <Heart weight="thin" className="w-12 h-12 text-primary" />,
      title: "Radiant Confidence",
      description: "Empowering you to feel as good as you look through expert advice and curated regimens."
    },
    {
      icon: <Sparkle weight="thin" className="w-12 h-12 text-primary" />,
      title: "Timeless Beauty",
      description: "Techniques and products focused on longevity and health, ensuring you shine at every age."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <Header variant="light" />
      
      <main>
        {/* Hero Section */}
        <section className="relative h-[80dvh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="/assets/beauty.jpg" 
              alt="Beauty Consultancy" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <Container className="relative z-10">
            <div className="max-w-4xl">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block text-white/80 text-xs font-bold uppercase tracking-[0.3em] mb-6"
              >
                Beauty Consultancy
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-8xl font-display font-bold text-white mb-8 leading-[1.1]"
              >
                Confidence, <br />
                <span className="italic font-normal">Cultivated.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-white font-display italic leading-relaxed max-w-2xl"
              >
                Personalized beauty solutions that go beyond the surface. We provide the guidance you need to reveal your most radiant, confident self.
              </motion.p>
            </div>
          </Container>
        </section>

        {/* Detailed Benefits */}
        <Section className="bg-background">
          <Container>
            <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-secondary/20 p-10 border-t border-brand-purple/10 hover:bg-secondary/40 transition-colors"
                >
                  <div className="mb-8">
                    {benefit.icon}
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4">{benefit.title}</h3>
                  <p className="text-foreground/60 leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Narrative Section */}
        <Section className="bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <img src="/assets/stone-texture.jpg" className="w-full h-full object-cover" alt="" />
          </div>
          <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
          <Container className="relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 leading-tight">
                  Beauty is a reflection of well-being.
                </h2>
                <div className="space-y-6 text-lg opacity-80 leading-relaxed">
                  <p>
                    At Living Stone Resources, our beauty consultancy focuses on the holistic journey. We believe that true beauty stems from a foundation of health and self-assurance.
                  </p>
                  <p>
                    Whether you're looking for a signature look, a skincare overhaul, or professional styling for a significant milestone, we offer a sanctuary for transformation.
                  </p>
                </div>
                <div className="mt-12 flex flex-col sm:flex-row gap-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-3xl font-display italic">Bespoke</span>
                    <span className="text-xs uppercase tracking-[0.3em] opacity-50">Regimens</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-3xl font-display italic">Curated</span>
                    <span className="text-xs uppercase tracking-[0.3em] opacity-50">Selection</span>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="aspect-[4/5] overflow-hidden"
              >
                <img 
                  src="/assets/beauty.jpg" 
                  alt="Radiant Beauty" 
                  className="w-full h-full object-cover saturate-[0.8] hover:saturate-100 transition-all duration-1000"
                />
              </motion.div>
            </div>
          </Container>
        </Section>

        <ContactCTA />
      </main>

      <Footer />
    </div>
  );
}
