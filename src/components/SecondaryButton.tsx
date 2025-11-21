import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  variant?: "default" | "favorite";
}

export const SecondaryButton = ({ children, onClick, type = "button", className, variant = "default" }: SecondaryButtonProps) => {
  return (
    <Button
      type={type}
      onClick={onClick}
      className={cn(
        "font-medium rounded-full px-6 py-2",
        variant === "favorite" 
          ? "bg-favorite text-favorite-foreground hover:bg-favorite/90" 
          : "bg-muted text-muted-foreground hover:bg-muted/80",
        className
      )}
    >
      {children}
    </Button>
  );
};
