import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { JobCard } from "@/components/JobCard";
import { fetchJobs } from "@/lib/supabase";
import { Job } from "@/types/job";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const Offres = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [niveauFilter, setNiveauFilter] = useState("all");
  const [familleFilter, setFamilleFilter] = useState("all");
  const [secteurFilter, setSecteurFilter] = useState("all");

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, niveauFilter, familleFilter, secteurFilter]);

  const loadJobs = async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
      setFilteredJobs(data);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    if (niveauFilter !== "all") {
      filtered = filtered.filter(job => job.niveau.toLowerCase() === niveauFilter);
    }

    if (familleFilter !== "all") {
      filtered = filtered.filter(job => job.famille.toLowerCase() === familleFilter);
    }

    if (secteurFilter !== "all") {
      filtered = filtered.filter(job => job.secteur.toLowerCase() === secteurFilter);
    }

    setFilteredJobs(filtered);
  };

  const getUniqueValues = (field: keyof Job) => {
    return Array.from(new Set(jobs.map(job => job[field] as string)))
      .filter(Boolean)
      .sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LogoHeader />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Les offres</h2>

        <div className="space-y-4 mb-6">
          <Select value={niveauFilter} onValueChange={setNiveauFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {getUniqueValues("niveau").map(niveau => (
                <SelectItem key={niveau} value={niveau.toLowerCase()}>
                  {niveau}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={familleFilter} onValueChange={setFamilleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Famille" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les familles</SelectItem>
              {getUniqueValues("famille").map(famille => (
                <SelectItem key={famille} value={famille.toLowerCase()}>
                  {famille}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={secteurFilter} onValueChange={setSecteurFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Secteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les secteurs</SelectItem>
              {getUniqueValues("secteur").map(secteur => (
                <SelectItem key={secteur} value={secteur.toLowerCase()}>
                  {secteur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          {filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} trouvée{filteredJobs.length > 1 ? "s" : ""}
        </div>

        <div className="space-y-4">
          {filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => navigate(`/offres/${job.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offres;
