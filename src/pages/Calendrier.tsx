import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { SEOHead } from "@/components/seo";

const Calendrier = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Highlight Mondays as best days to apply
  const isMonday = (date: Date) => date.getDay() === 1;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Calendrier des entretiens"
        description="Planifiez et suivez vos entretiens"
        noindex={true}
      />
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Calendrier intelligent</h1>
            <div className="flex justify-center mt-4">
              <Badge className="bg-secondary text-secondary-foreground px-4 py-2">
                <Lightbulb className="w-4 h-4 mr-2" />
                Meilleur moment : Lundi matin
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-lg border"
                modifiers={{
                  highlighted: (date) => isMonday(date),
                }}
                modifiersClassNames={{
                  highlighted: "bg-primary/20 font-bold",
                }}
              />
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">💡 Conseil</h3>
              <p className="text-sm text-muted-foreground">
                Les lundis matins sont statistiquement les meilleurs moments pour postuler. 
                Les recruteurs sont plus actifs en début de semaine et vos candidatures ont 
                plus de chances d'être vues rapidement.
              </p>
            </div>

            <PrimaryButton onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour au tableau de bord
            </PrimaryButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calendrier;
