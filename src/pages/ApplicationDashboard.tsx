import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Bell, Home, User, Briefcase, Loader2, ChevronDown, ChevronUp, BrainCircuit, CalendarClock, Lightbulb, CheckCircle2, AlertCircle, MessageSquare, FileText, XCircle, RefreshCw, Clock, Calendar as CalendarIcon, ArrowRight, Mail, Trash2, Phone, Video, MapPin, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/lib/supabaseClient";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ApplicationStatus = "liked" | "superliked" | "applied" | "interview" | "job_offer" | "accepted" | "rejected";

interface Application {
  id: string;
  company: string;
  title: string;
  status: ApplicationStatus;
  isSuperlike: boolean;
  interviewDate?: Date;
  interviewType?: string;
  rejectionReason?: string;
  rejectionStage?: 'before_interview' | 'after_interview';
  offerDeadline?: Date;
  dates: {
    liked: Date;
    superliked?: Date;
    applied?: Date;
    response_received?: Date;
    interview?: Date;
    job_offer?: Date;
    accepted?: Date;
    rejected?: Date;
  };
}

const initialApplications: Application[] = [];

const statusLabels: Record<ApplicationStatus, string> = {
  liked: "Likée",
  superliked: "Superlikée",
  applied: "Postulée",
  interview: "Entretien",
  job_offer: "Proposition reçue",
  accepted: "Acceptée",
  rejected: "Refusée",
};

const statusColors: Record<ApplicationStatus, string> = {
  liked: "bg-gray-100 border-gray-200",
  superliked: "bg-amber-100 border-amber-200",
  applied: "bg-blue-100 border-blue-200",
  interview: "bg-purple-100 border-purple-200",
  job_offer: "bg-teal-100 border-teal-200",
  accepted: "bg-green-100 border-green-200",
  rejected: "bg-red-100 border-red-200",
}

const columns: ApplicationStatus[] = ["liked", "superliked", "applied", "interview", "job_offer", "accepted", "rejected"];
const offerColumns: ApplicationStatus[] = ["liked", "superliked", "applied"];
const applicationColumns: ApplicationStatus[] = ["applied", "interview", "job_offer", "accepted", "rejected"];

