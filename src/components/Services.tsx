import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Button } from "./ui/button";
import { ArrowRight, Briefcase, Calculator, TShirt, Sparkle } from "@phosphor-icons/react";

const services = [
  {
    id: "consultancy",
    title: "BUSINESS CONSULTANCY",
    subtitle: "Build your business with greater clarity and direction.",
    description: "Provide strategic guidance and practical consulting resources designed around business needs.",
    cta: "Explore Business Consulting",
    image: "/assets/business.jpg",
    icon: <Briefcase size={24} />,
  },
  {
    id: "bookkeeping",
    title: "BOOKKEEPING",
    subtitle: "Keep your business finances organized.",
    description: "Provide dependable bookkeeping support designed to help businesses maintain better financial organization.",
    cta: "Explore Bookkeeping",
    image: "/assets/bookkeeping.jpg",
    icon: <Calculator size={24} />,
  },
  {
    id: "clothing",
    title: "UNIQUE WOVEN CLOTHING",
    subtitle: "Wear something uniquely yours.",
    description: "Showcase unique woven clothing with an emphasis on individuality, craftsmanship, and distinctive style.",
    cta: "Explore Clothing",
    image: "/assets/woven-1.jpg",
    icon: <TShirt size={24} />,
  },
  {
    id: "beauty",
    title: "BEAUTY CONSULTANCY",
    subtitle: "Build confidence through thoughtful beauty guidance.",
    description: "Present beauty consultancy as a personalized service focused on helping clients make informed choices about their appearance and presentation.",
    cta: "Explore Beauty Consulting",
    image: "/assets/beauty.jpg",
    icon: <Sparkle size={24} />,
  },
];

export function Services() {
  return (
    <Section id="services" className="bg-secondary/30 border-y border-border/50">
      <Container>
        <div className="mb-16 text-center">
          <span className="text-primary text-xs font-sans font-bold tracking-[0.2em] uppercase mb-4 block">
            Core Offerings
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            How We Build You Up.
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {services.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="group relative flex flex-col h-full bg-background border border-border overflow-hidden hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Image Overlay on Hover */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors duration-500" />
                <div className="absolute top-6 left-6 w-12 h-12 bg-background flex items-center justify-center text-primary shadow-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {service.icon}
                </div>
              </div>

              <div className="p-10 flex flex-col flex-grow">
                <span className="text-primary text-xs font-sans font-bold tracking-[0.2em] mb-4">
                  {service.title}
                </span>
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-6 group-hover:text-primary transition-colors">
                  {service.subtitle}
                </h3>
                <p className="text-foreground mb-8 leading-relaxed">
                  {service.description}
                </p>
                <div className="mt-auto">
                  <a
                    href={`#${service.id}`}
                    className="inline-flex items-center text-sm font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-opacity group/link"
                  >
                    {service.cta}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
