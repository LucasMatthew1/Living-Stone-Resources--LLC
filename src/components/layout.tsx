import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Centered max-width content column with responsive gutters. Use inside a
 * <Section> (or any full-bleed wrapper) to keep content readable on wide
 * screens. Override `max-w-*` via className for narrower/wider columns.
 */
const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mx-auto w-full max-w-7xl px-6 md:px-8", className)}
    {...props}
  />
));
Container.displayName = "Container";

/**
 * A full-width page section with a consistent vertical rhythm (the 8pt ladder:
 * py-16 / md:py-24 / lg:py-32). Compose with <Container> for the inner column.
 * Pass `className` to set the section background; the padding stays consistent
 * across the page so sections feel evenly spaced.
 */
const Section = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => (
  <section
    ref={ref}
    className={cn("w-full py-16 md:py-24 lg:py-32", className)}
    {...props}
  >
    {children}
  </section>
));
Section.displayName = "Section";

export { Container, Section };
