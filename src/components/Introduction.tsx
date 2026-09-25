import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Briefcase, Calculator, TShirt, Sparkle } from "@phosphor-icons/react";

const pillars = [
  {
    title: "Business Consultancy",
    description: "Strategic guidance to help businesses build, organize, and grow.",
    icon: <Briefcase size={32} weight="thin" />,
  },
  {
    title: "Bookkeeping",
    description: "Reliable financial organization and bookkeeping support.",
    icon: <Calculator size={32} weight="thin" />,
  },
  {
    title: "Unique Woven Clothing",
    description: "Distinctive woven clothing pieces with personality and character.",
    icon: <TShirt size={32} weight="thin" />,
  },
  {
    title: "Beauty Consultancy",
    description: "Personalized guidance focused on beauty, presentation, and confidence.",
    icon: <Sparkle size={32} weight="thin" />,
  },
];

export function Introduction() {
  return (
    <Section id="about" className="bg-secondary/10">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
              Resources to Help You Build Up.
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-lg md:text-xl font-sans text-foreground leading-relaxed">
              Living Stone Resources, LLC brings together professional services and creative resources under one brand. Whether you're building a business, organizing your books, developing your personal style, or exploring beauty solutions, we're here to help you move forward with clarity and confidence.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="p-8 border border-border/50 hover:border-brand-purple/30 transition-colors group bg-secondary/30 border-t-brand-purple/10"
            >
              <div className="text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
                {pillar.icon}
              </div>
              <h3 className="text-xl font-display font-bold mb-4">{pillar.title}</h3>
              <p className="text-foreground leading-relaxed text-sm">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
