import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const APP_ROLES = ["admin", "leader", "user"] as const;
type AppRole = (typeof APP_ROLES)[number];

function parseRole(r: string | undefined): AppRole {
  const x = String(r || "user").toLowerCase();
  return (APP_ROLES as readonly string[]).includes(x) ? (x as AppRole) : "user";
}

function avatarFromFullName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";
}

/**
 * Cria usuário via Admin API (evita rate limit do signUp público) e sincroniza perfil + role no Postgres (service role ignora RLS).
 * verify_jwt=false: gerenciador não mantém sessão Supabase.
 */
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  type Body = {
    email?: string;
    password?: string;
    full_name?: string;
    enrollment_number?: string;
    store_id?: string;
    regional_id?: string;
    store?: string;
    regional?: string;
    role?: string;
  };

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const full_name = String(body.full_name || "").trim() || "Usuário";
  const enrollment_number = String(body.enrollment_number || "").trim();
  const store_id = body.store_id?.trim() || null;
  const regional_id = body.regional_id?.trim() || null;
  const store = (body.store?.trim() || body.store_id?.trim() || null) as string | null;
  const regional = (body.regional?.trim() || body.regional_id?.trim() || null) as string | null;
  const role = parseRole(body.role);

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = created.user;
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "No user returned" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uid = user.id;
  const avatar_initials = avatarFromFullName(full_name);

  const profileRow = {
    id: uid,
    full_name,
    enrollment_number: enrollment_number || null,
    store_id,
    regional_id,
    store,
    regional,
    avatar_initials,
  };

  const { error: profileErr } = await admin.from("profiles").upsert(profileRow, {
    onConflict: "id",
  });

  if (profileErr) {
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {
      /* ignore */
    }
    return new Response(
      JSON.stringify({ error: `profile: ${profileErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { error: delRolesErr } = await admin.from("user_roles").delete().eq("user_id", uid);
  if (delRolesErr) {
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {
      /* ignore */
    }
    return new Response(
      JSON.stringify({ error: `user_roles delete: ${delRolesErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { error: roleErr } = await admin.from("user_roles").insert({
    user_id: uid,
    role,
  });

  if (roleErr) {
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {
      /* ignore */
    }
    return new Response(
      JSON.stringify({ error: `user_roles insert: ${roleErr.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      user: { id: user.id, email: user.email },
      profile_synced: true,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
