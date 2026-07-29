import * as React from "react";
import { cn } from "../../lib/utils";

// ====== BADGE ======
const badgeVariants = {
  default: { backgroundColor: '#f5efe6', color: '#5f5140' },
  success: { backgroundColor: '#e8e8e8', color: '#444444' },
  warning: { backgroundColor: '#fef3c7', color: '#b45309' },
  error: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  info: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  premium: { backgroundColor: '#f3e8ff', color: '#7c3aed' },
};

const Badge = React.forwardRef(({ className, variant = "default", children, ...props }, ref) => {
  const v = badgeVariants[variant] || badgeVariants.default;
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium",
        "shadow-[2px_2px_6px_rgba(0,0,0,0.06),inset_-1px_-1px_3px_rgba(0,0,0,0.02),inset_1px_1px_3px_rgba(255,255,255,0.5)]",
        className
      )}
      style={{ backgroundColor: v.backgroundColor, color: v.color }}
      {...props}
    >
      {children}
    </span>
  );
});
Badge.displayName = "Badge";

// ====== PROGRESS ======
const Progress = React.forwardRef(({ className, value = 0, max = 100, color, ...props }, ref) => {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("w-full rounded-full h-2.5 overflow-hidden", className)}
      style={{ backgroundColor: '#ebe0d0' }}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: color || 'linear-gradient(90deg, #555555, #1a1a1a)',
          boxShadow: color ? `0 0 8px ${color}44` : '0 0 8px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
});
Progress.displayName = "Progress";

// ====== DIALOG / MODAL ======
const DialogContext = React.createContext(null);

function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = React.useCallback((val) => {
    if (onOpenChange) onOpenChange(val);
    if (controlledOpen === undefined) setInternalOpen(val);
  }, [onOpenChange, controlledOpen]);

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen: setIsOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ children, asChild, className, ...props }) {
  const ctx = React.useContext(DialogContext);
  const child = asChild && React.isValidElement(children)
    ? React.cloneElement(children, { onClick: (e) => { children.props.onClick?.(e); ctx?.setOpen(true); } })
    : (
      <button
        onClick={() => ctx?.setOpen(true)}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </button>
    );
  return child;
}

function DialogContent({ children, className, ...props }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx?.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(90, 69, 53, 0.35)', backdropFilter: 'blur(4px)' }}
        onClick={() => ctx.setOpen(false)}
      />
      {/* Content */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg mx-4 rounded-clay bg-[#faf7f2] p-6",
          "shadow-[12px_12px_36px_rgba(0,0,0,0.10),inset_-5px_-5px_15px_rgba(0,0,0,0.02),inset_5px_5px_15px_rgba(255,255,255,0.6)]",
          "animate-scale-in",
          className
        )}
        {...props}
      >
        {/* Close button */}
        <button
          onClick={() => ctx.setOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[#75644f] hover:bg-[#ebe0d0] transition-colors"
          style={{
            boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.04), inset -1px -1px 2px rgba(255,255,255,0.5)',
          }}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn("mb-4 pr-8", className)} {...props}>
      {children}
    </div>
  );
}

function DialogTitle({ className, children, ...props }) {
  return (
    <h2 className={cn("text-lg font-bold text-[#433930]", className)} {...props}>
      {children}
    </h2>
  );
}

function DialogDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-[#75644f] mt-1", className)} {...props}>
      {children}
    </p>
  );
}

export {
  Badge,
  badgeVariants,
  Progress,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
