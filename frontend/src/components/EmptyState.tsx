import { LucideIcon, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "bg-muted/5 rounded-2xl border-2 border-dashed border-border/50",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/20 text-muted-foreground/40 mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[250px] mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline" className="h-9 shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
