import { useEffect } from "react";
import { motion } from "framer-motion";
import Lenis from "lenis";
import { Header } from "@/components/Header";
import { Footer, ContactCTA } from "@/components/ContactSections";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { ArrowRight, Strategy, ChartLineUp, Target } from "@phosphor-icons/react";

export default function BusinessConsultancy() {
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
      icon: <Strategy weight="thin" className="w-12 h-12 text-primary" />,
      title: "Strategic Intention",
      description: "We help you define your purpose and align your business operations with your long-term vision."
    },
    {
      icon: <Target weight="thin" className="w-12 h-12 text-primary" />,
      title: "Growth Roadmap",
      description: "Detailed actionable plans that bridge the gap between where you are and where you want to be."
    },
    {
      icon: <ChartLineUp weight="thin" className="w-12 h-12 text-primary" />,
      title: "Operational Excellence",
      description: "Streamlining processes to increase efficiency and allow you to focus on high-impact decisions."
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
              src="/assets/business.jpg" 
              alt="Business Strategy" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <Container className="relative z-10">
            <div className="max-w-4xl">
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-block text-primary-foreground/80 text-xs font-bold uppercase tracking-[0.3em] mb-6"
              >
                Business Consultancy
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-8xl font-display font-bold text-white mb-8 leading-[1.1]"
              >
                Strategy with <br />
                <span className="italic font-normal">Intention.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl text-white/70 font-display italic leading-relaxed max-w-2xl"
              >
                Building businesses on foundations of clarity and purpose. We partner with you to navigate growth and define your unique path to success.
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

        {/* Deep Dive Section */}
        <Section className="bg-secondary/20">
          <Container>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-6 block">Our Approach</span>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 leading-tight">
                  Building more than just a business.
                </h2>
                <div className="space-y-6 text-lg text-foreground/70 leading-relaxed">
                  <p>
                    Consultancy at Living Stone Resources is not just about numbers and spreadsheets. It's about the heart of your operation—the "why" behind the "what."
                  </p>
                  <p>
                    We work closely with leadership to identify bottlenecks, uncover hidden opportunities, and foster a culture of intentional growth. Whether you're a startup or an established entity, our goal is to build you up.
                  </p>
                </div>
                <div className="mt-10 pt-8 border-t border-primary/10">
                  <ul className="space-y-4">
                    {['Market Positioning', 'Leadership Development', 'Strategic Planning', 'Operational Audit'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-primary">
                        <ArrowRight size={16} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="aspect-[4/5] relative overflow-hidden"
              >
                <img 
                  src="/assets/about-narrative.jpg" 
                  alt="Strategic Consultation" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-primary/10" />
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
