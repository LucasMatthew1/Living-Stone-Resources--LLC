import { useState } from "react";
import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";

export function ContactCTA() {
  return (
    <Section className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `url('/assets/stone-texture.jpg')`, backgroundSize: 'cover' }}
      />
      {/* Readability Layer */}
      <div className="absolute inset-0 bg-primary/40 pointer-events-none" />
      
      <Container className="relative z-10 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-7xl font-display font-bold mb-8 leading-tight">
            Ready to Get Built Up?
          </h2>
          <p className="text-xl md:text-2xl font-display italic text-primary-foreground/70 mb-12 leading-relaxed">
            Whether you're building a business, organizing your books, expressing your style, or exploring beauty solutions, Living Stone Resources is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground h-14 px-10 text-sm uppercase tracking-widest">
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/5 h-14 px-10 text-sm uppercase tracking-widest">
              Contact Us
            </Button>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Inquiry submitted successfully!");
  };

  return (
    <Section id="contact" className="bg-background">
      <Container>
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-start">
          <div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">
              Let's Build Something Together.
            </h2>
            <p className="text-lg text-foreground mb-12 leading-relaxed max-w-md">
              We look forward to connecting with you and learning more about how we can help you build with confidence.
            </p>
            
            <div className="space-y-6 text-foreground">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Office</p>
                <p className="font-display text-xl">Living Stone Resources, LLC</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Email</p>
                <a href="mailto:hello@livingstoneresources.com" className="font-display text-xl hover:text-accent transition-colors">hello@livingstoneresources.com</a>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Social</p>
                <div className="flex gap-4">
                  {["Instagram", "LinkedIn", "Facebook"].map(platform => (
                    <a key={platform} href="#" className="font-sans text-sm font-medium hover:text-accent transition-colors">{platform}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-8 md:p-12 border border-border">
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <CheckCircle size={64} className="mx-auto text-accent mb-6" weight="thin" />
                <h3 className="text-3xl font-display font-bold mb-4">Success!</h3>
                <p className="text-foreground/90 mb-8">
                  Your inquiry has been received. We will get back to you shortly.
                </p>
                <Button onClick={() => setSubmitted(false)} variant="outline" className="uppercase tracking-widest text-xs">
                  Send Another Message
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold">Full Name</Label>
                  <Input id="name" required className="bg-background rounded-none border-border/50 focus:border-accent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold">Email</Label>
                    <Input id="email" type="email" required className="bg-background rounded-none border-border/50 focus:border-accent" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs uppercase tracking-widest font-bold">Phone</Label>
                    <Input id="phone" className="bg-background rounded-none border-border/50 focus:border-accent" />
                  </div>
                </div>
                  <Label htmlFor="service" className="text-xs uppercase tracking-widest font-bold">Service Interested In</Label>
                  <select id="service" className="w-full h-12 px-4 bg-background border border-border/50 focus:border-accent outline-none text-sm rounded-none">
                    <option>Business Consultancy</option>
                    <option>Bookkeeping</option>
                    <option>Unique Woven Clothing</option>
                    <option>Beauty Consultancy</option>
                  </select>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs uppercase tracking-widest font-bold">Message</Label>
                  <Textarea id="message" required className="bg-background rounded-none border-border/50 focus:border-accent min-h-[150px]" />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground h-14 uppercase tracking-widest text-xs group">
                  Submit Inquiry
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="bg-background border-t border-border py-12">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-2xl font-display font-bold tracking-tight uppercase">
              Living Stone
            </span>
            <span className="text-[12px] font-sans tracking-[0.2em] uppercase text-accent leading-none -mt-1">
              Resources, LLC
            </span>
          </div>
          
          <div className="flex gap-8 text-sm font-sans font-bold uppercase tracking-widest text-foreground/90">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
          </div>

          <p className="text-xs font-sans tracking-widest uppercase text-foreground/40">
            © {new Date().getFullYear()} Living Stone Resources, LLC. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
