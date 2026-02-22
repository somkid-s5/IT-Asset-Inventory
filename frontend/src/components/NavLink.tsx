'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, end, href, children, ...props }, ref) => {
    const pathname = usePathname();
    // Default to false if pathname is null (e.g., during static render if not handled)
    const currentPath = pathname || "";

    // Determine if the link is active based on `end` prop
    // If exact match is required (`end`), compare exactly.
    // Otherwise, check if the current pathname starts with the href.
    const isActive = end
      ? currentPath === href
      : currentPath.startsWith(href as string);

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
