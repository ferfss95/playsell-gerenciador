import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RegisterUser() {
  const { createUser } = useGerenciador();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    store_id: "",
    regional_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        store_id: formData.store_id || undefined,
        regional_id: formData.regional_id || undefined,
      });
      
      // Limpar formulário
      setFormData({
        email: "",
        password: "",
        full_name: "",
        store_id: "",
        regional_id: "",
      });
      
      navigate("/users");
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Cadastrar Usuário" subtitle="Novo membro da equipe" />

      <main className="px-4 py-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Dados do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  placeholder="João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="joao@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_id">ID da Loja</Label>
                <Input
                  id="store_id"
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  placeholder="Ex: LOJA-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regional_id">ID Regional</Label>
                <Input
                  id="regional_id"
                  value={formData.regional_id}
                  onChange={(e) => setFormData({ ...formData, regional_id: e.target.value })}
                  placeholder="Ex: REG-001"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/users")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary hover-glow hover-lift text-white shadow-elevated"
                  disabled={isLoading}
                >
                  {isLoading ? "Cadastrando..." : "Cadastrar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

