import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12", className)}
      {...props}
    >
      {children}
    </div>
  );
}
