import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";

const points = [
  {
    num: "01",
    title: "Practical",
    description: "Focused on useful solutions and real-world needs.",
  },
  {
    num: "02",
    title: "Personal",
    description: "Services designed around the individual client or business.",
  },
  {
    num: "03",
    title: "Creative",
    description: "Combining professional resources with personal expression.",
  },
  {
    num: "04",
    title: "Growth-Minded",
    description: "Helping clients move forward with greater confidence.",
  },
];

const steps = [
  {
    num: "01",
    title: "CONNECT",
    description: "Tell us what you're looking to accomplish.",
  },
  {
    num: "02",
    title: "DISCOVER",
    description: "We'll understand your needs and identify the right resource.",
  },
  {
    num: "03",
    title: "BUILD",
    description: "Work together on the service or solution that fits.",
  },
  {
    num: "04",
    title: "MOVE FORWARD",
    description: "Leave with greater clarity, confidence, and direction.",
  },
];

export function WhyUs() {
  return (
    <Section className="bg-secondary/30 border-y border-border/50">
      <Container>
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            More Than One Resource. One Place to Build.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {points.map((point, i) => (
            <motion.div
              key={point.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative"
            >
              <span className="text-brand-purple/50 text-6xl md:text-7xl lg:text-8xl font-display font-bold absolute -top-12 left-0 md:-left-6 z-0 select-none hidden md:block">
                {point.num}
              </span>
              <div className="relative z-10">
                <h3 className="text-xl font-display font-bold mb-4">{point.title}</h3>
                <p className="text-foreground/70 leading-relaxed text-sm">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function Process() {
  return (
    <Section className="bg-background">
      <Container>
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Our Process
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="p-10 border border-border hover:border-primary transition-colors bg-background flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl mb-8">
                {step.num}
              </div>
              <h3 className="text-xl font-display font-bold mb-4 uppercase tracking-wider">{step.title}</h3>
                <p className="text-foreground leading-relaxed text-sm">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
