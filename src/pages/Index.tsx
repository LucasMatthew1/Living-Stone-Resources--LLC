import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Introduction } from "@/components/Introduction";
import { Services } from "@/components/Services";
import { BrandStatement } from "@/components/BrandStatement";
import { ConsultancyFeature, BookkeepingFeature } from "@/components/FeatureSections";
import { ClothingFeature, BeautyFeature } from "@/components/EditorialSections";
import { WhyUs, Process } from "@/components/ProcessSections";
import { ContactCTA, ContactSection, Footer } from "@/components/ContactSections";

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
      <Header />
      <main>
        <Hero />
        <Introduction />
        <Services />
        <BrandStatement />
        <ConsultancyFeature />
        <BookkeepingFeature />
        <ClothingFeature />
        <BeautyFeature />
        <WhyUs />
        <Process />
        <ContactCTA />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
