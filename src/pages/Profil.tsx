import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogoHeader } from "@/components/LogoHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile, loadProfile } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

const Profil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    formations: "",
    experiences: "",
    competences: "",
    contact: "",
    gender: "",
    handicap: "",
    salaryExpectations: "",
  });

  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setFormData(profile);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(formData);
    toast({
      title: "Profil sauvegardé",
      description: "Vos informations ont été enregistrées avec succès.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <LogoHeader />
      
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Mon profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formations">Formations</Label>
                <Textarea
                  id="formations"
                  value={formData.formations}
                  onChange={(e) => setFormData({ ...formData, formations: e.target.value })}
                  placeholder="Décrivez vos formations..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experiences">Expériences</Label>
                <Textarea
                  id="experiences"
                  value={formData.experiences}
                  onChange={(e) => setFormData({ ...formData, experiences: e.target.value })}
                  placeholder="Décrivez vos expériences professionnelles..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competences">Compétences / Projets</Label>
                <Textarea
                  id="competences"
                  value={formData.competences}
                  onChange={(e) => setFormData({ ...formData, competences: e.target.value })}
                  placeholder="Listez vos compétences et projets..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Informations / Contacts</Label>
                <Textarea
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Email, téléphone, LinkedIn..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Genre</Label>
                  <select 
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Non spécifié</option>
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                    <option value="NB">Non-binaire</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handicap">Situation de handicap</Label>
                  <select 
                    id="handicap"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.handicap}
                    onChange={(e) => setFormData({ ...formData, handicap: e.target.value })}
                  >
                    <option value="">Non spécifié</option>
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryExpectations">Prétentions salariales</Label>
                <Input
                  id="salaryExpectations"
                  value={formData.salaryExpectations}
                  onChange={(e) => setFormData({ ...formData, salaryExpectations: e.target.value })}
                  placeholder="Ex: 45k - 55k"
                />
              </div>

              <div className="space-y-3 pt-4">
                <PrimaryButton type="submit">
                  Sauvegarder
                </PrimaryButton>
                
                <PrimaryButton 
                  type="button"
                  onClick={() => navigate("/cv")}
                  className="bg-primary hover:bg-primary/90"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Générer mon CV
                </PrimaryButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profil;
