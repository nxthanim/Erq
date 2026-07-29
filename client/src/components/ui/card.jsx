import * as React from "react";
import { cn } from "../../lib/utils";

const Card = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-clay bg-[#e8e8e8] transition-all duration-300", className)}
    style={{
      boxShadow: '10px 10px 30px rgba(0,0,0,0.06), inset -5px -5px 15px rgba(0,0,0,0.02), inset 5px 5px 15px rgba(255,255,255,0.7)',
    }}
    {...props}
  >
    {children}
  </div>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pt-6 pb-0", className)} {...props}>
    {children}
  </div>
));
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-6", className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 flex items-center border-t border-[#d0d0d0]", className)}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = "CardFooter";

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-[#1a1a1a] leading-tight", className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[#666]", className)}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = "CardDescription";

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };
