import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  Profile, 
  DailyPerformance, 
  UserWithPerformance,
  Training,
  TrainingQuiz,
  TrainingRoleAssignment,
  TrainingWithDetails,
  TrainingScope,
  TrainingStatus,
  AppRole
} from "./types";
import { toast } from "sonner";

interface GerenciadorContextType {
  users: UserWithPerformance[];
  isLoading: boolean;
  createUser: (userData: {
    email: string;
    password: string;
    full_name: string;
    enrollment_number?: string;
    role?: AppRole;
    store_id?: string;
    regional_id?: string;
  }) => Promise<void>;
  createUsersFromCSV: (csvData: string) => Promise<{ success: number; errors: string[] }>;
  updateUser: (userId: string, updates: Partial<Profile>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addPerformance: (performance: {
    user_id: string;
    date: string;
    sales_target: number;
    sales_current: number;
    average_ticket: number;
    nps: number;
    conversion_rate: number;
  }) => Promise<void>;
  addPerformancesFromCSV: (csvData: string) => Promise<{ success: number; errors: string[] }>;
  updatePerformance: (performanceId: string, updates: Partial<DailyPerformance>) => Promise<void>;
  // Treinamentos
  trainings: TrainingWithDetails[];
  isLoadingTrainings: boolean;
  createTraining: (training: {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    duration_minutes?: number;
    reward_coins: number;
    scope: TrainingScope;
    scope_id?: string;
    status: TrainingStatus;
    quizzes: Omit<TrainingQuiz, "id" | "training_id" | "created_at" | "updated_at">[];
    roles: AppRole[];
  }) => Promise<void>;
  updateTraining: (trainingId: string, updates: Partial<Training>) => Promise<void>;
  deleteTraining: (trainingId: string) => Promise<void>;
  updateTrainingQuizzes: (trainingId: string, quizzes: Omit<TrainingQuiz, "id" | "training_id" | "created_at" | "updated_at">[]) => Promise<void>;
  updateTrainingRoles: (trainingId: string, roles: AppRole[]) => Promise<void>;
  uploadVideo: (file: File) => Promise<string>; // Retorna a URL pública do vídeo
  uploadThumbnail: (file: File) => Promise<string>; // Retorna a URL pública da thumbnail
}

const GerenciadorContext = createContext<GerenciadorContextType | undefined>(undefined);

export function GerenciadorProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Buscar todos os usuários
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      if (!supabase) return [];
      
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar última performance e role de cada usuário
      const usersWithPerformance: UserWithPerformance[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [performanceResult, roleResult] = await Promise.all([
            supabase
              .from("daily_performance")
              .select("*")
              .eq("user_id", profile.id)
              .order("date", { ascending: false })
              .limit(1)
              .single(),
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .limit(1)
              .maybeSingle(),
          ]);

          return {
            ...profile,
            latest_performance: performanceResult.data || undefined,
            role: roleResult.data?.role || undefined,
          };
        })
      );

      return usersWithPerformance;
    },
    enabled: !!supabase,
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });

  // Criar usuário
  // NOTA: Em produção, isso deve ser feito via backend com Service Role Key
  // Por enquanto, usamos signUp normal (requer confirmação de email)
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      full_name: string;
      enrollment_number: string; // Obrigatório
      role: AppRole; // Obrigatório
      store_id?: string;
      regional_id?: string;
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      // Validar campos obrigatórios
      if (!userData.enrollment_number || !userData.enrollment_number.trim()) {
        throw new Error("Matrícula é obrigatória");
      }

      if (!userData.role) {
        throw new Error("Cargo é obrigatório");
      }

      // Validar matrícula única
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("enrollment_number", userData.enrollment_number.trim())
        .maybeSingle();

      if (existingProfile) {
        throw new Error("Matrícula já cadastrada");
      }

      // Criar usuário no auth (signUp normal)
      // NOTA: Para funcionar, a confirmação de email deve estar desabilitada no Supabase
      // Authentication → Settings → Desabilitar "Enable email confirmations"
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
          },
          emailRedirectTo: undefined, // Não redirecionar após confirmação
        },
      });

      if (authError) {
        console.error("Erro ao criar usuário no auth:", authError);
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }
      
      if (!authData.user) {
        throw new Error("Falha ao criar usuário: usuário não foi retornado pelo Supabase");
      }

      // Verificar se o usuário foi criado mas está pendente de confirmação
      if (authData.user && !authData.session) {
        console.warn(`Usuário ${userData.email} criado mas pode estar pendente de confirmação de email`);
        // Continuar mesmo assim, pois o perfil pode ser criado
      }

      // Criar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: userData.full_name,
          enrollment_number: userData.enrollment_number.trim(),
          store_id: userData.store_id || null,
          regional_id: userData.regional_id || null,
          avatar_initials: userData.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        });

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError);
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }

      // Criar role do usuário (obrigatório)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: userData.role,
        });

      if (roleError) {
        console.error("Erro ao criar role:", roleError);
        throw new Error(`Erro ao criar role: ${roleError.message}`);
      }

      console.log(`Usuário ${userData.email} criado com sucesso (ID: ${authData.user.id})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("✅ Usuário criado e salvo no banco de dados com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro completo ao criar usuário:", error);
      toast.error(`❌ Erro ao salvar usuário no banco: ${error.message || "Erro desconhecido"}`);
    },
  });

  // Atualizar usuário
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("✅ Usuário atualizado e salvo no banco de dados com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(`❌ Erro ao atualizar usuário no banco: ${error.message || "Erro desconhecido"}`);
    },
  });

  // Deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!supabase) throw new Error("Supabase não configurado");

      // Deletar perfil (cascade deleta o usuário do auth)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário deletado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar usuário");
    },
  });

  // Adicionar performance
  const addPerformanceMutation = useMutation({
    mutationFn: async (performance: {
      user_id: string;
      date: string;
      sales_target: number;
      sales_current: number;
      average_ticket: number;
      nps: number;
      conversion_rate: number;
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      // Validar dados antes de salvar
      if (!performance.user_id) {
        throw new Error("ID do usuário é obrigatório");
      }
      if (!performance.date) {
        throw new Error("Data é obrigatória");
      }

      const { error, data } = await supabase
        .from("daily_performance")
        .upsert(
          {
            user_id: performance.user_id,
            record_date: performance.date,
            sales_target: performance.sales_target,
            sales_current: performance.sales_current,
            average_ticket: performance.average_ticket,
            nps: performance.nps,
            conversion_rate: performance.conversion_rate,
          },
          {
            onConflict: "user_id,record_date",
          }
        )
        .select()
        .single();

      if (error) {
        console.error("Erro ao salvar indicadores no banco:", error);
        throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
      }

      console.log("Indicadores salvos com sucesso:", data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("✅ Indicadores salvos com sucesso no banco de dados!");
    },
    onError: (error: any) => {
      console.error("Erro ao salvar indicadores:", error);
      toast.error(`❌ Erro ao salvar indicadores: ${error.message || "Erro desconhecido"}`);
    },
  });

  // Atualizar performance
  const updatePerformanceMutation = useMutation({
    mutationFn: async ({
      performanceId,
      updates,
    }: {
      performanceId: string;
      updates: Partial<DailyPerformance>;
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      if (!performanceId) {
        throw new Error("ID do registro é obrigatório");
      }

      const { error, data } = await supabase
        .from("daily_performance")
        .update(updates)
        .eq("id", performanceId)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar indicadores no banco:", error);
        throw new Error(`Erro ao atualizar no banco de dados: ${error.message}`);
      }

      console.log("Indicadores atualizados com sucesso:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("✅ Indicadores atualizados com sucesso no banco de dados!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar indicadores:", error);
      toast.error(`❌ Erro ao atualizar indicadores: ${error.message || "Erro desconhecido"}`);
    },
  });

  const createUser = async (userData: {
    email: string;
    password: string;
    full_name: string;
    store_id?: string;
    regional_id?: string;
  }) => {
    await createUserMutation.mutateAsync(userData);
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    await updateUserMutation.mutateAsync({ userId, updates });
  };

  const deleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId);
  };

  const addPerformance = async (performance: {
    user_id: string;
    date: string;
    sales_target: number;
    sales_current: number;
    average_ticket: number;
    nps: number;
    conversion_rate: number;
  }) => {
    await addPerformanceMutation.mutateAsync(performance);
  };

  const updatePerformance = async (performanceId: string, updates: Partial<DailyPerformance>) => {
    await updatePerformanceMutation.mutateAsync({ performanceId, updates });
  };

  // Processar CSV de usuários
  const createUsersFromCSV = async (csvData: string): Promise<{ success: number; errors: string[] }> => {
    if (!supabase) throw new Error("Supabase não configurado");

    const lines = csvData.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV deve ter pelo menos um cabeçalho e uma linha de dados");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const emailIdx = headers.indexOf("email");
    const senhaIdx = headers.indexOf("senha");
    const nomeIdx = headers.indexOf("nome_completo");
    const matriculaIdx = headers.indexOf("matricula");
    const cargoIdx = headers.indexOf("cargo");
    const lojaIdx = headers.indexOf("loja_id");
    const regionalIdx = headers.indexOf("regional_id");

    if (emailIdx === -1 || senhaIdx === -1 || nomeIdx === -1) {
      throw new Error("CSV deve conter as colunas: email, senha, nome_completo");
    }

    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const email = values[emailIdx];
      const password = values[senhaIdx];
      const full_name = values[nomeIdx];
      const enrollment_number = matriculaIdx >= 0 && values[matriculaIdx] ? values[matriculaIdx].trim() : undefined;
      const role = cargoIdx >= 0 && values[cargoIdx] ? (values[cargoIdx].toLowerCase().trim() as "admin" | "leader" | "user") : undefined;
      const store_id = lojaIdx >= 0 && values[lojaIdx] ? values[lojaIdx] : undefined;
      const regional_id = regionalIdx >= 0 && values[regionalIdx] ? values[regionalIdx] : undefined;

      // Validar campos obrigatórios
      if (!email || !password || !full_name) {
        errors.push(`Linha ${i + 1}: Campos obrigatórios faltando (email, senha, nome_completo)`);
        continue;
      }

      if (!enrollment_number || !enrollment_number.trim()) {
        errors.push(`Linha ${i + 1} (${email}): Matrícula é obrigatória`);
        continue;
      }

      if (!role) {
        errors.push(`Linha ${i + 1} (${email}): Cargo é obrigatório`);
        continue;
      }

      // Validar cargo
      if (!["admin", "leader", "user"].includes(role)) {
        errors.push(`Linha ${i + 1} (${email}): Cargo inválido. Use: admin, leader ou user`);
        continue;
      }

      try {
        await createUser({
          email,
          password,
          full_name,
          enrollment_number,
          role,
          store_id,
          regional_id,
        });
        success++;
        console.log(`✓ Usuário ${email} cadastrado com sucesso`);
      } catch (error: any) {
        const errorMessage = error.message || "Erro desconhecido";
        errors.push(`Linha ${i + 1} (${email}): ${errorMessage}`);
        console.error(`✗ Erro ao cadastrar ${email}:`, errorMessage, error);
      }
    }

    return { success, errors };
  };

  // Processar CSV de vendas/indicadores
  const addPerformancesFromCSV = async (csvData: string): Promise<{ success: number; errors: string[] }> => {
    if (!supabase) throw new Error("Supabase não configurado");

    const lines = csvData.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV deve ter pelo menos um cabeçalho e uma linha de dados");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const emailIdx = headers.indexOf("email");
    const nomeIdx = headers.indexOf("nome");
    const dataIdx = headers.indexOf("data");
    const metaIdx = headers.indexOf("meta_vendas");
    const vendasIdx = headers.indexOf("vendas_atuais");
    const ticketIdx = headers.indexOf("ticket_medio");
    const npsIdx = headers.indexOf("nps");
    const conversaoIdx = headers.indexOf("taxa_conversao");

    if (
      emailIdx === -1 ||
      nomeIdx === -1 ||
      dataIdx === -1 ||
      metaIdx === -1 ||
      vendasIdx === -1 ||
      ticketIdx === -1 ||
      npsIdx === -1 ||
      conversaoIdx === -1
    ) {
      throw new Error(
        "CSV deve conter todas as colunas: email, nome, data, meta_vendas, vendas_atuais, ticket_medio, nps, taxa_conversao"
      );
    }

    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const email = values[emailIdx];
      const nome = values[nomeIdx];
      const date = values[dataIdx];
      const sales_target = parseFloat(values[metaIdx]) || 0;
      const sales_current = parseFloat(values[vendasIdx]) || 0;
      const average_ticket = parseFloat(values[ticketIdx]) || 0;
      const nps = parseInt(values[npsIdx]) || 0;
      const conversion_rate = parseFloat(values[conversaoIdx]) || 0;

      if (!email || !date) {
        errors.push(`Linha ${i + 1}: Email e data são obrigatórios`);
        continue;
      }

      try {
        // Buscar usuário por email no auth.users primeiro
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          errors.push(`Linha ${i + 1} (${email}): Erro ao buscar usuários`);
          continue;
        }

        const authUser = authUsers?.users.find((u) => u.email === email);
        if (!authUser) {
          errors.push(`Linha ${i + 1} (${email}): Usuário não encontrado`);
          continue;
        }

        // Verificar se o perfil existe
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authUser.id)
          .single();

        if (profileError || !profile) {
          errors.push(`Linha ${i + 1} (${email}): Perfil não encontrado`);
          continue;
        }

        await addPerformance({
          user_id: profile.id,
          date,
          sales_target,
          sales_current,
          average_ticket,
          nps,
          conversion_rate,
        });
        success++;
        console.log(`✓ Indicadores de ${email} (${date}) salvos com sucesso`);
      } catch (error: any) {
        const errorMessage = error.message || "Erro desconhecido";
        errors.push(`Linha ${i + 1} (${email}): ${errorMessage}`);
        console.error(`✗ Erro ao salvar indicadores de ${email}:`, errorMessage, error);
      }
    }

    return { success, errors };
  };

  // ============================================
  // TREINAMENTOS
  // ============================================

  // Função auxiliar para criar assignments de usuários
  const createUserAssignmentsForTraining = async (
    trainingId: string,
    scope: TrainingScope,
    scopeId: string | undefined,
    roles: AppRole[]
  ) => {
    if (!supabase) return;

    // Buscar usuários que atendem aos critérios
    let profilesQuery = supabase.from("profiles").select("id");

    // Filtrar por escopo
    if (scope === "store" && scopeId) {
      profilesQuery = profilesQuery.eq("store_id", scopeId);
    } else if (scope === "regional" && scopeId) {
      profilesQuery = profilesQuery.eq("regional_id", scopeId);
    }
    // Se scope === "company", não filtra por loja/regional

    const { data: profiles } = await profilesQuery;

    if (!profiles || profiles.length === 0) return;

    // Filtrar por roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", roles);

    const userIdsWithRole = new Set((userRoles || []).map((ur) => ur.user_id));
    const eligibleUserIds = profiles
      .map((p) => p.id)
      .filter((id) => userIdsWithRole.has(id));

    if (eligibleUserIds.length === 0) return;

    // Criar assignments
    const assignmentsToInsert = eligibleUserIds.map((userId) => ({
      training_id: trainingId,
      user_id: userId,
      status: "assigned" as const,
    }));

    await supabase.from("training_user_assignments").insert(assignmentsToInsert);
  };

  // Buscar todos os treinamentos
  const { data: trainings = [], isLoading: isLoadingTrainings } = useQuery({
    queryKey: ["trainings"],
    queryFn: async (): Promise<TrainingWithDetails[]> => {
      if (!supabase) return [];

      const { data: trainingsData, error } = await supabase
        .from("trainings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Buscar quizzes e role assignments para cada treinamento
      const trainingsWithDetails: TrainingWithDetails[] = await Promise.all(
        (trainingsData || []).map(async (training) => {
          // Buscar quizzes
          const { data: quizzes } = await supabase
            .from("training_quizzes")
            .select("*")
            .eq("training_id", training.id)
            .order("order_index");

          // Buscar role assignments
          const { data: roleAssignments } = await supabase
            .from("training_role_assignments")
            .select("*")
            .eq("training_id", training.id);

          // Contar assignments de usuários
          const { count: userAssignmentsCount } = await supabase
            .from("training_user_assignments")
            .select("*", { count: "exact", head: true })
            .eq("training_id", training.id);

          const { count: completedAssignmentsCount } = await supabase
            .from("training_user_assignments")
            .select("*", { count: "exact", head: true })
            .eq("training_id", training.id)
            .eq("status", "completed");

          return {
            ...training,
            quizzes: (quizzes || []).map((q) => ({
              ...q,
              options: Array.isArray(q.options) ? q.options : [],
            })) as TrainingQuiz[],
            role_assignments: (roleAssignments || []) as TrainingRoleAssignment[],
            user_assignments_count: userAssignmentsCount || 0,
            completed_assignments_count: completedAssignmentsCount || 0,
          };
        })
      );

      return trainingsWithDetails;
    },
    enabled: !!supabase,
    refetchInterval: 30000,
  });

  // Criar treinamento
  const createTrainingMutation = useMutation({
    mutationFn: async (trainingData: {
      title: string;
      description?: string;
      video_url: string;
      thumbnail_url?: string;
      duration_minutes?: number;
      reward_coins: number;
      scope: TrainingScope;
      scope_id?: string;
      status: TrainingStatus;
      quizzes: Omit<TrainingQuiz, "id" | "training_id" | "created_at" | "updated_at">[];
      roles: AppRole[];
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar treinamento
      const { data: training, error: trainingError } = await supabase
        .from("trainings")
        .insert({
          title: trainingData.title,
          description: trainingData.description || null,
          video_url: trainingData.video_url,
          thumbnail_url: trainingData.thumbnail_url || null,
          duration_minutes: trainingData.duration_minutes || null,
          reward_coins: trainingData.reward_coins,
          scope: trainingData.scope,
          scope_id: trainingData.scope_id || null,
          status: trainingData.status,
          created_by: user.id,
        })
        .select()
        .single();

      if (trainingError) throw trainingError;
      if (!training) throw new Error("Falha ao criar treinamento");

      // Criar quizzes
      if (trainingData.quizzes.length > 0) {
        const quizzesToInsert = trainingData.quizzes.map((q, index) => ({
          training_id: training.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          order_index: index,
        }));

        const { error: quizzesError } = await supabase
          .from("training_quizzes")
          .insert(quizzesToInsert);

        if (quizzesError) throw quizzesError;
      }

      // Criar role assignments
      if (trainingData.roles.length > 0) {
        const roleAssignmentsToInsert = trainingData.roles.map((role) => ({
          training_id: training.id,
          role,
        }));

        const { error: rolesError } = await supabase
          .from("training_role_assignments")
          .insert(roleAssignmentsToInsert);

        if (rolesError) throw rolesError;
      }

      // Se o status for 'active', criar assignments para usuários que atendem aos critérios
      if (trainingData.status === "active") {
        await createUserAssignmentsForTraining(training.id, trainingData.scope, trainingData.scope_id, trainingData.roles);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Treinamento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar treinamento");
    },
  });

  // Atualizar treinamento
  const updateTrainingMutation = useMutation({
    mutationFn: async ({ trainingId, updates }: { trainingId: string; updates: Partial<Training> }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      const { error } = await supabase
        .from("trainings")
        .update(updates)
        .eq("id", trainingId);

      if (error) throw error;

      // Se status mudou para 'active', criar assignments
      if (updates.status === "active") {
        const { data: training } = await supabase
          .from("trainings")
          .select("scope, scope_id")
          .eq("id", trainingId)
          .single();

        if (training) {
          const { data: roleAssignments } = await supabase
            .from("training_role_assignments")
            .select("role")
            .eq("training_id", trainingId);

          const roles = (roleAssignments || []).map((ra) => ra.role) as AppRole[];
          await createUserAssignmentsForTraining(trainingId, training.scope, training.scope_id, roles);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Treinamento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar treinamento");
    },
  });

  // Deletar treinamento
  const deleteTrainingMutation = useMutation({
    mutationFn: async (trainingId: string) => {
      if (!supabase) throw new Error("Supabase não configurado");

      const { error } = await supabase
        .from("trainings")
        .delete()
        .eq("id", trainingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Treinamento deletado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar treinamento");
    },
  });

  // Atualizar quizzes de um treinamento
  const updateTrainingQuizzesMutation = useMutation({
    mutationFn: async ({
      trainingId,
      quizzes,
    }: {
      trainingId: string;
      quizzes: Omit<TrainingQuiz, "id" | "training_id" | "created_at" | "updated_at">[];
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      // Deletar quizzes existentes
      await supabase.from("training_quizzes").delete().eq("training_id", trainingId);

      // Inserir novos quizzes
      if (quizzes.length > 0) {
        const quizzesToInsert = quizzes.map((q, index) => ({
          training_id: trainingId,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          order_index: index,
        }));

        const { error } = await supabase.from("training_quizzes").insert(quizzesToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Quizzes atualizados com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar quizzes");
    },
  });

  // Atualizar roles de um treinamento
  const updateTrainingRolesMutation = useMutation({
    mutationFn: async ({ trainingId, roles }: { trainingId: string; roles: AppRole[] }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      // Deletar role assignments existentes
      await supabase.from("training_role_assignments").delete().eq("training_id", trainingId);

      // Inserir novos role assignments
      if (roles.length > 0) {
        const roleAssignmentsToInsert = roles.map((role) => ({
          training_id: trainingId,
          role,
        }));

        const { error } = await supabase.from("training_role_assignments").insert(roleAssignmentsToInsert);
        if (error) throw error;
      }

      // Se o treinamento estiver ativo, atualizar assignments de usuários
      const { data: training } = await supabase
        .from("trainings")
        .select("status, scope, scope_id")
        .eq("id", trainingId)
        .single();

      if (training && training.status === "active") {
        // Deletar assignments existentes e recriar
        await supabase.from("training_user_assignments").delete().eq("training_id", trainingId);
        await createUserAssignmentsForTraining(trainingId, training.scope, training.scope_id, roles);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Cargos atualizados com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar cargos");
    },
  });

  const createTraining = async (trainingData: {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    duration_minutes?: number;
    reward_coins: number;
    scope: TrainingScope;
    scope_id?: string;
    status: TrainingStatus;
    quizzes: Omit<TrainingQuiz, "id" | "training_id" | "created_at" | "updated_at">[];
    roles: AppRole[];
  }) => {
    await createTrainingMutation.mutateAsync(trainingData);
  };

  const updateTraining = async (trainingId: string, updates: Partial<Training>) => {
    await updateTrainingMutation.mutateAsync({ trainingId, updates });
  };

  const deleteTraining = async (trainingId: string) => {
    await deleteTrainingMutation.mutateAsync(trainingId);
  };

  const updateTrainingQuizzes = async (
    trainingId: string,
    quizzes: Omit<TrainingQuiz, "id" | "training_id" | "created_at" | "updated_at">[]
  ) => {
    await updateTrainingQuizzesMutation.mutateAsync({ trainingId, quizzes });
  };

  const updateTrainingRoles = async (trainingId: string, roles: AppRole[]) => {
    await updateTrainingRolesMutation.mutateAsync({ trainingId, roles });
  };

  // Upload de vídeo para Supabase Storage
  const uploadVideo = async (file: File): Promise<string> => {
    if (!supabase) throw new Error("Supabase não configurado");

    // Validar tipo de arquivo
    if (!file.type.startsWith("video/")) {
      throw new Error("O arquivo deve ser um vídeo");
    }

    // Validar tamanho (máximo 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      throw new Error("O arquivo de vídeo deve ter no máximo 500MB");
    }

    // Criar nome único para o arquivo
    const fileExt = file.name.split(".").pop() || "mp4";
    const fileName = `trainings/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Fazer upload
    const { data, error } = await supabase.storage
      .from("trainings")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      // Se o bucket não existir, tentar criar
      if (error.message.includes("Bucket not found")) {
        throw new Error("Bucket 'trainings' não encontrado. Crie o bucket no Supabase Storage primeiro.");
      }
      throw error;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from("trainings")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  // Upload de thumbnail para Supabase Storage
  const uploadThumbnail = async (file: File): Promise<string> => {
    if (!supabase) throw new Error("Supabase não configurado");

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      throw new Error("O arquivo deve ser uma imagem");
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("A imagem deve ter no máximo 5MB");
    }

    // Criar nome único para o arquivo
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `trainings/thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Fazer upload
    const { data, error } = await supabase.storage
      .from("trainings")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      if (error.message.includes("Bucket not found")) {
        throw new Error("Bucket 'trainings' não encontrado. Crie o bucket no Supabase Storage primeiro.");
      }
      throw error;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from("trainings")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  return (
    <GerenciadorContext.Provider
      value={{
        users,
        isLoading,
        createUser,
        createUsersFromCSV,
        updateUser,
        deleteUser,
        addPerformance,
        addPerformancesFromCSV,
        updatePerformance,
        trainings,
        isLoadingTrainings,
        createTraining,
        updateTraining,
        deleteTraining,
        updateTrainingQuizzes,
        updateTrainingRoles,
        uploadVideo,
        uploadThumbnail,
      }}
    >
      {children}
    </GerenciadorContext.Provider>
  );
}

export function useGerenciador() {
  const context = useContext(GerenciadorContext);
  if (context === undefined) {
    throw new Error("useGerenciador must be used within a GerenciadorProvider");
  }
  return context;
}

