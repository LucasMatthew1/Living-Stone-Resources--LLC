import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";

export function BrandStory() {
  return (
    <Section id="story" className="bg-background overflow-hidden">
      <Container>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-primary text-xs font-sans font-bold tracking-[0.2em] uppercase mb-8 block">
              Our Philosophy
            </span>
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-12 leading-tight">
              A Foundation Built on <br />
              <span className="italic font-normal serif text-primary">Integrity & Craft.</span>
            </h2>
            <div className="space-y-8 text-lg md:text-xl font-sans text-foreground leading-relaxed">
              <p>
                Living Stone Resources, LLC was founded with a singular purpose: to provide a firm foundation for growth—whether professional, financial, or personal.
              </p>
              <p>
                We believe that business and beauty are not mutually exclusive. Structure provides the freedom for creativity to flourish, and clarity in numbers allows for confidence in expression.
              </p>
              <p className="font-display italic text-2xl md:text-3xl pt-8 border-t border-border mt-12">
                "We don't just provide resources; we help you build the architecture of your life and business."
              </p>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
