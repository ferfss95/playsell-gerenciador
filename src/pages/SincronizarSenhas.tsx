import { useState } from "react";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SincronizarSenhas() {
  const { supabase } = useGerenciador();
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    sucesso: number;
    erros: number;
    detalhes: Array<{ nome: string; erro?: string }>;
  } | null>(null);

  const sincronizarSenhas = async () => {
    if (!supabase) {
      toast.error("Supabase não configurado");
      return;
    }

    setIsLoading(true);
    setResultado(null);

    try {
      // Buscar todos os perfis com matrícula
      // Nota: A tabela profiles não tem campo email, apenas full_name
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, enrollment_number")
        .not("enrollment_number", "is", null);

      if (profilesError) {
        throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);
      }

      if (!profiles || profiles.length === 0) {
        toast.info("Nenhum usuário com matrícula encontrado");
        setIsLoading(false);
        return;
      }

      let sucesso = 0;
      let erros = 0;
      const detalhes: Array<{ nome: string; erro?: string }> = [];

      for (const profile of profiles) {
        if (!profile.enrollment_number) continue;

        // Converter para string primeiro, pois pode vir como número do banco
        let novaSenha = String(profile.enrollment_number).trim();

        // Se a matrícula for menor que 6 caracteres, preencher com zeros
        if (novaSenha.length < 6) {
          novaSenha = novaSenha.padStart(6, "0");
        }

        try {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            profile.id,
            {
              password: novaSenha,
            }
          );

          if (updateError) {
            erros++;
            detalhes.push({
              nome: profile.full_name || profile.id,
              erro: updateError.message,
            });
          } else {
            sucesso++;
            detalhes.push({
              nome: profile.full_name || profile.id,
            });
          }
        } catch (error: any) {
          erros++;
          detalhes.push({
            nome: profile.full_name || profile.id,
            erro: error.message || "Erro desconhecido",
          });
        }
      }

      setResultado({
        sucesso,
        erros,
        detalhes,
      });

      if (sucesso > 0) {
        toast.success(`${sucesso} senha(s) atualizada(s) com sucesso!`);
      }
      if (erros > 0) {
        toast.error(`${erros} erro(s) ao atualizar senha(s)`);
      }
    } catch (error: any) {
      console.error("Erro ao sincronizar senhas:", error);
      toast.error(error.message || "Erro ao sincronizar senhas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sincronizar Senhas dos Usuários
            </CardTitle>
            <CardDescription>
              Atualiza a senha de todos os usuários para ser igual à sua matrícula
              (preenchida com zeros se necessário). Use esta ferramenta para
              corrigir usuários criados antes da implementação do sistema de senha
              = matrícula.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Atenção:</strong> Esta ação atualizará a senha de TODOS os
            usuários para ser igual à sua matrícula. Certifique-se de que todos os
            usuários foram notificados sobre a mudança.
          </p>
        </div>

        <Button
          onClick={sincronizarSenhas}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Todas as Senhas
            </>
          )}
        </Button>

        {resultado && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">
                  {resultado.sucesso} sucesso(s)
                </span>
              </div>
              {resultado.erros > 0 && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">{resultado.erros} erro(s)</span>
                </div>
              )}
            </div>

            {resultado.detalhes.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3">Nome</th>
                        <th className="text-left p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.detalhes.map((detalhe, index) => (
                        <tr
                          key={index}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-3">{detalhe.nome}</td>
                          <td className="p-3">
                            {detalhe.erro ? (
                              <span className="text-red-600 dark:text-red-400">
                                ❌ {detalhe.erro}
                              </span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">
                                ✅ Atualizado
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  </div>
</div>
  );
}

