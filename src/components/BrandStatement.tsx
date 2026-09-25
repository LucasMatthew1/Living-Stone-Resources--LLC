import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "./layout/Section";
import { Container } from "./layout/Container";
import { useReducedMotion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

export function BrandStatement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (reduceMotion) {
      if (textRef.current) {
        gsap.set(textRef.current, { opacity: 1, scale: 1, y: 0 });
      }
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        textRef.current,
        {
          opacity: 0.2,
          scale: 0.95,
          y: 30,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 95%",
            end: "bottom 10%",
            scrub: 1,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <Section ref={containerRef} id="brand-statement" className="relative overflow-hidden bg-primary text-primary-foreground py-32 md:py-48 lg:py-64">
      {/* Background Texture */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: `url('/assets/stone-texture.jpg')`, backgroundSize: 'cover' }}
      />
      {/* Scrim */}
      <div className="absolute inset-0 bg-primary/40 pointer-events-none" />
      
      <Container className="text-center relative z-10">
        <div style={reduceMotion ? { opacity: 1, transform: 'none' } : {}}>
          <h2 
            ref={textRef}
            className="text-4xl md:text-[10rem] lg:text-[15rem] font-display font-bold leading-none tracking-tighter uppercase select-none text-primary-foreground"
          >
            Built Up<span className="text-secondary/30">!</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 md:mt-24 max-w-5xl mx-auto items-end">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-secondary/40 font-display italic text-2xl mb-2">Built with</span>
              <span className="font-sans font-bold uppercase tracking-widest text-sm text-primary-foreground">Purpose</span>
            </div>
            <div className="flex flex-col items-center md:pt-12">
              <span className="text-secondary/40 font-display italic text-2xl mb-2">Built with</span>
              <span className="font-sans font-bold uppercase tracking-widest text-sm text-primary-foreground">Creativity</span>
            </div>
            <div className="flex flex-col items-center md:items-end text-center md:text-right">
              <span className="text-secondary/40 font-display italic text-2xl mb-2">Built with</span>
              <span className="font-sans font-bold uppercase tracking-widest text-sm text-primary-foreground">Confidence</span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

// Internal wrapper to avoid framer-motion/gsap conflict if needed, 
// but here I'm using GSAP directly on the DOM ref.
function motion_div_wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
