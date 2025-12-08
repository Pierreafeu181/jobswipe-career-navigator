import { supabase } from "@/lib/supabaseClient";
import { Job } from "@/types/job";

export const fetchJobs = async (limit = 50): Promise<Job[]> => {
  const { data, error } = await (supabase as any)
    .from("jobs")
    .select("*")
    .limit(limit)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }

  return data as Job[];
};

export const fetchJobById = async (id: string): Promise<Job | null> => {
  const { data, error } = await (supabase as any)
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching job:", error);
    throw error;
  }

  return data as Job | null;
};
