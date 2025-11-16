import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function UploadUsers() {
  const { createUsersFromCSV } = useGerenciador();
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    setCsvData(text);
  };

  const handleSubmit = async () => {
    if (!csvData.trim()) {
      toast.error("Por favor, insira ou cole os dados CSV");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const result = await createUsersFromCSV(csvData);
      setResult(result);
      
      if (result.errors.length === 0) {
        toast.success(`${result.success} usuário(s) cadastrado(s) com sucesso!`);
        setTimeout(() => navigate("/users"), 2000);
      } else {
        toast.warning(`${result.success} cadastrado(s), ${result.errors.length} erro(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar CSV");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Upload CSV - Usuários" subtitle="Cadastro em massa" />

      <main className="px-4 py-6 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Usuários via CSV
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV ou cole os dados abaixo. Formato esperado:
              <br />
              <code className="text-xs bg-muted p-1 rounded">
                email,senha,nome_completo,loja_id,regional_id
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload de Arquivo CSV
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Ou cole os dados CSV aqui:
              </label>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                onPaste={handlePaste}
                placeholder="email,senha,nome_completo,loja_id,regional_id&#10;joao@exemplo.com,senha123,João Silva,LOJA-001,REG-001&#10;maria@exemplo.com,senha456,Maria Santos,LOJA-002,REG-001"
                className="w-full min-h-[200px] p-3 border rounded-md font-mono text-sm"
              />
            </div>

            {result && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-semibold">
                    {result.success} usuário(s) cadastrado(s) com sucesso
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="font-semibold">Erros ({result.errors.length}):</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground ml-6">
                      {result.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/users")}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-primary hover-glow hover-lift text-white shadow-elevated"
                disabled={isLoading || !csvData.trim()}
              >
                {isLoading ? "Processando..." : "Processar CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Formato do CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Colunas obrigatórias:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><code>email</code> - Email do usuário (único)</li>
                <li><code>senha</code> - Senha temporária (mínimo 6 caracteres)</li>
                <li><code>nome_completo</code> - Nome completo do usuário</li>
              </ul>
              <p className="font-semibold mt-4">Colunas opcionais:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><code>loja_id</code> - ID da loja</li>
                <li><code>regional_id</code> - ID regional</li>
              </ul>
              <p className="mt-4 font-semibold">Exemplo:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`email,senha,nome_completo,loja_id,regional_id
joao@exemplo.com,senha123,João Silva,LOJA-001,REG-001
maria@exemplo.com,senha456,Maria Santos,LOJA-002,REG-001
pedro@exemplo.com,senha789,Pedro Costa,,REG-002`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