const KpiCard = ({ title, value, rate }: { title: string, value: string | number, rate?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {rate && <p className="text-xs text-muted-foreground">{rate}</p>}
        </CardContent>
    </Card>
);

const EvolutionChart = ({ data, lines }: { data: any[], lines: { key: string, color: string, name: string }[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Évolution temporelle</CardTitle>
    </CardHeader>
    <CardContent className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          {lines.map((line) => (
            <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} name={line.name} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const MarkdownText = ({ text, className }: { text: string, className?: string }) => {
  if (!text) return null;
  // Divise le texte pour trouver les parties en gras (**texte**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

const ApplicationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [activeTab, setActiveTab] = useState<"overview" | "offers" | "applications" | "analyst">("overview");
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [pendingResponseApp, setPendingResponseApp] = useState<Application | null>(null);
  const [pendingRejectionApp, setPendingRejectionApp] = useState<Application | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{id: string, status: ApplicationStatus} | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [selectedInterviewCategory, setSelectedInterviewCategory] = useState("RH");
  const [selectedInterviewMedium, setSelectedInterviewMedium] = useState("Visio");
  const [feedbackAnalysis, setFeedbackAnalysis] = useState<any | null>(null);
  const [timingAnalysis, setTimingAnalysis] = useState<any | null>(null);
  const [isTimingLoading, setIsTimingLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedbackApp, setSelectedFeedbackApp] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Récupérer les swipes (likes et superlikes) avec les détails du job
        const { data, error } = await supabase
          .from('swipes')
          .select(`
            *,
            job:jobs (
              id,
              title,
              company
            )
          `)
          .eq('user_id', user.id)
          .eq('direction', 'like'); // On récupère tous les likes (incluant superlikes)

        if (error) throw error;

        if (data) {
          const mappedApps: Application[] = data.map((item: any) => ({
            id: item.job.id,
            company: item.job.company || "Entreprise inconnue",
            title: item.job.title || "Poste inconnu",
            // Si le statut est 'liked' ou null, on vérifie si c'est un superlike pour le mettre dans la bonne colonne
            status: (item.status && item.status !== 'liked') 
              ? item.status 
              : (item.is_superlike ? 'superliked' : 'liked'),
            isSuperlike: item.is_superlike,
            interviewDate: item.interview_date ? new Date(item.interview_date) : undefined,
            interviewType: item.interview_type,
            rejectionReason: item.rejection_reason,
            rejectionStage: item.rejection_stage,
            offerDeadline: item.offer_deadline ? new Date(item.offer_deadline) : undefined,
            dates: {
              liked: new Date(item.created_at),
              // Si on a une date de mise à jour pour le statut, on pourrait l'utiliser ici
              [item.status || (item.is_superlike ? 'superliked' : 'liked')]: new Date(item.updated_at || item.created_at)
            }
          }));
          setApplications(mappedApps);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des candidatures:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleStatusChangeClick = (applicationId: string, newStatus: ApplicationStatus | 'delete' | 'new_interview' | 'response_received') => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    if (newStatus === 'delete') {
        setItemToDelete(applicationId);
        setShowDeleteModal(true);
        return;
    }

    if (newStatus === 'response_received') {
      setPendingResponseApp(app);
      setShowResponseModal(true);
      return;
    }

    if (newStatus === 'interview' || newStatus === 'job_offer') {
      setPendingStatus({ id: applicationId, status: newStatus as ApplicationStatus });
      setShowDatePicker(true);
      setSelectedDate(new Date());
      setSelectedTime("10:00");
      setSelectedInterviewCategory("RH");
      setSelectedInterviewMedium("Visio");
    } else if (newStatus === 'new_interview') {
      setPendingStatus({ id: applicationId, status: 'interview' });
      setShowDatePicker(true);
      setSelectedDate(new Date());
      setSelectedTime("10:00");
      setSelectedInterviewCategory("RH");
      setSelectedInterviewMedium("Visio");
    } else if (newStatus === 'rejected' && (app.status === 'interview' || app.status === 'job_offer')) {
      // Refus après entretien
      setPendingRejectionApp(app);
      setRejectionReason("");
      setShowRejectionModal(true);
    } else {
      // Transitions simples (ex: retour à postulée, retour à like)
      executeStatusChange(applicationId, newStatus as ApplicationStatus);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setApplications(prev => prev.filter(a => a.id !== itemToDelete));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('swipes').delete().eq('user_id', user.id).eq('job_id', itemToDelete);
    }
    
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const confirmStatusChange = () => {
    if (!pendingStatus || !selectedDate) return;
    
    const finalDate = new Date(selectedDate);
    if (pendingStatus.status === 'interview') {
       const [hours, minutes] = selectedTime.split(':').map(Number);
       finalDate.setHours(hours, minutes);
    } else {
       // Pour une deadline, on peut mettre fin de journée ou garder l'heure par défaut
       finalDate.setHours(23, 59, 0, 0);
    }
    
    const interviewType = pendingStatus.status === 'interview' 
        ? `${selectedInterviewCategory} - ${selectedInterviewMedium}`
        : undefined;

    executeStatusChange(pendingStatus.id, pendingStatus.status, finalDate, interviewType);
    setShowDatePicker(false);
    setPendingStatus(null);
  };

  const executeStatusChange = async (applicationId: string, newStatus: ApplicationStatus, dateValue?: Date, extraData?: string) => {
    // Mise à jour optimiste de l'UI
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { 
        ...app, 
        status: newStatus, 
        dates: { ...app.dates, [newStatus]: new Date() },
        interviewDate: newStatus === 'interview' ? dateValue : app.interviewDate,
        offerDeadline: newStatus === 'job_offer' ? dateValue : app.offerDeadline,
        interviewType: newStatus === 'interview' && extraData ? extraData : app.interviewType,
        rejectionReason: newStatus === 'rejected' && extraData ? extraData : app.rejectionReason,
        rejectionStage: newStatus === 'rejected' ? (['interview', 'job_offer'].includes(app.status) ? 'after_interview' : 'before_interview') : app.rejectionStage
      } : app
    ));

    // Mise à jour en base de données (si la colonne status existe dans swipes)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Si on revient aux likes (superliked ou liked), on enregistre 'liked' en base
    // car la distinction se fait via la colonne is_superlike qui ne change pas.
    const dbStatus = newStatus === 'superliked' ? 'liked' : newStatus;

    const updates: any = { 
        status: dbStatus,
        updated_at: new Date().toISOString()
    };

    if (dateValue) {
        if (newStatus === 'interview') {
            updates.interview_date = dateValue.toISOString();
            if (extraData) updates.interview_type = extraData;
        }
        if (newStatus === 'job_offer') updates.offer_deadline = dateValue.toISOString();
    } else if (newStatus === 'rejected') {
        updates.rejection_stage = ['interview', 'job_offer'].includes(applications.find(a => a.id === applicationId)?.status || '') ? 'after_interview' : 'before_interview';
        if (extraData) updates.rejection_reason = extraData;
    }

    await supabase
      .from('swipes')
      .update(updates)
      .eq('user_id', user.id)
      .eq('job_id', applicationId);
  };

  const toggleColumn = (status: string) => {
    setExpandedColumns(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const isFollowUpSuggested = (appliedDate: Date | undefined) => {
    if (!appliedDate) return false;
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - appliedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 7;
  };

  const handleAnalyzeFeedback = async (app: Application) => {
    setAnalyzingId(app.id);
    setFeedbackAnalysis(null);

    // Simulation de l'appel API vers le backend Python (à connecter réellement)
    // const response = await fetch('/api/analyze-feedback', { method: 'POST', body: JSON.stringify({ jobId: app.id }) });
    
    setTimeout(() => {
        setFeedbackAnalysis({
            analysis: `L'analyse de votre candidature pour ${app.company} suggère que votre profil correspond à environ 70% des attentes. Les compétences techniques principales sont présentes, mais l'expérience sectorielle semble faire défaut par rapport aux exigences probables du poste.`,
            potential_reasons: [
                "Manque d'expérience spécifique dans le secteur de l'entreprise",
                "Compétences sur les outils propriétaires non mentionnées dans le CV",
                "Le poste nécessitait peut-être une disponibilité immédiate ou une mobilité géographique différente"
            ],
            improvement_tips: [
                "Se renseigner sur les outils spécifiques au secteur de " + app.company + " et les ajouter au CV si connus",
                "Mettre en avant l'adaptabilité et la capacité d'apprentissage rapide dans la lettre de motivation",
                "Valoriser les projets personnels pertinents pour combler le manque d'expérience directe"
            ],
            email_template: `Objet : Candidature au poste de ${app.title} - Demande de feedback\n\nMadame, Monsieur,\n\nJe vous remercie de m'avoir informé de l'état de ma candidature pour le poste de ${app.title}.\n\nBien que déçu de ne pas poursuivre le processus, je reste très intéressé par votre entreprise et son secteur d'activité. Dans une démarche d'amélioration continue, auriez-vous la possibilité de me partager brièvement les éléments qui ont motivé cette décision ?\n\nCela me serait très précieux pour identifier mes axes de progression pour de futures opportunités.\n\nEn vous remerciant par avance pour votre temps,\n\nCordialement,`
        });
        setAnalyzingId(null);
    }, 2500);
  };

  const handleTimingAnalysis = async () => {
    setIsTimingLoading(true);
    
    // Récupération du profil pour le contexte (simulation de l'envoi au backend)
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = "Candidat";
    if (user) {
        const { data } = await supabase.from('profiles').select('target_role').eq('id', user.id).single();
        if (data?.target_role) userRole = data.target_role;
    }

    // Collecte des données pour l'analyse (Détails des offres & Suivi candidatures)
    const offerDetailsStats = {
        liked: applications.filter(a => a.status === 'liked').length,
        superliked: applications.filter(a => a.status === 'superliked').length,
        total_potential: applications.filter(a => ['liked', 'superliked'].includes(a.status)).length
    };

    const trackingStats = {
        applied: applications.filter(a => a.status === 'applied').length,
        interviews: applications.filter(a => a.status === 'interview').length,
        responses: applications.filter(a => ['response_received', 'interview', 'job_offer', 'accepted', 'rejected'].includes(a.status)).length,
        active_processes: applications.filter(a => ['applied', 'response_received', 'interview', 'job_offer'].includes(a.status)).length
    };

    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Clé API Gemini manquante (VITE_GEMINI_API_KEY)");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
Tu es un expert en stratégie de recherche d'emploi.
Analyse les statistiques suivantes pour un candidat au poste de "${userRole}" :

STATISTIQUES :
- Offres en attente (Likées/Superlikées) : ${offerDetailsStats.total_potential}
- Candidatures envoyées : ${trackingStats.applied}
- Processus actifs : ${trackingStats.active_processes}
- Entretiens obtenus : ${trackingStats.interviews}

TA MISSION :
Fournir une stratégie de timing optimale au format JSON.

FORMAT DE RÉPONSE ATTENDU (JSON uniquement) :
{
  "best_days": [1, 2, 4], // Jours recommandés (0=Dimanche, 1=Lundi, ..., 6=Samedi)
  "best_time_range": "Matin entre 08h30 et 10h00",
  "reasoning": "Explication courte de la stratégie.",
  "action_plan": [
    { "day_offset": 0, "action": "Action pour aujourd'hui" },
    { "day_offset": 1, "action": "Action pour demain" },
    { "day_offset": 3, "action": "Action pour dans 3 jours" }
  ],
  "general_tip": "Un conseil court."
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Nettoyage du markdown si présent
        const jsonString = text.replace(/```json\n?|```/g, '').trim();
        const data = JSON.parse(jsonString);

        setTimingAnalysis(data);
        
        if (data.best_days?.length > 0) {
             const today = new Date();
             for(let i=1; i<=7; i++) {
                 const d = new Date(today);
                 d.setDate(today.getDate() + i);
                 if (data.best_days.includes(d.getDay())) {
                     setDate(d);
                     break;
                 }
             }
        }
    } catch (error) {
        console.error("Erreur Gemini:", error);
    } finally {
        setIsTimingLoading(false);
    }
  };

  const kpis = {
      liked: applications.filter(a => a.status === 'liked').length,
      superliked: applications.filter(a => a.status === 'superliked').length,
      applied: applications.filter(a => ['applied', 'interview', 'job_offer', 'accepted', 'rejected'].includes(a.status)).length,
      responses: applications.filter(a => ['interview', 'job_offer', 'accepted', 'rejected'].includes(a.status)).length,
      interviews: applications.filter(a => ['interview', 'job_offer', 'accepted'].includes(a.status)).length,
      offers: applications.filter(a => ['job_offer', 'accepted'].includes(a.status)).length,
      accepted: applications.filter(a => a.status === 'accepted').length,
  };

  const responseRate = kpis.applied > 0 ? ((kpis.responses / kpis.applied) * 100).toFixed(0) + '%' : 'N/A';
  const interviewRate = kpis.responses > 0 ? ((kpis.interviews / kpis.responses) * 100).toFixed(0) + '%' : 'N/A';
  const offerRate = kpis.interviews > 0 ? ((kpis.offers / kpis.interviews) * 100).toFixed(0) + '%' : 'N/A';
  const acceptanceRate = kpis.offers > 0 ? ((kpis.accepted / kpis.offers) * 100).toFixed(0) + '%' : 'N/A';

  // Préparation des données pour le graphique
  const getChartData = () => {
    const data: Record<string, { 
      date: string; 
      timestamp: number; 
      liked: number; 
      superliked: number;
            applied: number; 
            interview: number;
            job_offer: number;
            accepted: number;
            rejected: number;
          }> = {};
          
          applications.forEach(app => {
            const processDate = (dateObj: Date | undefined, type: string) => {
              if (!dateObj) return;
              const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
              
              if (!data[dateStr]) {
                data[dateStr] = { 
                  date: dateStr, 
                  timestamp: dateObj.setHours(0,0,0,0),
                  liked: 0, 
                  superliked: 0,
                  applied: 0, 
                  interview: 0,
                  job_offer: 0,
                  accepted: 0,
                  rejected: 0
                };
              }
              // @ts-ignore
              data[dateStr][type]++;
            };
      
            processDate(app.dates.liked, 'liked');
            if (app.isSuperlike) processDate(app.dates.liked, 'superliked'); // On utilise la date de like pour le superlike
            processDate(app.dates.applied, 'applied');
            processDate(app.dates.interview, 'interview');
            processDate(app.dates.job_offer, 'job_offer');
            processDate(app.dates.accepted, 'accepted');
            processDate(app.dates.rejected, 'rejected');
          });
      
          return Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
        };
  const getAvailableTransitions = (app: Application): { status: ApplicationStatus | 'delete' | 'new_interview' | 'response_received', label: string, icon?: any }[] => {
    const transitions: { status: ApplicationStatus | 'delete' | 'new_interview' | 'response_received', label: string, icon?: any }[] = [];

    switch (app.status) {
      case 'liked':
      case 'superliked':
        transitions.push({ status: 'applied', label: 'Postuler', icon: Briefcase });
        break;
      case 'applied':
        transitions.push({ status: 'response_received', label: 'Réponse reçue', icon: MessageSquare });
        break;
      case 'interview':
        transitions.push(
          { status: 'job_offer', label: 'Proposition reçue', icon: CheckCircle2 },
          { status: 'rejected', label: 'Pas retenu', icon: XCircle },
          { status: 'new_interview', label: 'Nouvel entretien', icon: RefreshCw },
          { status: 'applied', label: 'Retour à Postulée', icon: ArrowRight }
        );
        break;
      case 'job_offer':
        transitions.push(
          { status: 'accepted', label: 'Accepter l\'offre', icon: CheckCircle2 },
          { status: 'rejected', label: 'Refuser l\'offre', icon: XCircle },
          { status: 'interview', label: 'Retour à Entretien', icon: ArrowRight }
        );
        break;
      case 'accepted':
        transitions.push({ status: 'job_offer', label: 'Retour à Proposition', icon: ArrowRight });
        break;
      case 'rejected':
        transitions.push({ status: 'applied', label: 'Repasser en Postulée', icon: RefreshCw });
        break;
    }

    if (app.status !== 'liked' && app.status !== 'superliked') {
        transitions.push({ 
            status: app.isSuperlike ? 'superliked' : 'liked', 
            label: 'Retour aux likes', 
            icon: Heart 
        });
    }

    transitions.push({ status: 'delete', label: 'Supprimer', icon: Trash2 });

    return transitions;
  };

  return (
    <TooltipProvider>
      <div className="p-4 lg:p-8 pb-48">
        <div className="fixed top-4 right-4 z-50 flex gap-3">
          <button
            onClick={() => navigate("/jobswipe/offres")}
            className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
            title="Offres"
          >
            <Briefcase className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => navigate("/profil")}
            className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
            title="Profil"
          >
            <User className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-lg border border-white/50 shadow-lg flex items-center justify-center transition-all duration-200 ease-out hover:bg-white/95 hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
            title="Accueil"
          >
            <Home className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Suivi des candidatures</h1>
          <p className="text-slate-500">Gérez vos candidatures en un seul endroit.</p>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Offres likées" value={kpis.liked} />
                <KpiCard title="Offres superlikées" value={kpis.superliked} />
                <KpiCard title="Candidatures envoyées" value={kpis.applied} />
                <KpiCard title="Réponses reçues" value={kpis.responses} rate={` de réponses`} />
                <KpiCard title="Entretiens obtenus" value={kpis.interviews} rate={` d'entretiens`} />
                <KpiCard title="Propositions reçues" value={kpis.offers} rate={` de conversion`} />
            </div>

            <EvolutionChart 
              data={getChartData()} 
              lines={[
                { key: "liked", color: "#8884d8", name: "Likées" },
                { key: "applied", color: "#82ca9d", name: "Postulées" },
                { key: "interview", color: "#ffc658", name: "Entretiens" }
              ]}
            />
          </div>
        )}

        {(activeTab === "offers" || activeTab === "applications") && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {activeTab === "offers" ? (
            <EvolutionChart 
              data={getChartData()} 
              lines={[
                { key: "liked", color: "#94a3b8", name: "Likée" },
                { key: "superliked", color: "#fbbf24", name: "Superlikée" },
                { key: "applied", color: "#3b82f6", name: "Postulée" },
              ]}
            />
          ) : (
            <EvolutionChart 
              data={getChartData()} 
              lines={[
                { key: "applied", color: "#3b82f6", name: "Postulée" },
                { key: "response_received", color: "#6366f1", name: "Réponse reçue" },
                { key: "interview", color: "#a855f7", name: "Entretien" },
                { key: "accepted", color: "#22c55e", name: "Acceptée" },
                { key: "rejected", color: "#ef4444", name: "Refusée" },
              ]}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {(activeTab === "offers" ? offerColumns : applicationColumns).map((status) => {
            const filteredApps = applications.filter((app) => app.status === status);
            const isExpanded = expandedColumns[status];
            
            // Pour la colonne "rejected", on ne limite pas l'affichage ici car on va faire des sous-sections
            const displayApps = (status === 'rejected' || isExpanded) ? filteredApps : filteredApps.slice(0, 2);

            return (
            <div key={status} className={`rounded-lg ${statusColors[status]} p-4 flex flex-col h-full`}>
              <h2 className="text-lg font-semibold text-slate-700 mb-4">{statusLabels[status]}</h2>
              <div className="space-y-4">
                {displayApps
                  .map((app) => (
                    <Card key={app.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="p-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold">{app.title}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getAvailableTransitions(app).map((transition) => (
                              <DropdownMenuItem
                                key={transition.status}
                                onClick={() => handleStatusChangeClick(app.id, transition.status)}
                              >
                                {transition.icon && <transition.icon className="w-4 h-4 mr-2" />}
                                {transition.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-slate-600">{app.company}</p>
                          {app.status === 'applied' && isFollowUpSuggested(app.dates.applied) && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Bell className="h-5 w-5 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Suggestion: relancer l'entreprise.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {app.status === 'interview' && app.interviewDate && (
                            <div className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                                <CalendarClock className="w-3 h-3" />
                                {app.interviewDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {app.interviewType && (
                                  <span className="ml-1 border-l border-purple-200 pl-1">
                                    {app.interviewType}
                                  </span>
                                )}
                            </div>
                          )}

                          {app.status === 'job_offer' && app.offerDeadline && (
                            <div className="flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Deadline: {app.offerDeadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </div>
                          )}

                          {app.status === 'rejected' && app.rejectionReason && (
                             <div className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full max-w-[150px] truncate" title={app.rejectionReason}>
                                <AlertCircle className="w-3 h-3" />
                                {app.rejectionReason}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Bouton Voir plus sauf pour rejected qui est géré différemment */}
                  {status !== 'rejected' && filteredApps.length > 2 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full bg-white/50 hover:bg-white/80 text-slate-600"
                      onClick={() => toggleColumn(status)}
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-4 h-4 mr-2" /> Voir moins</>
                      ) : (
                        <><ChevronDown className="w-4 h-4 mr-2" /> Voir plus ({filteredApps.length - 2})</>
                      )}
                    </Button>
                  )}

                  {filteredApps.length === 0 && (
                      <div className="text-sm text-slate-500 text-center py-4">
                          Aucune candidature
                      </div>
                  )}
              </div>
            </div>
          )})}
          </div>
        </div>
        )}

        {activeTab === "analyst" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* F6: Feedback Analysis */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="w-6 h-6 text-indigo-600" />
                            Analyse & Feedback IA
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            <h4 className="font-semibold text-indigo-900 flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4" />
                                Conseil Général
                            </h4>
                            <p className="text-sm text-indigo-800">
                                Vos candidatures ont un meilleur taux de réponse lorsque vous postulez le mardi matin. Pensez à préparer vos brouillons le week-end !
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-700">Analyses spécifiques</h3>
                            {applications.filter(app => app.status === 'rejected').length === 0 ? (
                                <p className="text-slate-500 text-sm italic">Aucune candidature refusée à analyser pour le moment.</p>
                            ) : (
                                applications
                                    .filter(app => app.status === 'rejected')
                                    .map(app => (
                                        <div key={app.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-medium text-slate-900">{app.company}</h4>
                                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                                                    Refusé
                                                </span>
                                            </div>
                                            
                                            {feedbackAnalysis && !analyzingId && selectedFeedbackApp === app.id ? (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                    <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700">
                                                        <p className="font-medium mb-1 flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-indigo-500"/> Analyse IA</p>
                                                        <MarkdownText text={feedbackAnalysis.analysis} />
                                                    </div>
                                                    
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Hypothèses de refus</p>
                                                        <ul className="text-sm space-y-1">
                                                            {feedbackAnalysis.potential_reasons.map((reason: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-2 text-slate-600">
                                                                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                                    {reason}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Conseils d'amélioration</p>
                                                        <ul className="text-sm space-y-1">
                                                            {feedbackAnalysis.improvement_tips.map((tip: string, i: number) => (
                                                                <li key={i} className="flex items-start gap-2 text-slate-600">
                                                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                                    {tip}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="pt-2">
                                                        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigator.clipboard.writeText(feedbackAnalysis.email_template)}>
                                                            <MessageSquare className="w-4 h-4" />
                                                            Copier l'email de demande de feedback
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button 
                                                    onClick={() => {
                                                        setSelectedFeedbackApp(app.id); 
                                                        handleAnalyzeFeedback(app);
                                                    }} 
                                                    disabled={analyzingId === app.id}
                                                    className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                                                >
                                                    {analyzingId === app.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                                                    {analyzingId === app.id ? "Analyse en cours..." : "Demander une analyse détaillée"}
                                                </Button>
                                            )}
                                        </div>
                                    ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* F7: Timing Assistant */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarClock className="w-6 h-6 text-indigo-600" />
                            Assistant de Timing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!timingAnalysis ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-6 p-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
                                    <div className="bg-indigo-50 p-6 rounded-full relative">
                                        <CalendarClock className="w-10 h-10 text-indigo-600" />
                                    </div>
                                </div>
                                <div className="space-y-2 max-w-xs">
                                    <h3 className="text-lg font-semibold text-slate-900">Stratégie de Timing IA</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Laissez l'IA analyser vos données pour déterminer le moment idéal pour postuler et maximiser vos chances.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleTimingAnalysis} 
                                    disabled={isTimingLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 w-full max-w-xs"
                                >
                                    {isTimingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                                    {isTimingLoading ? "Analyse du marché en cours..." : "Générer ma stratégie"}
                                </Button>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                                {/* Calendrier et Meilleur Créneau */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                                                <Clock className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-indigo-900 text-xs uppercase tracking-wide mb-1">Meilleur Créneau</h4>
                                                <p className="text-lg font-bold text-slate-800">{timingAnalysis.best_time_range}</p>
                                                <MarkdownText text={timingAnalysis.reasoning} className="text-sm text-slate-600 mt-2 leading-relaxed" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            className="rounded-md"
                                            modifiers={{
                                                actionDay: (date) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    return timingAnalysis.action_plan.some((item: any) => {
                                                        const planDate = new Date(today);
                                                        planDate.setDate(today.getDate() + item.day_offset);
                                                        return planDate.toDateString() === date.toDateString();
                                                    });
                                                }
                                            }}
                                            modifiersClassNames={{
                                                actionDay: "bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-md"
                                            }}
                                        />
                                    </div>
                                </div>
                                
                                {/* Plan d'action Timeline */}
                                <div>
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                                        <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
                                        Plan d'action suggéré
                                    </h4>
                                    <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 ml-2">
                                        {timingAnalysis.action_plan.map((item: any, idx: number) => (
                                            <div key={idx} className="relative">
                                                <div className={`absolute -left-[21px] top-3 w-3 h-3 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'}`} />
                                                <div className={`p-3 rounded-lg border ${idx === 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-100'} shadow-sm transition-all hover:shadow-md`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${idx === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {item.day_offset === 0 ? "Aujourd'hui" : `J+${item.day_offset}`}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 font-medium">{item.action}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Conseil Pro */}
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start shadow-sm">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm shrink-0">
                                        <Lightbulb className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Conseil Pro</p>
                                        <MarkdownText text={`"${timingAnalysis.general_tip}"`} className="text-sm text-amber-900/80 italic leading-relaxed" />
                                    </div>
                                </div>
                        </div>
                        )}
                    </CardContent>
                </Card>
            </div>
          </div>
        )}
          </>
        )}

        {/* Barre d'onglets en bas */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="flex gap-1 p-1.5 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full">
            <Button 
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => setActiveTab("overview")}
              className="rounded-full px-6 transition-all duration-300"
            >
              Vue d'ensemble
            </Button>
            <Button 
              variant={activeTab === "offers" ? "default" : "ghost"}
              onClick={() => setActiveTab("offers")}
              className="rounded-full px-6 transition-all duration-300"
            >
              Détails des offres
            </Button>
            <Button 
              variant={activeTab === "applications" ? "default" : "ghost"}
              onClick={() => setActiveTab("applications")}
              className="rounded-full px-6 transition-all duration-300"
            >
              Suivi candidatures
            </Button>
            <Button 
              variant={activeTab === "analyst" ? "default" : "ghost"}
              onClick={() => setActiveTab("analyst")}
              className="rounded-full px-6 transition-all duration-300"
            >
              IA Analyste
            </Button>
          </div>
        </div>
        <div className="h-20" />
      </div>

      {/* Modal de sélection de date */}
      {showDatePicker && pendingStatus && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {pendingStatus.status === 'interview' ? <CalendarClock className="w-5 h-5 text-purple-600"/> : <AlertCircle className="w-5 h-5 text-teal-600"/>}
                {pendingStatus.status === 'interview' ? "Planifier l'entretien" : "Date limite de réponse"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center border rounded-lg p-2 bg-slate-50">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md bg-white"
                />
              </div>
              
              {pendingStatus.status === 'interview' && (
                <div className="flex items-center gap-3 justify-center bg-slate-50 p-3 rounded-lg border">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-slate-700">Heure :</label>
                  <input 
                    type="time" 
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="border rounded-md p-1 text-sm bg-white"
                  />
                </div>
              )}

              {pendingStatus.status === 'interview' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <select 
                            className="w-full p-2 border rounded-md bg-white text-sm"
                            value={selectedInterviewCategory}
                            onChange={(e) => setSelectedInterviewCategory(e.target.value)}
                        >
                            <option value="RH">RH</option>
                            <option value="Technique">Technique</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Moyen</Label>
                        <select 
                            className="w-full p-2 border rounded-md bg-white text-sm"
                            value={selectedInterviewMedium}
                            onChange={(e) => setSelectedInterviewMedium(e.target.value)}
                        >
                            <option value="Visio">Visio</option>
                            <option value="Présentiel">Présentiel</option>
                        </select>
                    </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDatePicker(false)}>Annuler</Button>
                <Button onClick={confirmStatusChange} disabled={!selectedDate}>Confirmer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Réponse Reçue */}
      {showResponseModal && pendingResponseApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600"/>
                Réponse reçue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">Quelle réponse avez-vous reçue pour le poste de <strong>{pendingResponseApp.title}</strong> chez <strong>{pendingResponseApp.company}</strong> ?</p>
              <div className="grid grid-cols-1 gap-3">
                <Button 
                    variant="outline" 
                    className="justify-start border-red-200 hover:bg-red-50 text-red-700"
                    onClick={() => {
                        executeStatusChange(pendingResponseApp.id, 'rejected', undefined, "Pas retenu");
                        setShowResponseModal(false);
                    }}
                >
                    <XCircle className="w-4 h-4 mr-2" />
                    Pas retenu
                </Button>
                <Button 
                    variant="outline" 
                    className="justify-start border-orange-200 hover:bg-orange-50 text-orange-700"
                    onClick={() => {
                        executeStatusChange(pendingResponseApp.id, 'rejected', undefined, "Refusée");
                        setShowResponseModal(false);
                    }}
                >
                    <XCircle className="w-4 h-4 mr-2" />
                    Refusée
                </Button>
                <Button 
                    className="justify-start bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                        setShowResponseModal(false);
                        setPendingStatus({ id: pendingResponseApp.id, status: 'interview' });
                        setShowDatePicker(true);
                        setSelectedDate(new Date());
                        setSelectedTime("10:00");
                        setSelectedInterviewCategory("RH");
                        setSelectedInterviewMedium("Visio");
                    }}
                >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Entretien
                </Button>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="ghost" onClick={() => setShowResponseModal(false)}>Annuler</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Motif de Refus */}
      {showRejectionModal && pendingRejectionApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5"/>
                Motif du refus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pourquoi la candidature n'a-t-elle pas abouti ?</Label>
                <Textarea 
                    placeholder="Ex: Salaire trop bas, culture d'entreprise, compétences manquantes..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowRejectionModal(false)}>Annuler</Button>
                <Button variant="destructive" onClick={() => { executeStatusChange(pendingRejectionApp.id, 'rejected', undefined, rejectionReason); setShowRejectionModal(false); }}>Confirmer le refus</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Confirmation de Suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5"/>
                Supprimer la candidature ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Êtes-vous sûr de vouloir supprimer cette candidature ? Cette action est irréversible.
              </p>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Annuler</Button>
                <Button variant="destructive" onClick={confirmDelete}>Confirmer la suppression</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </TooltipProvider>
  );
};

export default ApplicationDashboard;
