import { motion } from "motion/react";

// ====== ANIMATION VARIANTS ======
const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  },
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeDown: {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeRight: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  },
  staggerContainer: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  },
  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  },
  cardItem: {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
  },
  bounceIn: {
    hidden: { opacity: 0, y: 60, scale: 0.9 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring", stiffness: 200, damping: 15, mass: 0.8 }
    }
  }
};

export function getVariant(name) {
  return variants[name] || variants.fadeUp;
}

// ====== SCROLL REVEAL - Single Element ======
export function ScrollReveal({ children, variant = "fadeUp", delay = 0, once = true, className = "", style = {} }) {
  const v = getVariant(variant);
  const customTransition = delay ? { ...v.visible.transition, delay } : v.visible.transition;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px" }}
      variants={{
        hidden: v.hidden,
        visible: { ...v.visible, transition: customTransition }
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ====== STAGGER CONTAINER - Parent wraps children with staggered timing ======
export function StaggerContainer({ children, delay = 0.1, stagger = 0.08, className = "", style = {} }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } }
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ====== STAGGER ITEM - Child element in a stagger container ======
export function StaggerItem({ children, variant = "staggerItem", className = "", style = {} }) {
  const v = getVariant(variant);
  return (
    <motion.div variants={v} className={className} style={style}>
      {children}
    </motion.div>
  );
}

// ====== PAGE TRANSITION Wrapper ======
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ====== ANIMATED COUNT (for stat numbers) ======
export function AnimatedCount({ value, suffix = "" }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 150, damping: 12 }}
    >
      {value}{suffix}
    </motion.span>
  );
}

// ====== STAGGER GRID - Animate a CSS Grid of items ======
export function StaggerGrid({ items, renderItem, variant = "cardItem", className = "", gridClass = "" }) {
  return (
    <StaggerContainer className={className}>
      <div className={gridClass}>
        {items.map((item, i) => (
          <StaggerItem key={i} variant={variant}>
            {renderItem(item, i)}
          </StaggerItem>
        ))}
      </div>
    </StaggerContainer>
  );
}

export default ScrollReveal;
