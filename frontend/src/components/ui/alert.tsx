"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Terminal,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-[20px] border-2 px-5 py-4 shadow-lg backdrop-blur-xl transition-all duration-300 overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-card/80 border-border/60 text-foreground shadow-black/5",
        destructive: 
          "bg-destructive/10 border-destructive/30 text-destructive shadow-destructive/10 dark:shadow-destructive/20",
        success: 
          "bg-success/10 border-success/30 text-success shadow-success/10 dark:shadow-success/20",
        warning: 
          "bg-warning/10 border-warning/30 text-warning shadow-warning/10 dark:shadow-warning/20",
        info: 
          "bg-info/10 border-info/30 text-info shadow-info/10 dark:shadow-info/20",
        cyber: 
          "bg-primary/5 border-primary/40 text-primary shadow-primary/10 dark:shadow-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const AnimatedIcon = ({ variant, icon: CustomIcon }: { variant: string; icon?: React.ReactNode }) => {
  const icons: Record<string, any> = {
    default: Terminal,
    destructive: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
    cyber: Terminal,
  };
  
  const IconComponent = icons[variant] || icons.default;

  const animations: any = {
    destructive: {
      rotate: [0, -10, 10, -10, 10, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
    },
    success: {
      y: [0, -4, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }
    },
    warning: {
      scale: [1, 1.15, 1],
      opacity: [0.8, 1, 0.8],
      transition: { duration: 1, repeat: Infinity }
    },
    info: {
      y: [0, -2, 0, 2, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    cyber: {
      skew: [0, 5, -5, 5, 0],
      opacity: [1, 0.7, 1],
      transition: { duration: 0.2, repeat: Infinity, repeatDelay: 3 }
    },
    default: {
      rotate: [0, 360],
      transition: { duration: 8, repeat: Infinity, ease: "linear" }
    }
  };

  return (
    <motion.div
      animate={animations[variant] || animations.default}
      className="flex items-center justify-center"
    >
      {CustomIcon || <IconComponent className="h-5 w-5" strokeWidth={2.5} />}
    </motion.div>
  );
};

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & 
  VariantProps<typeof alertVariants> & {
    onClose?: () => void;
    show?: boolean;
    icon?: React.ReactNode;
  }
>(({ className, variant, children, onClose, show = true, icon, ...props }, ref) => {
  // Omit conflicting props before spreading to motion.div
  const { onDrag, onDragStart, onDragEnd, onAnimationStart, ...safeProps } = props as any;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={ref}
          role="alert"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          className={cn(alertVariants({ variant }), className)}
          {...safeProps}
        >
          {/* Cyber Accent Line */}
          <div 
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 opacity-80",
              {
                "bg-border/40": variant === "default",
                "bg-destructive": variant === "destructive",
                "bg-success": variant === "success",
                "bg-warning": variant === "warning",
                "bg-info": variant === "info",
                "bg-primary": variant === "cyber",
              }
            )} 
          />
          
          <div className="flex gap-4 items-start relative z-10">
            <div className={cn(
              "mt-0.5 rounded-xl p-2.5 bg-background/50 border border-current/20 shadow-inner",
              variant === "destructive" && "text-destructive",
              variant === "success" && "text-success",
              variant === "warning" && "text-warning",
              variant === "info" && "text-info",
              variant === "cyber" && "text-primary",
            )}>
              <AnimatedIcon variant={variant || "default"} icon={icon} />
            </div>
            
            <div className="flex-1 pt-1">
              {children}
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-foreground/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Glowing Background Effect */}
          <div className={cn(
            "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-[40px] opacity-20 transition-opacity group-hover:opacity-40",
            {
              "bg-border/20": variant === "default",
              "bg-destructive/40": variant === "destructive",
              "bg-success/40": variant === "success",
              "bg-warning/40": variant === "warning",
              "bg-info/40": variant === "info",
              "bg-primary/40": variant === "cyber",
            }
          )} />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-display text-[15px] font-bold leading-none tracking-tight uppercase", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[13px] leading-relaxed opacity-90 font-medium", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
