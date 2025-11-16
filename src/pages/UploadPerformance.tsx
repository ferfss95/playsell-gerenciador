import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function UploadPerformance() {
  const { addPerformancesFromCSV } = useGerenciador();
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
      const result = await addPerformancesFromCSV(csvData);
      setResult(result);
      
      if (result.errors.length === 0) {
        toast.success(`${result.success} registro(s) de vendas/indicadores processado(s) com sucesso!`);
        setTimeout(() => navigate("/users"), 2000);
      } else {
        toast.warning(`${result.success} processado(s), ${result.errors.length} erro(s)`);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar CSV");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header title="Upload CSV - Vendas/Indicadores" subtitle="Dados de desempenho" />

      <main className="px-4 py-6 space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Vendas e Indicadores via CSV
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV ou cole os dados abaixo. Cada linha representa um vendedor em um dia específico.
              <br />
              <code className="text-xs bg-muted p-1 rounded">
                email,nome,data,meta_vendas,vendas_atuais,ticket_medio,nps,taxa_conversao
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
                placeholder="email,nome,data,meta_vendas,vendas_atuais,ticket_medio,nps,taxa_conversao&#10;joao@exemplo.com,João Silva,2025-01-27,10000,8500,150,85,75.5&#10;maria@exemplo.com,Maria Santos,2025-01-27,12000,11000,180,90,80.2"
                className="w-full min-h-[200px] p-3 border rounded-md font-mono text-sm"
              />
            </div>

            {result && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-semibold">
                    {result.success} registro(s) processado(s) com sucesso
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
                onClick={() => navigate("/performance")}
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
                <li><code>email</code> - Email do vendedor (deve existir no sistema)</li>
                <li><code>nome</code> - Nome do vendedor (para validação)</li>
                <li><code>data</code> - Data no formato YYYY-MM-DD</li>
                <li><code>meta_vendas</code> - Meta de vendas (R$)</li>
                <li><code>vendas_atuais</code> - Vendas realizadas (R$)</li>
                <li><code>ticket_medio</code> - Ticket médio (R$)</li>
                <li><code>nps</code> - NPS (0-100)</li>
                <li><code>taxa_conversao</code> - Taxa de conversão (%)</li>
              </ul>
              <p className="mt-4 font-semibold">Exemplo:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`email,nome,data,meta_vendas,vendas_atuais,ticket_medio,nps,taxa_conversao
joao@exemplo.com,João Silva,2025-01-27,10000,8500,150,85,75.5
maria@exemplo.com,Maria Santos,2025-01-27,12000,11000,180,90,80.2
pedro@exemplo.com,Pedro Costa,2025-01-27,8000,9200,165,88,82.3`}
              </pre>
              <p className="mt-4 text-xs text-muted-foreground">
                <strong>Nota:</strong> Se o registro já existir para o mesmo usuário e data, ele será atualizado.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

