import { cn } from "@/lib/utils";

interface LabelTinyProps {
  children: React.ReactNode;
  className?: string;
}

export function LabelTiny({ children, className }: LabelTinyProps) {
  return <span className={cn("label-tiny", className)}>{children}</span>;
}
