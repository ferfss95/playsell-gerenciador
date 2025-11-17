import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { useNavigate } from "react-router-dom";
import { Plus, Video, Users, CheckCircle2, Clock, Coins, Edit, Trash2, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function Trainings() {
  const { trainings, isLoadingTrainings, deleteTraining } = useGerenciador();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState<string | null>(null);

  const handleDelete = async (trainingId: string) => {
    setTrainingToDelete(trainingId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (trainingToDelete) {
      await deleteTraining(trainingToDelete);
      setDeleteDialogOpen(false);
      setTrainingToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-white">Ativo</Badge>;
      case "draft":
        return <Badge variant="secondary">Rascunho</Badge>;
      case "completed":
        return <Badge className="bg-info text-white">Concluído</Badge>;
      case "archived":
        return <Badge variant="outline">Arquivado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getScopeLabel = (scope: string, scopeId?: string | null) => {
    switch (scope) {
      case "company":
        return "Todas as lojas";
      case "regional":
        return scopeId ? `Regional: ${scopeId}` : "Regional";
      case "store":
        return scopeId ? `Loja: ${scopeId}` : "Loja";
      default:
        return scope;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Treinamentos" subtitle="Gerenciar treinamentos e quizzes" />

      <main className="px-4 py-6 space-y-6">
        {/* Ação rápida */}
        <Button
          className="w-full bg-gradient-primary hover-glow hover-lift text-white shadow-elevated gap-2"
          onClick={() => navigate("/trainings/create")}
        >
          <Plus className="h-5 w-5" />
          Novo Treinamento
        </Button>

        {/* Lista de treinamentos */}
        {isLoadingTrainings ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Carregando treinamentos...</p>
            </CardContent>
          </Card>
        ) : trainings.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum treinamento cadastrado ainda</p>
              <Button
                variant="outline"
                onClick={() => navigate("/trainings/create")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Treinamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {trainings.map((training) => (
              <Card key={training.id} className="shadow-card hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{training.title}</CardTitle>
                        {getStatusBadge(training.status)}
                      </div>
                      {training.description && (
                        <CardDescription className="mt-1">{training.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/trainings/${training.id}/edit`)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(training.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações do vídeo */}
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Video className="h-4 w-4" />
                      <span>{training.duration_minutes || "N/A"} min</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Coins className="h-4 w-4" />
                      <span>{training.reward_coins} moedas</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {training.user_assignments_count || 0} atribuído
                        {training.user_assignments_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {training.completed_assignments_count || 0} concluído
                        {training.completed_assignments_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Escopo e cargos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Escopo:</span>
                      <Badge variant="outline">{getScopeLabel(training.scope, training.scope_id)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">Cargos:</span>
                      {training.role_assignments.length > 0 ? (
                        training.role_assignments.map((ra) => (
                          <Badge key={ra.id} variant="secondary" className="text-xs">
                            {ra.role === "admin" ? "Admin" : ra.role === "leader" ? "Líder" : "Usuário"}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhum cargo selecionado</span>
                      )}
                    </div>
                  </div>

                  {/* Quizzes */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Quizzes:</span>
                    <Badge variant="outline">{training.quizzes.length} questão(ões)</Badge>
                  </div>

                  {/* Data de criação */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Criado em {format(new Date(training.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este treinamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


