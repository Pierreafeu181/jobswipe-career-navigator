import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadFavorites } from "@/lib/storage";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { SEOHead } from "@/components/seo";

const Dashboard = () => {
  const navigate = useNavigate();
  const favorites = loadFavorites();

  const statusData = [
    { name: "En cours", value: favorites.length },
    { name: "Prix", value: 2 },
    { name: "Entretien", value: 1 },
    { name: "Réponses", value: 3 },
  ];

  const successData = [
    { name: "Réussite", value: 25 },
    { name: "En attente", value: 75 },
  ];

  const COLORS = ["hsl(215, 65%, 25%)", "hsl(142, 70%, 50%)", "hsl(350, 95%, 65%)", "hsl(220, 10%, 45%)"];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Tableau de bord"
        description="Vue d'ensemble de votre recherche d'emploi"
        noindex={true}
      />
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <h1 className="text-2xl font-bold">Mon tableau de bord</h1>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid grid-cols-4 gap-3">
              {statusData.map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="bg-primary/10 rounded-lg p-3 mb-2">
                    <p className="text-2xl font-bold text-primary">{item.value}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.name}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Candidatures par statut</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(215, 65%, 25%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Taux de réussite</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={successData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {successData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Recommandations suggérées</h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-sm text-foreground">• Ingénieur Data Science - Paris</p>
                <p className="text-sm text-foreground">• Développeur Full Stack - Lyon</p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <PrimaryButton 
                onClick={() => navigate("/calendrier")}
                className="bg-secondary hover:bg-secondary/90"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Calendrier intelligent
              </PrimaryButton>

              <PrimaryButton onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
              </PrimaryButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
