import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { UserPlus, Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function RegisterUser() {
  const { createUser } = useGerenciador();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    enrollment_number: "",
    role: "user" as "admin" | "leader" | "user",
    store_id: "",
    regional_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validação de campos obrigatórios
    if (!formData.enrollment_number || !formData.enrollment_number.trim()) {
      toast.error("Matrícula é obrigatória");
      setIsLoading(false);
      return;
    }

    if (!formData.role) {
      toast.error("Cargo é obrigatório");
      setIsLoading(false);
      return;
    }

    try {
      await createUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        enrollment_number: formData.enrollment_number,
        role: formData.role,
        store_id: formData.store_id || undefined,
        regional_id: formData.regional_id || undefined,
      });
      
      // A mensagem de sucesso já é exibida pelo mutation onSuccess
      // toast.success("Usuário cadastrado com sucesso!");
      
      // Limpar formulário
      setFormData({
        email: "",
        password: "",
        full_name: "",
        enrollment_number: "",
        role: "user",
        store_id: "",
        regional_id: "",
      });
      
      setTimeout(() => navigate("/users"), 2000);
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      // A mensagem de erro já é exibida pelo mutation onError
      // toast.error(error.message || "Erro ao cadastrar usuário");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Cadastrar Usuário" subtitle="Novo membro da equipe" />

      <main className="px-4 py-6 space-y-4">
        {/* Link Rápido para Upload CSV */}
        <Card className="shadow-card bg-gradient-card/50 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Precisa cadastrar múltiplos usuários?</p>
                <p className="text-xs text-muted-foreground">Use o upload CSV para cadastro em massa</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/upload-users")}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload CSV
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Cadastrar Novo Usuário
            </CardTitle>
            <CardDescription>
              Preencha os dados para criar um novo usuário no sistema
            </CardDescription>
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
                <Label htmlFor="enrollment_number">Matrícula *</Label>
                <Input
                  id="enrollment_number"
                  value={formData.enrollment_number}
                  onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
                  required
                  placeholder="Ex: MAT-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Cargo *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as "admin" | "leader" | "user" })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
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

