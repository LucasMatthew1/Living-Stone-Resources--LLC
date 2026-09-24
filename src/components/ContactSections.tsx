import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "./layout/Container";
import { Section } from "./layout/Section";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, CheckCircle, Calendar, Clock, User, Envelope, Phone, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
              Book a Consultation
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 h-14 px-10 text-sm uppercase tracking-widest">
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
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "Business Consultancy",
    date: "",
    time: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setSubmitted(true);
    toast.success("Consultation request submitted successfully!");
  };

  return (
    <Section id="contact" className="bg-background">
      <Container>
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 items-start">
          <div>
            <span className="text-accent text-xs font-sans font-bold tracking-[0.2em] uppercase mb-6 block">
              Consultation
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">
              Let's Build Something Together.
            </h2>
            <p className="text-lg text-foreground mb-12 leading-relaxed max-w-md">
              Schedule a personalized session to explore how our resources can support your growth.
            </p>
            
            <div className="space-y-6 text-foreground">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-muted flex items-center justify-center flex-shrink-0">
                  <User weight="thin" className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Expert Guidance</p>
                  <p className="font-sans text-sm">One-on-one sessions tailored to your needs.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar weight="thin" className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Flexible Scheduling</p>
                  <p className="font-sans text-sm">Choose a time that works for your schedule.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-muted flex items-center justify-center flex-shrink-0">
                  <CheckCircle weight="thin" className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Clarity & Direction</p>
                  <p className="font-sans text-sm">Leave with a clear path forward.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-border overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest">
                Booking Step {step} of 2
              </span>
              <div className="flex gap-1">
                <div className={cn("w-8 h-1 transition-colors", step >= 1 ? "bg-accent" : "bg-white/20")} />
                <div className={cn("w-8 h-1 transition-colors", step >= 2 ? "bg-accent" : "bg-white/20")} />
              </div>
            </div>

            <div className="p-8 md:p-12">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <CheckCircle size={64} className="mx-auto text-accent mb-6" weight="thin" />
                  <h3 className="text-3xl font-display font-bold mb-4">Request Received</h3>
                  <p className="text-foreground mb-8">
                    Thank you, {formData.name.split(' ')[0]}. We'll review your request and confirm your session shortly.
                  </p>
                  <Button onClick={() => {setSubmitted(false); setStep(1);}} variant="outline" className="uppercase tracking-widest text-xs">
                    New Request
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold">Full Name</Label>
                          <div className="relative">
                            <Input 
                              id="name" 
                              required 
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="bg-background rounded-none border-border/50 focus:border-accent pl-10 h-12" 
                              placeholder="John Doe"
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs uppercase tracking-widest font-bold">Email</Label>
                            <div className="relative">
                              <Input 
                                id="email" 
                                type="email" 
                                required 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="bg-background rounded-none border-border/50 focus:border-accent pl-10 h-12" 
                                placeholder="john@example.com"
                              />
                              <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs uppercase tracking-widest font-bold">Phone</Label>
                            <div className="relative">
                              <Input 
                                id="phone" 
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="bg-background rounded-none border-border/50 focus:border-accent pl-10 h-12" 
                                placeholder="(555) 000-0000"
                              />
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="service" className="text-xs uppercase tracking-widest font-bold">Service of Interest</Label>
                          <div className="relative">
                            <select 
                              id="service" 
                              value={formData.service}
                              onChange={(e) => setFormData({...formData, service: e.target.value})}
                              className="w-full h-12 px-4 bg-background border border-border/50 focus:border-accent outline-none text-sm rounded-none appearance-none"
                            >
                              <option>Business Consultancy</option>
                              <option>Bookkeeping</option>
                              <option>Unique Woven Clothing</option>
                              <option>Beauty Consultancy</option>
                            </select>
                            <CaretDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="date" className="text-xs uppercase tracking-widest font-bold">Preferred Date</Label>
                            <Input 
                              id="date" 
                              type="date" 
                              required 
                              value={formData.date}
                              onChange={(e) => setFormData({...formData, date: e.target.value})}
                              className="bg-background rounded-none border-border/50 focus:border-accent h-12" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="time" className="text-xs uppercase tracking-widest font-bold">Preferred Time</Label>
                            <Input 
                              id="time" 
                              type="time" 
                              required 
                              value={formData.time}
                              onChange={(e) => setFormData({...formData, time: e.target.value})}
                              className="bg-background rounded-none border-border/50 focus:border-accent h-12" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-xs uppercase tracking-widest font-bold">Additional Details</Label>
                          <Textarea 
                            id="message" 
                            required 
                            value={formData.message}
                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                            className="bg-background rounded-none border-border/50 focus:border-accent min-h-[120px]" 
                            placeholder="Tell us a bit about what you're looking to build..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4 pt-4">
                    {step > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep(step - 1)}
                        className="flex-1 uppercase tracking-widest text-xs h-14"
                      >
                        Back
                      </Button>
                    )}
                    <Button type="submit" className="flex-[2] bg-primary text-primary-foreground h-14 uppercase tracking-widest text-xs group">
                      {step === 1 ? "Next Step" : "Request Consultation"}
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="bg-background border-t border-border py-16">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-center gap-12">
          <a href="/" className="flex items-center gap-4 group">
            <img 
              src="/assets/pasted-image-2026-09-24T19-34-32-107Z-7fb14171ea5e.png" 
              alt="Living Stone Resources Logo" 
              className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col items-start">
              <span className="text-xl font-display font-bold tracking-tight uppercase leading-none">
                Living Stone
              </span>
              <span className="text-[12px] font-sans tracking-[0.2em] uppercase text-accent leading-none mt-1">
                Resources, LLC
              </span>
            </div>
          </a>
          
          <div className="flex gap-8 text-sm font-sans font-bold uppercase tracking-widest text-foreground">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
          </div>

          <p className="text-sm font-sans tracking-widest uppercase text-foreground/80">
            © {new Date().getFullYear()} Living Stone Resources, LLC. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
