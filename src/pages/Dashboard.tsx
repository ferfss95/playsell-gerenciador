import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Users, TrendingUp, UserPlus, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { users, isLoading } = useGerenciador();
  const navigate = useNavigate();

  const totalUsers = users.length;
  const usersWithPerformance = users.filter((u) => u.latest_performance).length;
  const totalSales = users.reduce((acc, user) => {
    return acc + (user.latest_performance?.sales_current || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="PlaySell" subtitle="Gerenciador" />

      <main className="px-4 py-6 space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Com Indicadores</p>
                  <p className="text-2xl font-bold text-foreground">{usersWithPerformance}</p>
                </div>
                <div className="p-3 bg-success/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendas Totais */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Vendas Totais (Hoje)</p>
                <p className="text-3xl font-bold text-foreground">
                  R$ {totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 bg-gradient-primary rounded-full">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-gradient-primary hover-glow hover-lift text-white shadow-elevated gap-2"
              onClick={() => navigate("/register")}
            >
              <UserPlus className="h-5 w-5" />
              Cadastrar Novo Usuário
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/performance")}
            >
              <TrendingUp className="h-5 w-5" />
              Inserir Indicadores
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/users")}
            >
              <Users className="h-5 w-5" />
              Ver Todos os Usuários
            </Button>
          </CardContent>
        </Card>

        {/* Usuários Recentes */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Carregando...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum usuário cadastrado ainda
              </p>
            ) : (
              <div className="space-y-3">
                {users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.store_id ? `Loja: ${user.store_id}` : "Sem loja"}
                      </p>
                    </div>
                    {user.latest_performance && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-success">
                          R$ {user.latest_performance.sales_current.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

