import * as React from "react";
import { cn } from "../../lib/utils";

const variants = {
  default: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    boxShadow: '6px 6px 18px rgba(0,0,0,0.25), inset -4px -4px 12px rgba(0,0,0,0.20), inset 4px 4px 12px rgba(255,255,255,0.10)',
  },
  secondary: {
    backgroundColor: '#e8e8e8',
    color: '#404040',
    boxShadow: '6px 6px 18px rgba(0,0,0,0.08), inset -4px -4px 12px rgba(0,0,0,0.03), inset 4px 4px 12px rgba(255,255,255,0.7)',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '#404040',
    border: '2px solid #b8b8b8',
    boxShadow: 'none',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#666',
    boxShadow: 'none',
  },
  danger: {
    backgroundColor: '#555',
    color: '#fff',
    boxShadow: '6px 6px 18px rgba(0,0,0,0.25), inset -4px -4px 12px rgba(0,0,0,0.20), inset 4px 4px 12px rgba(255,255,255,0.10)',
  },
  clay: {
    backgroundColor: '#e8e8e8',
    color: '#1a1a1a',
    boxShadow: '8px 8px 24px rgba(0,0,0,0.06), inset -4px -4px 12px rgba(0,0,0,0.02), inset 4px 4px 12px rgba(255,255,255,0.6)',
  },
};

const sizes = {
  sm: { padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '0.875rem' },
  md: { padding: '0.75rem 1.5rem', fontSize: '0.875rem', borderRadius: '1.25rem' },
  lg: { padding: '1rem 2rem', fontSize: '1rem', borderRadius: '1.5rem' },
  icon: { padding: '0.75rem', borderRadius: '1rem' },
};

const Button = React.forwardRef(({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}, ref) => {
  const variantStyle = variants[variant] || variants.default;
  const sizeStyle = sizes[size] || sizes.md;

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-200",
        "hover:brightness-105 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a] focus-visible:ring-offset-2",
        className
      )}
      style={{
        ...variantStyle,
        ...sizeStyle,
      }}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button, variants as buttonVariants };
