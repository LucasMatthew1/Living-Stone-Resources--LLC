import { useEffect } from "react";
import Lenis from "lenis";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Introduction } from "@/components/Introduction";
import { BrandStory } from "@/components/BrandStory";
import { Services } from "@/components/Services";
import { Testimonials } from "@/components/Testimonials";
import { BrandStatement } from "@/components/BrandStatement";
import { ConsultancyFeature, BookkeepingFeature } from "@/components/FeatureSections";
import { ClothingFeature, BeautyFeature } from "@/components/EditorialSections";
import { WhyUs, Process } from "@/components/ProcessSections";
import { ContactCTA, ContactSection, Footer } from "@/components/ContactSections";
import { Newsletter } from "@/components/Newsletter";

export default function Index() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground scroll-smooth">
      <Header />
      <main>
        <Hero />
        <Introduction />
        <BrandStory />
        <Services />
        <Testimonials />
        <BrandStatement />
        <ConsultancyFeature />
        <BookkeepingFeature />
        <ClothingFeature />
        <BeautyFeature />
        <WhyUs />
        <Process />
        <ContactCTA />
        <ContactSection />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
