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
    enrollment_number: string;
    role: AppRole;
    store_id?: string;
    regional_id?: string;
  }) => Promise<void>;
  createUsersFromCSV: (csvData: string) => Promise<{ success: number; errors: string[] }>;
  updateUser: (userId: string, updates: Partial<Profile>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<void>;
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
  // Usa admin.createUser() se Service Role Key estiver disponível, caso contrário usa signUp
  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      full_name: string;
      enrollment_number: string; // Obrigatório
      role: AppRole; // Obrigatório
      store_id?: string;
      regional_id?: string;
      store?: string;
      regional?: string;
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      const email = userData.email.trim().toLowerCase();
      const enrollment_number = userData.enrollment_number.trim();

      // Validar campos obrigatórios
      if (!email || !email.includes("@")) {
        throw new Error("Email inválido");
      }

      // Nota: A senha inicial sempre será a matrícula, então não precisamos validar userData.password
      // Se for fornecido no CSV/formulário, será ignorado em favor da matrícula para padronização
      // A matrícula já foi validada acima

      if (!userData.full_name || !userData.full_name.trim()) {
        throw new Error("Nome completo é obrigatório");
      }

      if (!enrollment_number) {
        throw new Error("Matrícula é obrigatória");
      }

      if (!userData.role) {
        throw new Error("Cargo é obrigatório");
      }

      // Validar email único - verificar no auth.users se email já existe
      let emailExists = false;
      let existingAuthUserId: string | null = null;
      
      if (supabase.auth.admin) {
        try {
          const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
          const emailLower = email.toLowerCase().trim();
          const existingUser = existingAuthUsers?.users.find(u => u.email?.toLowerCase().trim() === emailLower);
          
          if (existingUser) {
            emailExists = true;
            existingAuthUserId = existingUser.id;
            
            // Verificar se já tem perfil
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id, enrollment_number")
              .eq("id", existingUser.id)
              .maybeSingle();
            
            if (existingProfile) {
              // Usuário já está completamente cadastrado
              throw new Error("Usuário já cadastrado completamente no sistema");
            } else {
              // Usuário existe no auth mas não tem perfil - pode tentar criar o perfil
              console.warn(`Usuário ${email} existe no auth mas sem perfil. Tentando criar perfil...`);
              // Não lançar erro aqui - permitir que continue para criar o perfil
            }
          }
        } catch (error: any) {
          // Se já lançou erro acima, re-lançar
          if (error.message.includes("já cadastrado") || error.message.includes("já cadastrado completamente")) {
            throw error;
          }
          console.warn("Não foi possível verificar email no auth, continuando...", error);
        }
      } else {
        console.warn("Admin API não disponível, validação de email duplicado limitada");
      }

      // Validar matrícula única
      const { data: existingProfileByEnrollment } = await supabase
        .from("profiles")
        .select("id")
        .eq("enrollment_number", enrollment_number)
        .maybeSingle();

      if (existingProfileByEnrollment) {
        throw new Error("Matrícula já cadastrada");
      }

      let authUser: any = null;

      // Se já encontramos um usuário existente no auth (sem perfil), usar ele diretamente
      if (existingAuthUserId && emailExists) {
        console.log(`Usando usuário existente no auth: ${existingAuthUserId}`);
        const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingAuthUsers?.users.find(u => u.id === existingAuthUserId);
        if (existingUser) {
          authUser = existingUser;
        }
      }

      // Verificar se está usando Service Role Key (admin API disponível)
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const isServiceRole = !!serviceRoleKey && supabase.auth.admin;

      // Se ainda não temos authUser, tentar criar novo usuário
      if (!authUser && isServiceRole) {
        // Usar admin.createUser() com Service Role Key (recomendado)
        // Senha inicial sempre será a matrícula para permitir primeiro acesso padronizado
        // Se a matrícula for menor que 6 caracteres (mínimo do Supabase), preencher com zeros à esquerda
        let initialPassword = enrollment_number.trim();
        
        // Garantir que a senha tenha no mínimo 6 caracteres (requisito do Supabase Auth)
        // Se a matrícula for menor que 6 caracteres, preencher com zeros à esquerda
        // Exemplo: "1001" -> "001001", "123" -> "000123"
        if (initialPassword.length < 6) {
          initialPassword = initialPassword.padStart(6, '0');
          console.log(`Matrícula ${enrollment_number} foi ajustada para ${initialPassword} para atender requisito mínimo de 6 caracteres`);
        }
        
        try {
          const { data: adminAuthData, error: adminAuthError } = await supabase.auth.admin.createUser({
            email,
            password: initialPassword, // Sempre usar matrícula como senha inicial (ajustada se necessário)
            email_confirm: true, // Confirmar email automaticamente
            user_metadata: {
              full_name: userData.full_name,
            },
          });

          if (adminAuthError) {
            // Se o erro for de usuário já existente, buscar o usuário existente
            if (adminAuthError.message?.toLowerCase().includes("already registered") || 
                adminAuthError.message?.toLowerCase().includes("already exists") ||
                adminAuthError.message?.toLowerCase().includes("user already") ||
                adminAuthError.status === 422) {
              console.warn(`Usuário ${email} já existe no auth, buscando usuário existente...`);
              
              // Buscar o usuário existente
              const { data: existingUsers } = await supabase.auth.admin.listUsers();
              const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
              
              if (existingUser) {
                authUser = existingUser;
                console.log(`Usuário existente encontrado: ${existingUser.id}`);
              } else {
                throw new Error(`Erro: Usuário ${email} já existe mas não foi encontrado na lista.`);
              }
            } else {
              console.error("Erro ao criar usuário com admin API:", adminAuthError);
              throw new Error(`Erro ao criar usuário: ${adminAuthError.message}`);
            }
          } else {
            if (!adminAuthData.user) {
              throw new Error("Falha ao criar usuário: usuário não foi retornado pelo Supabase");
            }
            authUser = adminAuthData.user;
          }
        } catch (adminError: any) {
          // Se já encontrou o usuário existente, não precisa fazer fallback
          if (authUser) {
            console.log("Usando usuário existente encontrado anteriormente");
          } else {
            console.error("Erro ao usar admin API, tentando signUp:", adminError);
            // Fallback para signUp se admin API falhar
            // Senha inicial sempre será a matrícula para permitir primeiro acesso padronizado
            // Se a matrícula for menor que 6 caracteres, preencher com zeros à esquerda
            let initialPassword = enrollment_number.trim();
            
            // Garantir que a senha tenha no mínimo 6 caracteres
            if (initialPassword.length < 6) {
              initialPassword = initialPassword.padStart(6, '0');
            }
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email,
              password: initialPassword, // Sempre usar matrícula como senha inicial (ajustada se necessário)
              options: {
                data: {
                  full_name: userData.full_name,
                },
                emailRedirectTo: undefined,
              },
            });

            if (authError) {
              // Se signUp também falhar por usuário existente, buscar usuário existente
              if (authError.message?.toLowerCase().includes("already registered") || 
                  authError.message?.toLowerCase().includes("already exists") ||
                  authError.message?.toLowerCase().includes("user already")) {
                console.warn(`Usuário ${email} já existe, buscando via admin API...`);
                
                if (supabase.auth.admin) {
                  const { data: existingUsers } = await supabase.auth.admin.listUsers();
                  const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                  
                  if (existingUser) {
                    authUser = existingUser;
                  } else {
                    throw new Error(`Erro: Usuário ${email} já existe mas não foi encontrado.`);
                  }
                } else {
                  throw new Error(`Erro: Usuário ${email} já existe e admin API não está disponível para buscar o usuário.`);
                }
              } else {
                throw new Error(`Erro ao criar usuário: ${authError.message}`);
              }
            } else {
              if (!authData.user) {
                throw new Error("Falha ao criar usuário: usuário não foi retornado pelo Supabase");
              }
              authUser = authData.user;
            }
          }
        }
      } else if (!authUser) {
        // Usar signUp normal apenas se ainda não temos um usuário (requer confirmação de email desabilitada)
        // Senha inicial sempre será a matrícula para permitir primeiro acesso padronizado
        // Se a matrícula for menor que 6 caracteres, preencher com zeros à esquerda
        let initialPassword = enrollment_number.trim();
        
        // Garantir que a senha tenha no mínimo 6 caracteres
        if (initialPassword.length < 6) {
          initialPassword = initialPassword.padStart(6, '0');
        }
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: initialPassword, // Sempre usar matrícula como senha inicial (ajustada se necessário)
          options: {
            data: {
              full_name: userData.full_name,
            },
            emailRedirectTo: undefined,
          },
        });

        if (authError) {
          console.error("Erro ao criar usuário no auth:", authError);
          const errorMsg = authError.message || "Erro desconhecido ao criar usuário no Supabase Auth";
          throw new Error(`Erro ao criar usuário: ${errorMsg}. Verifique se a confirmação de email está desabilitada.`);
        }

        if (!authData.user) {
          throw new Error("Falha ao criar usuário: usuário não foi retornado pelo Supabase");
        }

        authUser = authData.user;
      }

      // Garantir que temos um authUser antes de continuar
      if (!authUser) {
        throw new Error("Falha: Não foi possível obter ou criar usuário no auth. Verifique os logs.");
      }

      // Verificar se o perfil já existe antes de tentar criar
      const { data: existingProfileCheck } = await supabase
        .from("profiles")
        .select("id, full_name, enrollment_number")
        .eq("id", authUser.id)
        .maybeSingle();

      if (existingProfileCheck) {
        // Perfil já existe - usuário já está completamente cadastrado
        console.warn(`Usuário ${email} já está completamente cadastrado (auth + perfil existem).`);
        
        // Verificar se a matrícula é a mesma ou se está tentando criar com dados diferentes
        if (existingProfileCheck.enrollment_number === enrollment_number) {
          // Mesmo usuário já cadastrado completamente - informar mas não bloquear o processamento
          throw new Error("Usuário já cadastrado completamente no sistema");
        } else {
          // Perfil existe mas com matrícula diferente - situação incomum
          throw new Error(`Usuário já cadastrado, mas com matrícula diferente (atual: ${existingProfileCheck.enrollment_number}, informada: ${enrollment_number}). Verifique os dados.`);
        }
      }

      // Criar perfil
      // Nota: A tabela profiles não tem campo email, apenas full_name e enrollment_number
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          full_name: userData.full_name.trim(),
          enrollment_number: enrollment_number.trim(),
          store_id: userData.store_id?.trim() || null,
          regional_id: userData.regional_id?.trim() || null,
          // Se houver nome de loja/regional, usar; caso contrário, usar ID como fallback
          store: userData.store?.trim() || userData.store_id?.trim() || null,
          regional: userData.regional?.trim() || userData.regional_id?.trim() || null,
          avatar_initials: userData.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        })
        .select()
        .single();

      if (profileError) {
        console.error("Erro ao criar perfil no banco:", profileError);
        
        // Se for erro de chave duplicada, tentar limpar usuário órfão
        if (profileError.message?.includes("duplicate key") || profileError.code === "23505") {
          console.warn("Tentando limpar usuário órfão do auth...");
          try {
            if (isServiceRole && supabase.auth.admin) {
              await supabase.auth.admin.deleteUser(authUser.id);
            }
          } catch (cleanupError) {
            console.error("Erro ao limpar usuário do auth após falha no perfil:", cleanupError);
          }
          throw new Error("Erro: Perfil já existe para este ID. Isso pode acontecer se o usuário foi criado parcialmente. Tente novamente ou limpe o usuário órfão manualmente.");
        }
        
        // Tentar limpar usuário do auth se perfil falhar (rollback parcial)
        try {
          if (isServiceRole && supabase.auth.admin) {
            await supabase.auth.admin.deleteUser(authUser.id);
          }
        } catch (cleanupError) {
          console.error("Erro ao limpar usuário do auth após falha no perfil:", cleanupError);
        }
        const errorMsg = profileError.message || "Erro desconhecido ao criar perfil";
        throw new Error(`Erro ao salvar perfil no banco: ${errorMsg}. Verifique as permissões RLS.`);
      }

      if (!profileData) {
        throw new Error("Falha ao criar perfil: perfil não foi retornado pelo banco de dados");
      }

      // Criar ou atualizar role do usuário (obrigatório)
      // O trigger handle_new_user() pode criar role 'user' automaticamente
      // Vamos garantir que o role correto seja sempre salvo
      console.log(`Salvando role "${userData.role}" para usuário ${email} (${authUser.id})`);
      
      // Primeiro, remover todos os roles existentes para este usuário (se houver)
      // Isso garante que o trigger não interfira com o role correto
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", authUser.id);
      
      if (deleteError) {
        console.warn(`Aviso ao remover roles existentes para ${email}:`, deleteError);
        // Não bloquear se a deleção falhar, continuar para criar o role correto
      }
      
      // Agora criar o role correto
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authUser.id,
          role: userData.role, // Garantir que está usando o role correto
        })
        .select()
        .single();
      
      if (roleData) {
        console.log(`✓ Role salva com sucesso: ${roleData.role} para usuário ${email}`);
      }

      if (roleError) {
        console.error("Erro ao criar role no banco:", roleError);
        // Tentar limpar perfil e usuário se role falhar (rollback)
        try {
          await supabase.from("profiles").delete().eq("id", authUser.id);
          if (isServiceRole && supabase.auth.admin) {
            await supabase.auth.admin.deleteUser(authUser.id);
          }
        } catch (cleanupError) {
          console.error("Erro ao limpar dados após falha na role:", cleanupError);
        }
        const errorMsg = roleError.message || "Erro desconhecido ao criar role";
        throw new Error(`Erro ao salvar role no banco: ${errorMsg}. Verifique as permissões RLS.`);
      }

      if (!roleData) {
        throw new Error("Falha ao criar role: role não foi retornada pelo banco de dados");
      }

      console.log(`✓ Usuário ${email} criado com sucesso (ID: ${authUser.id})`);
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
    enrollment_number: string;
    role: AppRole;
    store_id?: string;
    regional_id?: string;
    store?: string;
    regional?: string;
  }) => {
    await createUserMutation.mutateAsync(userData);
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    await updateUserMutation.mutateAsync({ userId, updates });
  };

  // Função para sincronizar senha do usuário com a matrícula (para usuários criados antes da implementação)
  const syncPasswordWithEnrollment = async (userId: string): Promise<void> => {
    console.log(`🔄 Iniciando reset de senha para usuário: ${userId}`);
    
    if (!supabase) {
      console.error("❌ Supabase não configurado");
      throw new Error("Supabase não configurado");
    }

    // Verificar se tem Service Role Key para atualizar senha
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    console.log(`🔑 Service Role Key: ${serviceRoleKey ? '✅ Presente' : '❌ Ausente'}`);
    console.log(`🔑 supabase.auth.admin: ${supabase.auth.admin ? '✅ Disponível' : '❌ Não disponível'}`);
    
    if (!serviceRoleKey) {
      console.error("❌ Service Role Key não configurada no .env");
      throw new Error("Service Role Key não configurada. Adicione VITE_SUPABASE_SERVICE_ROLE_KEY no arquivo .env e reinicie o servidor.");
    }
    
    if (!supabase.auth.admin) {
      console.error("❌ supabase.auth.admin não está disponível. Verifique se a Service Role Key está correta.");
      throw new Error("Service Role Key inválida ou supabase.auth.admin não disponível. Verifique a configuração.");
    }

    // Buscar perfil do usuário para obter a matrícula
    // Nota: A tabela profiles não tem campo email, apenas enrollment_number
    console.log(`🔍 Buscando perfil do usuário...`);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("enrollment_number, full_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("❌ Erro ao buscar perfil:", profileError);
      throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
    }

    if (!profile) {
      console.error("❌ Perfil não encontrado");
      throw new Error("Perfil não encontrado");
    }

    console.log(`✓ Perfil encontrado: ${profile.full_name}, Matrícula: ${profile.enrollment_number}`);

    if (!profile.enrollment_number) {
      console.error("❌ Usuário não possui matrícula");
      throw new Error("Usuário não possui matrícula cadastrada");
    }

    // Atualizar senha no auth usando admin API
    // Se a matrícula for menor que 6 caracteres, preencher com zeros à esquerda
    // IMPORTANTE: Converter para string primeiro, pois pode vir como número do banco
    let senhaParaAtualizar = String(profile.enrollment_number).trim();
    const senhaOriginal = senhaParaAtualizar;
    
    if (senhaParaAtualizar.length < 6) {
      senhaParaAtualizar = senhaParaAtualizar.padStart(6, '0');
      console.log(`📝 Matrícula "${senhaOriginal}" ajustada para "${senhaParaAtualizar}" (preenchida com zeros)`);
    } else {
      console.log(`📝 Usando matrícula como está: "${senhaParaAtualizar}"`);
    }
    
    // Verificar se o usuário existe no auth antes de atualizar
    console.log(`🔍 Verificando se o usuário existe no Supabase Auth...`);
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData || !userData.user) {
        console.error("❌ Usuário não encontrado no Supabase Auth:", userError);
        throw new Error(`Usuário não encontrado no Supabase Auth. Verifique se o usuário foi criado corretamente. Erro: ${userError?.message || 'Usuário não existe'}`);
      }
      
      console.log(`✓ Usuário encontrado no auth: ${userData.user.email}`);
    } catch (error: any) {
      if (error.message.includes("Usuário não encontrado")) {
        throw error;
      }
      console.warn("⚠️ Não foi possível verificar usuário antes da atualização, continuando...");
    }
    
    console.log(`🔐 Atualizando senha no Supabase Auth...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Nova senha: "${senhaParaAtualizar}" (${senhaParaAtualizar.length} caracteres)`);
    console.log(`   Tipo da senha: ${typeof senhaParaAtualizar}`);
    
    // Garantir que a senha é uma string e não tem espaços
    const senhaLimpa = String(senhaParaAtualizar).trim();
    if (senhaLimpa !== senhaParaAtualizar) {
      console.warn(`⚠️ Senha tinha espaços, limpando: "${senhaParaAtualizar}" -> "${senhaLimpa}"`);
    }
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: senhaLimpa,
    });

    if (updateError) {
      console.error("❌ Erro ao atualizar senha:", updateError);
      console.error("   Código do erro:", updateError.status || 'N/A');
      console.error("   Mensagem:", updateError.message || 'N/A');
      console.error("   Detalhes completos:", JSON.stringify(updateError, null, 2));
      
      // Verificar se é um erro de permissão
      if (updateError.message?.toLowerCase().includes('permission') || 
          updateError.message?.toLowerCase().includes('unauthorized') ||
          updateError.status === 401 || updateError.status === 403) {
        throw new Error(`Erro de permissão ao atualizar senha. Verifique se a Service Role Key está correta e tem permissões de administrador. Erro: ${updateError.message}`);
      }
      
      throw new Error(`Erro ao atualizar senha: ${updateError.message || 'Erro desconhecido'}`);
    }

    if (!updateData || !updateData.user) {
      console.error("❌ Resposta de atualização inválida");
      console.error("   Dados recebidos:", JSON.stringify(updateData, null, 2));
      throw new Error("Erro ao atualizar senha: resposta inválida do Supabase");
    }
    
    console.log(`✅ Resposta do Supabase recebida:`);
    console.log(`   User ID: ${updateData.user.id}`);
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Última atualização: ${updateData.user.updated_at || 'N/A'}`);

    console.log(`✅ Senha atualizada com sucesso!`);
    console.log(`   Usuário: ${profile.full_name}`);
    console.log(`   Matrícula original: ${senhaOriginal}`);
    console.log(`   Senha definida: ${senhaLimpa}`);
    console.log(`   Email do usuário: ${updateData.user.email}`);
    console.log(`   ID do usuário: ${updateData.user.id}`);
    
    // Verificar se a atualização foi realmente aplicada
    // Nota: Pode levar alguns segundos para o Supabase processar a atualização
    console.log(`⏳ Aguardando 3 segundos para garantir que a atualização foi processada...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar novamente se a senha foi atualizada (opcional - pode falhar se muito rápido)
    console.log(`🔍 Verificando se a atualização foi aplicada...`);
    try {
      const { data: verifyData } = await supabase.auth.admin.getUserById(userId);
      if (verifyData && verifyData.user) {
        console.log(`✓ Usuário verificado após atualização: ${verifyData.user.email}`);
        
        // Testar se a senha foi realmente atualizada tentando fazer login
        // Criar um cliente temporário para testar o login
        console.log(`🧪 Testando se a senha foi realmente atualizada...`);
        const { createClient } = await import('@supabase/supabase-js');
        const testClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        
        // Tentar login com a senha definida
        console.log(`   Tentando login com senha: "${senhaLimpa}"`);
        let { data: testLogin, error: testError } = await testClient.auth.signInWithPassword({
          email: verifyData.user.email!,
          password: senhaLimpa,
        });
        
        if (!testError && testLogin) {
          console.log(`✅ TESTE DE LOGIN: Senha confirmada! Login funcionou com "${senhaLimpa}"`);
          // Fazer logout do teste
          await testClient.auth.signOut();
        } else {
          console.warn(`⚠️ TESTE DE LOGIN: Login falhou com "${senhaLimpa}". Erro: ${testError?.message || 'Desconhecido'}`);
          
          // Tentar variações da senha
          console.log(`   Tentando variações da senha...`);
          const variacoes = [];
          
          // Se a senha tem padding, tentar sem padding
          if (senhaLimpa.startsWith('0') && senhaLimpa.length > senhaOriginal.length) {
            variacoes.push(senhaOriginal);
          }
          
          // Se a senha original tem menos de 6 caracteres, tentar outras variações
          if (senhaOriginal.length < 6) {
            for (let len = 6; len <= 10; len++) {
              const variacao = senhaOriginal.padStart(len, '0');
              if (variacao !== senhaLimpa && !variacoes.includes(variacao)) {
                variacoes.push(variacao);
              }
            }
          }
          
          let loginFuncionou = false;
          for (const variacao of variacoes) {
            console.log(`   Tentando variação: "${variacao}"`);
            const { data: testLoginVariacao, error: testErrorVariacao } = await testClient.auth.signInWithPassword({
              email: verifyData.user.email!,
              password: variacao,
            });
            
            if (!testErrorVariacao && testLoginVariacao) {
              console.log(`✅ TESTE DE LOGIN: Login funcionou com variação "${variacao}"!`);
              console.warn(`   ⚠️ ATENÇÃO: A senha no sistema é "${variacao}", não "${senhaLimpa}"!`);
              await testClient.auth.signOut();
              loginFuncionou = true;
              break;
            }
          }
          
          if (!loginFuncionou) {
            console.error(`❌ TESTE DE LOGIN: Nenhuma variação funcionou!`);
            console.error(`   A senha pode não ter sido atualizada corretamente.`);
            console.error(`   Verifique se a Service Role Key tem permissão para atualizar senhas.`);
            console.error(`   Tente atualizar manualmente pelo Supabase Dashboard.`);
          }
        }
      }
    } catch (verifyError: any) {
      console.warn("⚠️ Não foi possível verificar a atualização:", verifyError.message || verifyError);
    }
    
    console.log(`✓ Reset de senha concluído com sucesso!`);
    console.log(`📋 RESUMO DO RESET:`);
    console.log(`   Usuário: ${profile.full_name}`);
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Matrícula original: ${senhaOriginal}`);
    console.log(`   Senha definida: ${senhaLimpa}`);
    console.log(`   ⚠️ IMPORTANTE: Aguarde 5-10 segundos antes de tentar fazer login para garantir que a atualização foi processada completamente.`);
  };

  // Função para resetar senha do usuário para a matrícula (alias para syncPasswordWithEnrollment)
  const resetUserPassword = async (userId: string): Promise<void> => {
    return syncPasswordWithEnrollment(userId);
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

  // Processar CSV de usuários
  const createUsersFromCSV = async (csvData: string): Promise<{ success: number; errors: string[] }> => {
    if (!supabase) {
      const errorMsg = "Supabase não configurado. Verifique as variáveis de ambiente.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const lines = csvData.trim().split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) {
        throw new Error("CSV deve ter pelo menos um cabeçalho e uma linha de dados");
      }

      const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
      const emailIdx = headers.indexOf("email");
      const senhaIdx = headers.indexOf("senha");
      const nomeIdx = headers.indexOf("nome_completo");
      const matriculaIdx = headers.indexOf("matricula");
      const cargoIdx = headers.indexOf("cargo");
      const lojaIdx = headers.indexOf("loja_id");
      const regionalIdx = headers.indexOf("regional_id");
      const lojaNomeIdx = headers.indexOf("loja");
      const regionalNomeIdx = headers.indexOf("regional");

      if (emailIdx === -1 || senhaIdx === -1 || nomeIdx === -1) {
        throw new Error("CSV deve conter as colunas obrigatórias: email, senha, nome_completo");
      }

      const errors: string[] = [];
      let success = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, "").trim());
          const email = values[emailIdx] || "";
          const password = values[senhaIdx] || "";
          const full_name = values[nomeIdx] || "";
          const enrollment_number = matriculaIdx >= 0 && values[matriculaIdx] ? values[matriculaIdx].trim() : "";
          // Extrair cargo e normalizar (lowercase, trim, mapear variações comuns)
          let role = cargoIdx >= 0 && values[cargoIdx] ? values[cargoIdx].toLowerCase().trim() : "";
          
          // Normalizar variações de cargo
          if (role === "administrador" || role === "administrator") {
            role = "admin";
          } else if (role === "líder" || role === "lider" || role === "leader") {
            role = "leader";
          } else if (role === "usuário" || role === "usuario" || role === "usuario" || role === "user") {
            role = "user";
          }
          
          const store_id = lojaIdx >= 0 && values[lojaIdx] ? values[lojaIdx].trim() : undefined;
          const regional_id = regionalIdx >= 0 && values[regionalIdx] ? values[regionalIdx].trim() : undefined;
          const store = lojaNomeIdx >= 0 && values[lojaNomeIdx] ? values[lojaNomeIdx].trim() : undefined;
          const regional = regionalNomeIdx >= 0 && values[regionalNomeIdx] ? values[regionalNomeIdx].trim() : undefined;
          
          // Log para debug
          console.log(`Linha ${i + 1} - Email: ${email}, Cargo extraído: "${values[cargoIdx]}", Cargo normalizado: "${role}"`);

          // Validar campos obrigatórios
          if (!email || !email.trim()) {
            errors.push(`Linha ${i + 1}: Email é obrigatório`);
            continue;
          }

          if (!email.includes("@")) {
            errors.push(`Linha ${i + 1} (${email}): Email inválido`);
            continue;
          }

          if (!password || !password.trim()) {
            errors.push(`Linha ${i + 1} (${email}): Senha é obrigatória`);
            continue;
          }

          if (password.length < 6) {
            errors.push(`Linha ${i + 1} (${email}): Senha deve ter no mínimo 6 caracteres`);
            continue;
          }

          if (!full_name || !full_name.trim()) {
            errors.push(`Linha ${i + 1} (${email}): Nome completo é obrigatório`);
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

          // Tentar criar usuário
          try {
            const roleToSave = role as AppRole;
            console.log(`Criando usuário ${email} com role: ${roleToSave}`);
            
            await createUser({
              email: email.trim().toLowerCase(),
              password,
              full_name: full_name.trim(),
              enrollment_number: enrollment_number.trim(),
              role: roleToSave,
              store_id: store_id || undefined,
              regional_id: regional_id || undefined,
              store: store || undefined,
              regional: regional || undefined,
            });
            success++;
            console.log(`✓ Usuário ${email} cadastrado com sucesso com role: ${roleToSave}`);
          } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || "Erro desconhecido ao salvar no banco de dados";
            errors.push(`Linha ${i + 1} (${email}): ${errorMessage}`);
            console.error(`✗ Erro ao cadastrar ${email}:`, errorMessage, error);
          }
        } catch (parseError: any) {
          const errorMessage = parseError?.message || "Erro ao processar linha do CSV";
          errors.push(`Linha ${i + 1}: ${errorMessage}`);
          console.error(`✗ Erro ao processar linha ${i + 1}:`, parseError);
        }
      }

      return { success, errors };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "Erro desconhecido ao processar CSV";
      console.error("Erro ao processar CSV:", error);
      throw new Error(`Erro ao processar CSV: ${errorMessage}`);
    }
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
        resetUserPassword,
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

