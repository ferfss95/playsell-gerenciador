import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Users, TrendingUp, UserPlus, Upload, FileText, ArrowRight, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Dashboard() {
  const { users, isLoading, trainings, isLoadingTrainings } = useGerenciador();
  const navigate = useNavigate();

  const totalUsers = users.length;
  const usersWithPerformance = users.filter((u) => u.latest_performance).length;
  const totalTrainings = trainings.length;
  const activeTrainings = trainings.filter((t) => t.status === "active").length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="PlaySell" subtitle="Gerenciador" />

      <main className="px-4 py-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total de Usuários</p>
                  <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Com Indicadores</p>
                  <p className="text-2xl font-bold text-foreground">{usersWithPerformance}</p>
                </div>
                <div className="p-2 bg-success/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Treinamentos</p>
                  <p className="text-2xl font-bold text-foreground">{totalTrainings}</p>
                </div>
                <div className="p-2 bg-accent/10 rounded-full">
                  <GraduationCap className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Treinamentos Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{activeTrainings}</p>
                </div>
                <div className="p-2 bg-info/10 rounded-full">
                  <GraduationCap className="h-5 w-5 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações Principais - Agrupadas por Funcionalidade */}
        <div className="space-y-4">
          {/* Gestão de Usuários */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gestão de Usuários</CardTitle>
              <CardDescription>Cadastrar e gerenciar usuários</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full bg-gradient-primary hover-glow hover-lift text-white shadow-elevated gap-2 justify-start"
                onClick={() => navigate("/register")}
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar Usuário Individual
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => navigate("/upload-users")}
              >
                <Upload className="h-4 w-4" />
                Upload CSV - Cadastro em Massa
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => navigate("/users")}
              >
                <Users className="h-4 w-4" />
                Ver Todos os Usuários
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* Indicadores e Desempenho */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Indicadores e Desempenho</CardTitle>
              <CardDescription>Inserir vendas e métricas de performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full bg-gradient-secondary hover-glow hover-lift text-white shadow-elevated gap-2 justify-start"
                onClick={() => navigate("/performance")}
              >
                <TrendingUp className="h-4 w-4" />
                Inserir Indicadores Individual
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => navigate("/upload-performance")}
              >
                <FileText className="h-4 w-4" />
                Upload CSV - Vendas/Indicadores
              </Button>
            </CardContent>
          </Card>

          {/* Treinamentos */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Treinamentos</CardTitle>
              <CardDescription>Criar e gerenciar treinamentos com vídeos e quizzes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full bg-gradient-accent hover-glow hover-lift text-white shadow-elevated gap-2 justify-start"
                onClick={() => navigate("/trainings/create")}
              >
                <GraduationCap className="h-4 w-4" />
                Novo Treinamento
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => navigate("/trainings")}
              >
                <GraduationCap className="h-4 w-4" />
                Ver Todos os Treinamentos
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Usuários Recentes */}
        {users.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Usuários Recentes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/users")}
                  className="text-xs"
                >
                  Ver todos
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {users.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate("/users")}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                          {user.avatar_initials || user.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.store_id ? `Loja: ${user.store_id}` : "Sem loja"}
                        </p>
                      </div>
                      {user.latest_performance && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-success">
                            R$ {user.latest_performance.sales_current.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">Vendas</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

