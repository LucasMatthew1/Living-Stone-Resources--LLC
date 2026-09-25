import { useEffect } from "react";
import { motion } from "framer-motion";
import Lenis from "lenis";
import { Header } from "@/components/Header";
import { Footer, ContactCTA } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ArrowRight, Calculator, ChartPie, ShieldCheck } from "@phosphor-icons/react";

export default function Bookkeeping() {
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
      icon: <Calculator weight="thin" className="w-12 h-12 text-primary" />,
      title: "Financial Clarity",
      description: "Transform messy records into clean, actionable data that tells the true story of your business."
    },
    {
      icon: <ChartPie weight="thin" className="w-12 h-12 text-primary" />,
      title: "Sound Decisions",
      description: "Make confident choices backed by accurate financial reports and real-time insights."
    },
    {
      icon: <ShieldCheck weight="thin" className="w-12 h-12 text-primary" />,
      title: "Compliance & Peace",
      description: "Stay ahead of deadlines and regulations with meticulous attention to detail and record-keeping."
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
              src="/assets/bookkeeping.jpg" 
              alt="Bookkeeping Services" 
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
                Financial Services
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-8xl font-display font-bold text-white mb-8 leading-[1.1]"
              >
                Clarity in <br />
                <span className="italic font-normal">the Numbers.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-white font-display italic leading-relaxed max-w-2xl"
              >
                Providing the roadmap for growth through sound financial management. We bring order to your finances so you can focus on building your legacy.
              </motion.p>
            </div>
          </Container>
        </section>

        {/* Benefits Section */}
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
                  className="group"
                >
                  <div className="mb-8 p-6 bg-secondary/30 inline-block border-t-2 border-primary/20 transition-transform group-hover:-translate-y-2">
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

        {/* Process/Deep Dive */}
        <Section className="bg-secondary/10">
          <Container>
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="aspect-square bg-primary/5 absolute -top-10 -left-10 w-full h-full -z-10" />
                <img 
                  src="/assets/stone-texture.jpg" 
                  alt="Texture" 
                  className="w-full aspect-square object-cover grayscale opacity-50 absolute inset-0 mix-blend-multiply"
                />
                <div className="aspect-square bg-primary flex items-center justify-center p-12 text-primary-foreground relative z-10">
                  <div>
                    <h3 className="text-4xl md:text-5xl font-display font-bold mb-6">Built on order.</h3>
                    <p className="text-lg opacity-80 leading-relaxed mb-8">
                      A business is only as strong as its foundation. Our bookkeeping services provide the stability you need to weather any storm.
                    </p>
                    <div className="h-px w-24 bg-white/30" />
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-6 block">Our Commitment</span>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">Precise Management.</h2>
                <div className="space-y-6 text-lg text-foreground/70 leading-relaxed">
                  <p>
                    We specialize in small to mid-sized business bookkeeping, offering customized solutions that fit your specific industry needs. 
                  </p>
                  <p>
                    From account reconciliations to financial statement preparation, we ensure every cent is accounted for, providing you with a clear roadmap for your next big move.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-12">
                  <div className="space-y-2">
                    <p className="text-3xl font-display font-bold text-primary">100%</p>
                    <p className="text-xs uppercase tracking-widest font-bold">Accuracy</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-display font-bold text-primary">Zero</p>
                    <p className="text-xs uppercase tracking-widest font-bold">Stress</p>
                  </div>
                </div>
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
