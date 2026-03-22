import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Users as UsersIcon, Search, Trash2, DollarSign, UserPlus, Upload, Key } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Users() {
  const { users, isLoading, deleteUser, resetUserPassword } = useGerenciador();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja deletar o usuário "${userName}"?`)) {
      try {
        await deleteUser(userId);
        toast.success("Usuário deletado com sucesso");
      } catch (error) {
        toast.error("Erro ao deletar usuário");
      }
    }
  };

  const handleResetPassword = async (userId: string, userName: string, enrollmentNumber?: string | null) => {
    if (!enrollmentNumber) {
      toast.error("Usuário não possui matrícula cadastrada");
      return;
    }

    const senhaFinal = enrollmentNumber.length < 6 ? enrollmentNumber.padStart(6, '0') : enrollmentNumber;
    
    if (confirm(`Deseja resetar a senha do usuário "${userName}" para a matrícula?\n\nMatrícula: ${enrollmentNumber}\nSenha será: ${senhaFinal}\n\nApós o reset, o usuário poderá fazer login com a matrícula.`)) {
      setResettingPassword(userId);
      try {
        console.log(`🔄 Resetando senha para ${userName} (${userId})...`);
        await resetUserPassword(userId);
        
        const mensagem = `✅ Senha resetada com sucesso!\n\nUsuário: ${userName}\nMatrícula: ${enrollmentNumber}\nSenha: ${senhaFinal}\n\nO usuário pode fazer login agora com a matrícula.`;
        toast.success(mensagem, { duration: 5000 });
        
        console.log(`✅ Reset de senha concluído para ${userName}`);
      } catch (error: any) {
        console.error(`❌ Erro ao resetar senha:`, error);
        toast.error(error.message || "Erro ao resetar senha. Verifique o console para mais detalhes.", { duration: 5000 });
      } finally {
        setResettingPassword(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Usuários" subtitle={`${users.length} cadastrados`} />

      <main className="px-4 py-6 space-y-4">
        {/* Ações Rápidas */}
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-gradient-primary hover-glow hover-lift text-white shadow-elevated gap-2"
            onClick={() => navigate("/register")}
          >
            <UserPlus className="h-4 w-4" />
            Novo Usuário
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/upload-users")}
          >
            <Upload className="h-4 w-4" />
            CSV
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de Usuários */}
        {isLoading ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="shadow-card hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                          {user.avatar_initials || user.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{user.full_name}</p>
                          {user.role && (
                            <Badge variant="outline" className="text-xs">
                              {user.role === "admin" ? "Admin" : user.role === "leader" ? "Líder" : "Usuário"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                          {user.enrollment_number && (
                            <p className="text-xs text-muted-foreground">
                              Matrícula: {user.enrollment_number}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {user.store_id ? `Loja: ${user.store_id}` : "Sem loja"}
                          </p>
                          {user.latest_performance && (
                            <p className="text-xs text-success">
                              Última atualização:{" "}
                              {format(new Date(user.latest_performance.date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.latest_performance && (
                        <div className="text-right mr-2">
                          <p className="text-sm font-semibold text-success flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            R$ {user.latest_performance.sales_current.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">Últimas vendas</p>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResetPassword(user.id, user.full_name, user.enrollment_number)}
                        disabled={resettingPassword === user.id || !user.enrollment_number}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        title="Resetar senha para a matrícula"
                      >
                        {resettingPassword === user.id ? (
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Key className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id, user.full_name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

