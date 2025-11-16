import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ParsedUser {
  email: string;
  password: string;
  full_name: string;
  enrollment_number: string;
  role: string;
  store_id?: string;
  regional_id?: string;
  errors?: string[];
  isValid?: boolean;
}

export default function UploadUsers() {
  const { createUsersFromCSV } = useGerenciador();
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Função auxiliar para parsear CSV corretamente (lidando com vírgulas dentro de valores)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++; // Pular próxima aspas
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim()); // Adicionar último valor
    return result;
  };

  // Parsear CSV e criar tabela de pré-visualização
  const parsedData = useMemo(() => {
    if (!csvData.trim()) return [];

    const lines = csvData.trim().split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      // Se tiver apenas cabeçalho, retornar array vazio mas não erro
      return [];
    }

    try {
      const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
      const emailIdx = headers.indexOf("email");
      const senhaIdx = headers.indexOf("senha");
      const nomeIdx = headers.indexOf("nome_completo");
      const matriculaIdx = headers.indexOf("matricula");
      const cargoIdx = headers.indexOf("cargo");
      const lojaIdx = headers.indexOf("loja_id");
      const regionalIdx = headers.indexOf("regional_id");

      // Validar se as colunas obrigatórias existem
      if (emailIdx === -1 || senhaIdx === -1 || nomeIdx === -1) {
        console.warn("Colunas obrigatórias não encontradas no CSV");
        return [];
      }

    const parsed: ParsedUser[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, "").trim());
      const email = values[emailIdx] || "";
      const password = values[senhaIdx] || "";
      const full_name = values[nomeIdx] || "";
      const enrollment_number = matriculaIdx >= 0 && values[matriculaIdx] ? values[matriculaIdx].trim() : "";
      const role = cargoIdx >= 0 && values[cargoIdx] ? values[cargoIdx].toLowerCase().trim() : "";
      const store_id = lojaIdx >= 0 && values[lojaIdx] ? values[lojaIdx] : "";
      const regional_id = regionalIdx >= 0 && values[regionalIdx] ? values[regionalIdx] : "";

      const errors: string[] = [];
      let isValid = true;

      // Validar campos obrigatórios
      if (!email) {
        errors.push("Email é obrigatório");
        isValid = false;
      }
      if (!password) {
        errors.push("Senha é obrigatória");
        isValid = false;
      }
      if (!full_name) {
        errors.push("Nome completo é obrigatório");
        isValid = false;
      }
      if (!enrollment_number) {
        errors.push("Matrícula é obrigatória");
        isValid = false;
      }
      if (!role) {
        errors.push("Cargo é obrigatório");
        isValid = false;
      } else if (!["admin", "leader", "user"].includes(role)) {
        errors.push("Cargo inválido. Use: admin, leader ou user");
        isValid = false;
      }

      parsed.push({
        email,
        password: "••••••••", // Não mostrar senha na pré-visualização
        full_name,
        enrollment_number,
        role,
        store_id: store_id || undefined,
        regional_id: regional_id || undefined,
        errors: errors.length > 0 ? errors : undefined,
        isValid,
      });
    }

      return parsed;
    } catch (error) {
      console.error("Erro ao parsear CSV:", error);
      return [];
    }
  }, [csvData]);

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

    // Verificar se há dados válidos para processar
    if (parsedData.length === 0) {
      toast.error("Nenhum dado válido encontrado no CSV");
      return;
    }

    if (parsedData.some((p) => !p.isValid)) {
      toast.error("Corrija os erros antes de processar");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const result = await createUsersFromCSV(csvData);
      setResult(result);
      
      if (result.errors.length === 0 && result.success > 0) {
        toast.success(`✅ ${result.success} usuário(s) cadastrado(s) e salvo(s) no banco de dados com sucesso!`);
        setTimeout(() => navigate("/users"), 2000);
      } else if (result.success > 0) {
        toast.warning(`⚠️ ${result.success} usuário(s) salvo(s), ${result.errors.length} erro(s) encontrado(s)`);
      } else if (result.errors.length > 0) {
        toast.error(`❌ Nenhum usuário foi salvo no banco. ${result.errors.length} erro(s) encontrado(s)`);
      } else {
        toast.error("❌ Nenhum dado válido encontrado para processar");
      }
    } catch (error: any) {
      console.error("Erro ao processar CSV:", error);
      toast.error(error.message || "Erro ao processar CSV. Verifique o console para mais detalhes.");
      
      // Mostrar erro detalhado no console
      if (error.message) {
        console.error("Detalhes do erro:", error.message);
      }
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
              Faça upload de um arquivo CSV ou cole os dados abaixo.
              <br />
              <br />
              <code className="text-xs bg-muted p-1 rounded">
                email,senha,nome_completo,matricula,cargo,loja_id,regional_id
              </code>
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Campos obrigatórios: email, senha, nome_completo, matricula, cargo
                <br />
                Campos opcionais: loja_id, regional_id
                <br />
                Cargo deve ser: admin, leader ou user
              </span>
              <div className="mt-3 p-2 bg-info/10 border border-info/20 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-info">
                    <strong>Importante:</strong> Certifique-se de que a confirmação de email está desabilitada no Supabase (Authentication → Settings). 
                    Caso contrário, os usuários não serão ativados automaticamente.
                  </div>
                </div>
              </div>
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
                placeholder="email,senha,nome_completo,matricula,cargo,loja_id,regional_id&#10;joao@exemplo.com,senha123,João Silva,MAT-001,user,LOJA-001,REG-001&#10;maria@exemplo.com,senha456,Maria Santos,MAT-002,leader,LOJA-002,REG-001&#10;pedro@exemplo.com,senha789,Pedro Costa,MAT-003,admin,LOJA-001,REG-001"
                className="w-full min-h-[200px] p-3 border rounded-md font-mono text-sm"
              />
            </div>

            {/* Mensagem de erro se CSV não puder ser parseado */}
            {csvData.trim() && parsedData.length === 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-semibold text-warning">
                    Não foi possível processar o CSV. Verifique o formato.
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Certifique-se de que o CSV contém o cabeçalho correto e pelo menos uma linha de dados.
                  <br />
                  Formato esperado: email,senha,nome_completo,matricula,cargo,loja_id,regional_id
                </p>
              </div>
            )}

            {/* Tabela de Pré-visualização */}
            {parsedData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Pré-visualização dos dados ({parsedData.length} usuário(s))
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{parsedData.filter((p) => p.isValid).length} válido(s)</span>
                    </div>
                    {parsedData.some((p) => !p.isValid) && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span>{parsedData.filter((p) => !p.isValid).length} com erro(s)</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold border-b">Email</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Nome</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Matrícula</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Cargo</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Loja</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Regional</th>
                          <th className="px-3 py-2 text-left font-semibold border-b">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map((user, idx) => (
                          <tr
                            key={idx}
                            className={`border-b hover:bg-muted/50 ${
                              !user.isValid ? "bg-destructive/5" : ""
                            }`}
                          >
                            <td className="px-3 py-2">{user.email || "-"}</td>
                            <td className="px-3 py-2">{user.full_name || "-"}</td>
                            <td className="px-3 py-2">{user.enrollment_number || "-"}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                {user.role || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2">{user.store_id || "-"}</td>
                            <td className="px-3 py-2">{user.regional_id || "-"}</td>
                            <td className="px-3 py-2">
                              {user.isValid ? (
                                <div className="flex items-center gap-1 text-success text-xs">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Válido</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-destructive text-xs">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Erro</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {parsedData.some((p) => p.errors && p.errors.length > 0) && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-destructive">Erros encontrados:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-destructive space-y-1 ml-2">
                      {parsedData.map((user, idx) =>
                        user.errors?.map((error, errorIdx) => (
                          <li key={`${idx}-${errorIdx}`}>
                            Linha {idx + 2} ({user.email || "sem email"}): {error}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-primary hover-glow hover-lift text-white shadow-elevated"
                disabled={isLoading || !csvData.trim() || parsedData.length === 0 || parsedData.some((p) => !p.isValid)}
              >
                {isLoading ? "Processando..." : parsedData.some((p) => !p.isValid) ? "Corrija os erros antes de processar" : "Processar e Salvar no Banco"}
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
                <li><code>matricula</code> - Número de matrícula (único, obrigatório)</li>
                <li><code>cargo</code> - Cargo do usuário (admin, leader ou user)</li>
              </ul>
              <p className="font-semibold mt-4">Colunas opcionais:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><code>loja_id</code> - ID da loja</li>
                <li><code>regional_id</code> - ID regional</li>
              </ul>
              <p className="mt-4 font-semibold">Exemplo:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`email,senha,nome_completo,matricula,cargo,loja_id,regional_id
joao@exemplo.com,senha123,João Silva,MAT-001,user,LOJA-001,REG-001
maria@exemplo.com,senha456,Maria Santos,MAT-002,leader,LOJA-002,REG-001
pedro@exemplo.com,senha789,Pedro Costa,MAT-003,admin,LOJA-001,REG-001`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

