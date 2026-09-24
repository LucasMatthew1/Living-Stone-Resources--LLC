import { motion, useReducedMotion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Quotes } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/pagination";

const testimonials = [
  {
    quote: "Living Stone Resources transformed the way I look at my business finances. Their bookkeeping is meticulous and provides the clarity I needed to grow.",
    author: "Sarah J.",
    role: "E-commerce Founder",
  },
  {
    quote: "The woven pieces are unlike anything else. You can feel the craftsmanship and character in every thread. Truly a unique brand.",
    author: "Michael R.",
    role: "Art Collector",
  },
  {
    quote: "Professional, creative, and insightful. Their beauty consultancy helped me find a style that actually reflects my personality.",
    author: "Elena G.",
    role: "Executive Director",
  },
  {
    quote: "A rare find. They manage to balance professional consultancy with a deep understanding of creative aesthetics. Highly recommended.",
    author: "David L.",
    role: "Architect",
  },
];

const logos = [
  "CLIENT", "ESTATE", "TEXTURE", "STONE", "BUILD", "CRAFT", "VISION", "GROWTH"
];

export function Testimonials() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Section id="testimonials" className="bg-muted/30 overflow-hidden">
      <Container>
        <div className="mb-20 text-center">
          <span className="text-accent text-xs font-sans font-bold tracking-[0.2em] uppercase mb-4 block">
            Success Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Built With Trust.
          </h2>
        </div>

        <div className="max-w-4xl mx-auto mb-32">
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={50}
            slidesPerView={1}
            autoplay={{ delay: 5000 }}
            pagination={{ clickable: true }}
            className="testimonial-swiper"
          >
            {testimonials.map((t, i) => (
              <SwiperSlide key={i}>
                <div className="text-center px-6 pb-12">
                  <Quotes size={48} weight="thin" className="mx-auto text-accent/30 mb-8" />
                  <p className="text-2xl md:text-3xl font-display italic leading-relaxed mb-10 text-foreground">
                    "{t.quote}"
                  </p>
                  <div className="space-y-1">
                    <p className="font-sans font-bold uppercase tracking-widest text-sm">
                      {t.author}
                    </p>
                    <p className="font-sans text-xs text-foreground/70 uppercase tracking-widest">
                      {t.role}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Logo Ticker */}
        <div className="relative py-12">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-muted/30 to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-muted/30 to-transparent z-10" />
          
          <div className="flex overflow-hidden">
            <div 
              className={cn(
                "flex whitespace-nowrap gap-20 items-center px-10",
                !shouldReduceMotion && "animate-marquee"
              )}
            >
              {[...logos, ...logos, ...logos].map((logo, i) => (
                <span 
                  key={i} 
                  className="text-3xl md:text-5xl font-display font-bold text-foreground/60 uppercase tracking-[0.2em] select-none hover:text-accent transition-colors"
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .testimonial-swiper .swiper-pagination-bullet {
          background: var(--brand-accent);
          opacity: 0.2;
        }
        .testimonial-swiper .swiper-pagination-bullet-active {
          opacity: 1;
          width: 24px;
          border-radius: 4px;
          transition: all 0.3s;
        }
      `}</style>
    </Section>
  );
}
