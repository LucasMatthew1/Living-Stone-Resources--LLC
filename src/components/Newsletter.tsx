import { useState } from "react";
import { motion } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { EnvelopeSimple, ArrowRight } from "@phosphor-icons/react";

export function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("Thank you for subscribing to our newsletter!");
      setEmail("");
    }
  };

  return (
    <Section className="bg-primary text-primary-foreground py-20 relative overflow-hidden">
      {/* Background Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `url('/assets/stone-texture.jpg')`, backgroundSize: 'cover' }}
      />
      
      <Container className="relative z-10">
        {/* Scrim for readability */}
        <div className="absolute inset-0 bg-primary/20 pointer-events-none -z-10" />
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Stay Built Up.
            </h2>
            <p className="text-lg text-primary-foreground/90 max-w-md leading-relaxed">
              Subscribe to our newsletter for insights on business strategy, financial organization, and creative style.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <Label htmlFor="newsletter-email" className="sr-only">Email Address</Label>
                <EnvelopeSimple 
                  size={20} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-foreground/40" 
                />
                <Input
                  id="newsletter-email"
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-12 h-14 bg-white/5 border-white/40 text-white placeholder:text-white/40 rounded-none focus:border-secondary transition-colors"
                />
              </div>
              <Button type="submit" className="h-14 px-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground uppercase tracking-widest text-xs font-bold transition-all group">
                Subscribe
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/80 mt-4">
              By subscribing, you agree to our privacy policy.
            </p>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
