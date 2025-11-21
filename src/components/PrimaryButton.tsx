import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean;
}

export const PrimaryButton = ({ children, onClick, type = "button", className, disabled }: PrimaryButtonProps) => {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full bg-foreground text-background hover:bg-foreground/90 font-semibold py-6 text-lg rounded-lg shadow-md",
        className
      )}
    >
      {children}
    </Button>
  );
};
