import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Container } from "./layout/Container";
import { ArrowRight } from "@phosphor-icons/react";

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center pt-20 overflow-hidden">
      {/* Background Video with Overlay */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-60 grayscale brightness-75"
        >
          <source src="/assets/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      </div>

      <Container className="relative z-10">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block text-accent font-sans font-semibold tracking-[0.2em] uppercase text-xs mb-4">
              Living Stone Resources, LLC
            </span>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-bold leading-[0.9] mb-6">
              Built Up<span className="text-accent">!</span>
            </h1>
            <p className="text-xl md:text-2xl font-display italic text-foreground mb-8 max-w-xl">
              Business. Numbers. Style. Beauty.
            </p>
            <p className="text-lg md:text-xl font-sans text-foreground mb-10 max-w-2xl leading-relaxed">
              Living Stone Resources, LLC provides practical business guidance, dependable bookkeeping, unique woven clothing, and beauty consultancy—all designed to help you build with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground h-14 px-8 text-sm uppercase tracking-widest group">
                Explore Our Services
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-sm uppercase tracking-widest border-primary/20 hover:bg-primary/5">
                Get Started
              </Button>
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Subtle Texture Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{ backgroundImage: `url('/assets/stone-texture.jpg')`, backgroundSize: 'cover' }}
      />
    </section>
  );
}
