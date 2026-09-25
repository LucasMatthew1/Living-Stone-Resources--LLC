import { useRef, useLayoutEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Button } from "./ui/button";
import { ArrowRight } from "@phosphor-icons/react";

gsap.registerPlugin(ScrollTrigger);

export function ClothingFeature() {
  const horizontalRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (reduceMotion) return;
    
    let ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      
      mm.add("(min-width: 768px)", () => {
        const track = trackRef.current;
        if (!track) return;
        
        // Add a buffer to prevent clipping off the left edge
        const distance = track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: -distance,
          ease: "none",
          scrollTrigger: {
            trigger: horizontalRef.current,
            start: "top top",
            end: () => `+=${distance}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });

      setTimeout(() => ScrollTrigger.refresh(), 1500);
    }, horizontalRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <section id="clothing" ref={horizontalRef} className="relative overflow-hidden bg-primary text-primary-foreground">
      <div 
        ref={trackRef} 
        className="flex flex-col md:flex-row min-h-[100dvh] items-center px-12 md:px-[15vw] gap-12 md:gap-[15vw] w-full md:w-max py-24 md:py-0"
      >
        {/* Intro Slide */}
        <div className="flex-shrink-0 w-full md:w-[60vw] lg:w-[40vw] max-w-[calc(100vw-3rem)]">
          <span className="text-primary-foreground/60 text-xs font-sans font-bold tracking-[0.2em] uppercase mb-8 block">
            Unique Woven Clothing
          </span>
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-display font-bold mb-12 leading-[0.9]">
            Woven With <br />
            <span className="italic font-normal serif text-primary-foreground">Character.</span>
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/70 mb-12 leading-relaxed max-w-md">
            Discover unique woven clothing created for people who appreciate individuality, texture, craftsmanship, and style.
          </p>
          <Button variant="outline" size="lg" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 group">
            Explore the Collection
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Media Slides */}
        <div className="flex-shrink-0 w-full md:w-[80vw] lg:w-[60vw] aspect-[4/3] md:h-[70vh]">
          <img
            src="/assets/woven-1.jpg"
            alt="Fabric texture"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-shrink-0 w-full md:w-[40vw] aspect-square md:h-[60vh] md:self-end md:mb-[10vh]">
          <img
            src="/assets/woven-2.jpg"
            alt="Woven detail"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-shrink-0 w-full md:w-[60vw] md:pr-[10vw]">
          <blockquote className="text-3xl md:text-4xl lg:text-5xl font-display italic leading-tight text-primary-foreground">
            "Clothing created for people who appreciate individuality and craftsmanship."
          </blockquote>
        </div>
      </div>
    </section>
  );
}

export function BeautyFeature() {
  return (
    <Section id="beauty" className="bg-secondary/10">
      <Container>
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-32">
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="lg:w-1/2"
          >
            <div className="relative aspect-[4/5] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
              <img
                src="/assets/beauty.jpg"
                alt="Beauty Consultancy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-[20px] border-background/20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="lg:w-1/2"
          >
            <span className="text-primary/60 text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block">
              Beauty Consultancy
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 leading-tight text-foreground">
              Your Beauty. <br />Your Expression.
            </h2>
            <p className="text-lg text-foreground/80 mb-10 leading-relaxed max-w-xl">
              Beauty is personal. Our consultancy approach focuses on helping you explore choices that complement your individual style, confidence, and presentation.
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground group">
              Explore Beauty Consultancy
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
