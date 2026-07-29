import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

const TabsContext = React.createContext(null);

let tabIdCounter = 0;

const Tabs = React.forwardRef(({ defaultValue, value, onValueChange, className, children, layoutId, ...props }, ref) => {
  const [tabValue, setTabValue] = React.useState(defaultValue || value || "");
  const activeValue = value !== undefined ? value : tabValue;
  const layoutIdRef = React.useRef(layoutId || `tab-${++tabIdCounter}`);

  const handleChange = React.useCallback((val) => {
    if (onValueChange) onValueChange(val);
    if (value === undefined) setTabValue(val);
  }, [onValueChange, value]);

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleChange, layoutId: layoutIdRef.current }}>
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center p-0.5 rounded-clay-sm",
      className
    )}
    style={{
      backgroundColor: '#d0d0d0',
      boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.06), inset -1px -1px 3px rgba(255,255,255,0.6)',
    }}
    {...props}
  >
    {children}
  </div>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ value, className, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx?.value === value;

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx?.onValueChange?.(value)}
      className={cn(
        "relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1a1a]",
        className
      )}
      style={{ color: isActive ? '#1a1a1a' : '#666' }}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={ctx?.layoutId}
          className="absolute inset-0 rounded-lg bg-white z-0"
          style={{ boxShadow: '3px 3px 8px rgba(0,0,0,0.06), inset -1px -1px 3px rgba(255,255,255,0.6)' }}
          transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ value, className, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;

  return (
    <motion.div
      ref={ref}
      role="tabpanel"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("focus-visible:outline-none", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
