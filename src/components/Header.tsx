import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { Container } from "./layout/Container";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "About", href: "/about" },
  { name: "Services", href: "/#services" },
  { name: "Testimonials", href: "/#testimonials" },
  { name: "Clothing", href: "/#clothing" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-4",
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-border py-3" : "bg-transparent"
      )}
    >
      <Container className="flex items-center justify-between">
        <a href="/" className="flex items-center group">
          <img 
            src="/assets/image-removebg-preview-c8898cc857e1.png" 
            alt="Living Stone Resources" 
            className="h-10 md:h-14 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs font-sans font-bold hover:text-primary transition-colors uppercase tracking-[0.2em]"
            >
              {link.name}
            </a>
          ))}
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-widest text-xs px-6 h-10 font-bold">
            Consult Now
          </Button>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </Container>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-background border-b border-border p-6 lg:hidden"
          >
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-lg font-display font-medium py-2 border-b border-border/50"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <Button className="w-full mt-4 bg-primary text-primary-foreground uppercase tracking-widest font-bold">
                Consult Now
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
