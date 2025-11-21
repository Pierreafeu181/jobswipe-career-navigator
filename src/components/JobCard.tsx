import { Job } from "@/types/job";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2 } from "lucide-react";

interface JobCardProps {
  job: Job;
  onClick: () => void;
}

export const JobCard = ({ job, onClick }: JobCardProps) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="space-y-3">
          <div>
            <h3 className="font-bold text-lg text-foreground line-clamp-2">{job.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{job.company}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{job.location}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {job.niveau}
            </Badge>
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
              {job.famille}
            </Badge>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
              {job.secteur}
            </Badge>
          </div>

          {(job.salary_min || job.salary_max) && (
            <p className="text-sm text-muted-foreground">
              {job.salary_min && job.salary_max
                ? `${job.salary_min}€ - ${job.salary_max}€`
                : job.salary_min
                ? `À partir de ${job.salary_min}€`
                : `Jusqu'à ${job.salary_max}€`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
