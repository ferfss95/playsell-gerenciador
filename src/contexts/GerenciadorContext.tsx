import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile, DailyPerformance, UserWithPerformance } from "./types";
import { toast } from "sonner";

interface GerenciadorContextType {
  users: UserWithPerformance[];
  isLoading: boolean;
  createUser: (userData: {
    email: string;
    password: string;
    full_name: string;
    store_id?: string;
    regional_id?: string;
  }) => Promise<void>;
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
  updatePerformance: (performanceId: string, updates: Partial<DailyPerformance>) => Promise<void>;
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

      // Buscar última performance de cada usuário
      const usersWithPerformance: UserWithPerformance[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: performance } = await supabase
            .from("daily_performance")
            .select("*")
            .eq("user_id", profile.id)
            .order("date", { ascending: false })
            .limit(1)
            .single();

          return {
            ...profile,
            latest_performance: performance || undefined,
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
      store_id?: string;
      regional_id?: string;
    }) => {
      if (!supabase) throw new Error("Supabase não configurado");

      // Criar usuário no auth (signUp normal)
      // Em produção, use um backend com admin.createUser
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário");

      // Criar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: userData.full_name,
          store_id: userData.store_id || null,
          regional_id: userData.regional_id || null,
          avatar_initials: userData.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        });

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar usuário");
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
      toast.success("Usuário atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar usuário");
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

      const { error } = await supabase
        .from("daily_performance")
        .upsert(performance, {
          onConflict: "user_id,date",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Indicadores salvos com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar indicadores");
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

      const { error } = await supabase
        .from("daily_performance")
        .update(updates)
        .eq("id", performanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Indicadores atualizados com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar indicadores");
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

  return (
    <GerenciadorContext.Provider
      value={{
        users,
        isLoading,
        createUser,
        updateUser,
        deleteUser,
        addPerformance,
        updatePerformance,
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

