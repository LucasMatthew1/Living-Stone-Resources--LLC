import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Button } from "./ui/button";
import { ArrowRight } from "@phosphor-icons/react";

export function ConsultancyFeature() {
  return (
    <Section id="consultancy" className="p-0 overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative h-[500px] lg:h-auto"
        >
          <img
            src="/assets/business.jpg"
            alt="Professional Consultancy"
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        <div className="bg-background flex items-center p-12 md:p-24 lg:p-32">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span className="text-accent text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block">
              Business Consultancy
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 leading-tight">
              Build Your Business With Intention
            </h2>
            <p className="text-lg text-foreground/90 mb-10 leading-relaxed max-w-xl">
              Every business has different challenges. Living Stone Resources provides practical consultancy designed to help you understand where you are, identify opportunities, and move forward with greater clarity.
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground group">
              Let's Talk Business
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

export function BookkeepingFeature() {
  return (
    <Section id="bookkeeping" className="bg-muted/30">
      <Container>
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <span className="text-secondary text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block">
              Bookkeeping
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 leading-tight">
              Know Your Numbers. Build With Confidence.
            </h2>
            <p className="text-lg text-foreground/90 mb-12 leading-relaxed">
              Good bookkeeping provides the organization businesses need to understand their financial activity and stay on top of their records.
            </p>
            
            <div className="grid grid-cols-2 gap-8 mb-12">
              {[
                "Organized records",
                "Financial clarity",
                "Business organization",
                "Reporting"
              ].map((item, i) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent" />
                  <span className="font-sans font-medium text-foreground/80">{item}</span>
                </div>
              ))}
            </div>

            <Button size="lg" className="bg-primary text-primary-foreground group">
              Bookkeeping Services
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square bg-background border border-border p-8 shadow-xl">
              <img
                src="/assets/bookkeeping.jpg"
                alt="Bookkeeping"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative stone element */}
            <div className="absolute -bottom-6 md:-bottom-10 -right-6 md:-right-10 w-32 md:w-48 h-32 md:h-48 bg-muted border border-border z-[-1]" />
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
