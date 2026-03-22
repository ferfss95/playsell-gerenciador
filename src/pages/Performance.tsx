import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { TrendingUp, Calendar, Upload, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Performance() {
  const { users, addPerformance } = useGerenciador();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    sales_target: "",
    sales_current: "",
    average_ticket: "",
    nps: "",
    conversion_rate: "",
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Selecione um usuário");
      return;
    }

    setIsLoading(true);
    try {
      await addPerformance({
        user_id: selectedUserId,
        date: formData.date,
        sales_target: parseFloat(formData.sales_target) || 0,
        sales_current: parseFloat(formData.sales_current) || 0,
        average_ticket: parseFloat(formData.average_ticket) || 0,
        nps: parseInt(formData.nps) || 0,
        conversion_rate: parseFloat(formData.conversion_rate) || 0,
      });

      // A mensagem de sucesso já é exibida pelo mutation onSuccess
      // toast.success("Indicadores salvos com sucesso!");

      // Limpar formulário
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        sales_target: "",
        sales_current: "",
        average_ticket: "",
        nps: "",
        conversion_rate: "",
      });
      setSelectedUserId("");
    } catch (error: any) {
      console.error("Erro ao salvar indicadores:", error);
      // A mensagem de erro já é exibida pelo mutation onError
      // toast.error(`Erro ao salvar indicadores: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Indicadores" subtitle="Vendas e desempenho" />

      <main className="px-4 py-6 space-y-4">
        {/* Link Rápido para Upload CSV */}
        <Card className="shadow-card bg-gradient-card/50 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Precisa inserir múltiplos registros?</p>
                <p className="text-xs text-muted-foreground">Use o upload CSV para processar em massa</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/upload-performance")}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Inserir Indicadores
            </CardTitle>
            <CardDescription>
              Preencha os dados de vendas e indicadores para um usuário específico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Usuário *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_target">Meta de Vendas (R$)</Label>
                  <Input
                    id="sales_target"
                    type="number"
                    step="0.01"
                    value={formData.sales_target}
                    onChange={(e) => setFormData({ ...formData, sales_target: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sales_current">Vendas Atuais (R$)</Label>
                  <Input
                    id="sales_current"
                    type="number"
                    step="0.01"
                    value={formData.sales_current}
                    onChange={(e) => setFormData({ ...formData, sales_current: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="average_ticket">Ticket Médio (R$)</Label>
                  <Input
                    id="average_ticket"
                    type="number"
                    step="0.01"
                    value={formData.average_ticket}
                    onChange={(e) => setFormData({ ...formData, average_ticket: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nps">NPS</Label>
                  <Input
                    id="nps"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.nps}
                    onChange={(e) => setFormData({ ...formData, nps: e.target.value })}
                    placeholder="0-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversion_rate">Taxa de Conversão (%)</Label>
                <Input
                  id="conversion_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.conversion_rate}
                  onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover-glow hover-lift text-white shadow-elevated"
                disabled={isLoading || !selectedUserId}
              >
                {isLoading ? "Salvando..." : "Salvar Indicadores"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

