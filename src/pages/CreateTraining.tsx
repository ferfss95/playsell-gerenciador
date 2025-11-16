import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGerenciador } from "@/contexts/GerenciadorContext";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Video, Coins, Users, Building2, MapPin, Globe, Upload, X, Image as ImageIcon } from "lucide-react";
import { TrainingScope, TrainingStatus, AppRole, TrainingQuiz } from "@/contexts/types";
import { toast } from "sonner";

interface QuizForm {
  question: string;
  options: string[];
  correct_answer: number;
}

export default function CreateTraining() {
  const { trainings, createTraining, updateTraining, updateTrainingQuizzes, updateTrainingRoles, uploadVideo, uploadThumbnail } = useGerenciador();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const existingTraining = isEditing ? trainings.find((t) => t.id === id) : null;

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_minutes: "",
    reward_coins: "0",
    scope: "company" as TrainingScope,
    scope_id: "",
    status: "draft" as TrainingStatus,
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [quizzes, setQuizzes] = useState<QuizForm[]>([]);

  // Buscar lojas e regionais únicas dos usuários
  const { users } = useGerenciador();
  const stores = Array.from(new Set(users.map((u) => u.store_id).filter(Boolean))) as string[];
  const regionals = Array.from(new Set(users.map((u) => u.regional_id).filter(Boolean))) as string[];

  useEffect(() => {
    if (existingTraining) {
      setFormData({
        title: existingTraining.title,
        description: existingTraining.description || "",
        video_url: existingTraining.video_url,
        thumbnail_url: existingTraining.thumbnail_url || "",
        duration_minutes: existingTraining.duration_minutes?.toString() || "",
        reward_coins: existingTraining.reward_coins.toString(),
        scope: existingTraining.scope,
        scope_id: existingTraining.scope_id || "",
        status: existingTraining.status,
      });
      setSelectedRoles(existingTraining.role_assignments.map((ra) => ra.role));
      setQuizzes(
        existingTraining.quizzes.map((q) => ({
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
        }))
      );
      // Se já tem vídeo, mostrar preview
      if (existingTraining.video_url) {
        setVideoPreview(existingTraining.video_url);
      }
      if (existingTraining.thumbnail_url) {
        setThumbnailPreview(existingTraining.thumbnail_url);
      }
    }
  }, [existingTraining]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }

    // Validar tamanho (máximo 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("O arquivo de vídeo deve ter no máximo 500MB");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const handleAddQuiz = () => {
    setQuizzes([
      ...quizzes,
      {
        question: "",
        options: ["", "", "", ""],
        correct_answer: 0,
      },
    ]);
  };

  const handleRemoveQuiz = (index: number) => {
    setQuizzes(quizzes.filter((_, i) => i !== index));
  };

  const handleQuizChange = (index: number, field: keyof QuizForm, value: any) => {
    const updated = [...quizzes];
    if (field === "options") {
      updated[index].options = value;
    } else {
      (updated[index] as any)[field] = value;
    }
    setQuizzes(updated);
  };

  const handleOptionChange = (quizIndex: number, optionIndex: number, value: string) => {
    const updated = [...quizzes];
    updated[quizIndex].options[optionIndex] = value;
    setQuizzes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Preencha o título do treinamento");
      return;
    }

    if (!videoFile && !formData.video_url && !isEditing) {
      toast.error("Selecione um arquivo de vídeo ou forneça uma URL");
      return;
    }

    if (selectedRoles.length === 0) {
      toast.error("Selecione pelo menos um cargo");
      return;
    }

    // Validar quizzes
    for (let i = 0; i < quizzes.length; i++) {
      const quiz = quizzes[i];
      if (!quiz.question.trim()) {
        toast.error(`Questão ${i + 1}: Preencha a pergunta`);
        return;
      }
      if (quiz.options.some((opt) => !opt.trim())) {
        toast.error(`Questão ${i + 1}: Preencha todas as opções`);
        return;
      }
      if (quiz.correct_answer < 0 || quiz.correct_answer >= quiz.options.length) {
        toast.error(`Questão ${i + 1}: Selecione uma resposta correta válida`);
        return;
      }
    }

    setIsUploading(true);

    try {
      let finalVideoUrl = formData.video_url;
      let finalThumbnailUrl = formData.thumbnail_url;

      // Fazer upload do vídeo se houver arquivo novo
      if (videoFile) {
        toast.info("Fazendo upload do vídeo...");
        finalVideoUrl = await uploadVideo(videoFile);
        toast.success("Vídeo enviado com sucesso!");
      }

      // Fazer upload da thumbnail se houver arquivo novo
      if (thumbnailFile) {
        toast.info("Fazendo upload da thumbnail...");
        finalThumbnailUrl = await uploadThumbnail(thumbnailFile);
        toast.success("Thumbnail enviada com sucesso!");
      }

      if (isEditing && existingTraining) {
        // Atualizar treinamento
        await updateTraining(existingTraining.id, {
          title: formData.title,
          description: formData.description || null,
          video_url: finalVideoUrl,
          thumbnail_url: finalThumbnailUrl || null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          reward_coins: parseInt(formData.reward_coins),
          scope: formData.scope,
          scope_id: formData.scope_id || null,
          status: formData.status,
        });

        // Atualizar quizzes
        await updateTrainingQuizzes(
          existingTraining.id,
          quizzes.map((q) => ({
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            order_index: 0,
          }))
        );

        // Atualizar roles
        await updateTrainingRoles(existingTraining.id, selectedRoles);

        toast.success("Treinamento atualizado com sucesso!");
      } else {
        // Criar novo treinamento
        await createTraining({
          title: formData.title,
          description: formData.description || undefined,
          video_url: finalVideoUrl,
          thumbnail_url: finalThumbnailUrl || undefined,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
          reward_coins: parseInt(formData.reward_coins),
          scope: formData.scope,
          scope_id: formData.scope_id || undefined,
          status: formData.status,
          quizzes: quizzes.map((q) => ({
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            order_index: 0,
          })),
          roles: selectedRoles,
        });

        toast.success("Treinamento criado com sucesso!");
      }

      navigate("/trainings");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar treinamento");
      console.error("Erro ao salvar treinamento:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header
        title={isEditing ? "Editar Treinamento" : "Novo Treinamento"}
        subtitle={isEditing ? "Atualizar informações do treinamento" : "Criar novo treinamento com vídeo e quiz"}
      />

      <main className="px-4 py-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais do treinamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Técnicas de Fechamento de Vendas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o conteúdo do treinamento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_file">Arquivo de Vídeo *</Label>
                <div className="space-y-2">
                  <input
                    ref={videoInputRef}
                    id="video_file"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                  {videoPreview ? (
                    <div className="relative">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full rounded-lg max-h-64 bg-black"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeVideo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : formData.video_url ? (
                    <div className="relative">
                      <video
                        src={formData.video_url}
                        controls
                        className="w-full rounded-lg max-h-64 bg-black"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Vídeo atual: {formData.video_url.substring(0, 50)}...
                      </p>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo de Vídeo
                    </Button>
                  )}
                  {videoFile && (
                    <p className="text-xs text-muted-foreground">
                      Arquivo: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duração (minutos)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="30"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail_file">Thumbnail (Imagem)</Label>
                <div className="space-y-2">
                  <input
                    ref={thumbnailInputRef}
                    id="thumbnail_file"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                  />
                  {thumbnailPreview ? (
                    <div className="relative">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail"
                        className="w-full rounded-lg max-h-32 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeThumbnail}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : formData.thumbnail_url ? (
                    <div className="relative">
                      <img
                        src={formData.thumbnail_url}
                        alt="Thumbnail atual"
                        className="w-full rounded-lg max-h-32 object-cover"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Thumbnail atual
                      </p>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Selecionar Thumbnail
                    </Button>
                  )}
                  {thumbnailFile && (
                    <p className="text-xs text-muted-foreground">
                      Arquivo: {thumbnailFile.name} ({(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reward_coins">Moedas de Recompensa</Label>
                  <Input
                    id="reward_coins"
                    type="number"
                    value={formData.reward_coins}
                    onChange={(e) => setFormData({ ...formData, reward_coins: e.target.value })}
                    placeholder="100"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as TrainingStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Escopo e Cargos */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Escopo e Cargos</CardTitle>
              <CardDescription>Defina para quem o treinamento será disponibilizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Escopo *</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value) => {
                    setFormData({ ...formData, scope: value as TrainingScope, scope_id: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Todas as Lojas
                      </div>
                    </SelectItem>
                    <SelectItem value="regional">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Regional
                      </div>
                    </SelectItem>
                    <SelectItem value="store">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Loja Específica
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.scope === "store" && (
                <div className="space-y-2">
                  <Label htmlFor="scope_id">Loja</Label>
                  <Select
                    value={formData.scope_id}
                    onValueChange={(value) => setFormData({ ...formData, scope_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store} value={store}>
                          {store}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.scope === "regional" && (
                <div className="space-y-2">
                  <Label htmlFor="scope_id">Regional</Label>
                  <Select
                    value={formData.scope_id}
                    onValueChange={(value) => setFormData({ ...formData, scope_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a regional" />
                    </SelectTrigger>
                    <SelectContent>
                      {regionals.map((regional) => (
                        <SelectItem key={regional} value={regional}>
                          {regional}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cargos *</Label>
                <div className="space-y-3 p-4 border rounded-lg">
                  {(["admin", "leader", "user"] as AppRole[]).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoles([...selectedRoles, role]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((r) => r !== role));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`role-${role}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role === "admin" ? "Administrador" : role === "leader" ? "Líder" : "Usuário"}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quizzes */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quizzes</CardTitle>
                  <CardDescription>Questões de avaliação do treinamento</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddQuiz} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Questão
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizzes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma questão adicionada ainda</p>
                  <p className="text-sm mt-2">Clique em "Adicionar Questão" para começar</p>
                </div>
              ) : (
                quizzes.map((quiz, quizIndex) => (
                  <Card key={quizIndex} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Questão {quizIndex + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuiz(quizIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pergunta *</Label>
                        <Input
                          value={quiz.question}
                          onChange={(e) => handleQuizChange(quizIndex, "question", e.target.value)}
                          placeholder="Digite a pergunta..."
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Opções de Resposta *</Label>
                        {quiz.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <div className="flex-1">
                              <Input
                                value={option}
                                onChange={(e) => handleOptionChange(quizIndex, optionIndex, e.target.value)}
                                placeholder={`Opção ${String.fromCharCode(65 + optionIndex)}`}
                                required
                              />
                            </div>
                            <Checkbox
                              checked={quiz.correct_answer === optionIndex}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleQuizChange(quizIndex, "correct_answer", optionIndex);
                                }
                              }}
                            />
                            <Label className="text-xs text-muted-foreground">Correta</Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/trainings")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary hover-glow hover-lift text-white shadow-elevated"
              disabled={isUploading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isUploading 
                ? "Enviando..." 
                : isEditing 
                  ? "Atualizar" 
                  : "Criar"} Treinamento
            </Button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}

