"use client";

import * as T from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof T.List>) {
  return <T.List className={cn("inline-flex items-center gap-0.5 rounded-md border border-line bg-sunken p-0.5", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-small font-medium text-ink-3 transition-colors hover:text-ink data-[state=active]:bg-raised data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_2px_oklch(0%_0_0/0.25)] [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
