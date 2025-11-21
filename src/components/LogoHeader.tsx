import { Briefcase } from "lucide-react";

export const LogoHeader = () => {
  return (
    <div className="bg-primary py-4 px-6 flex items-center justify-center gap-2 shadow-md">
      <div className="bg-secondary rounded p-1.5">
        <Briefcase className="w-5 h-5 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-primary-foreground">JobSwipe</h1>
    </div>
  );
};
