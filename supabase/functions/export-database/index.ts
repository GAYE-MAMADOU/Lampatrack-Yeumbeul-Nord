import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInserts(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- Table ${table}: aucune donnée\n`;
  const cols = Object.keys(rows[0]);
  const lines = rows.map(
    (r) => `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${cols.map((c) => escapeSQL(r[c])).join(", ")});`
  );
  return `-- ==========================================\n-- Table: ${table} (${rows.length} lignes)\n-- ==========================================\n${lines.join("\n")}\n\n`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Accès refusé - admin requis" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Export all tables
    const tables = ["profiles", "user_roles", "lampadaires", "lampadaire_history", "signalements", "push_subscriptions"];
    let sql = `-- ==========================================\n-- Export base de données LampaTrack\n-- Date: ${new Date().toISOString()}\n-- ==========================================\n\n`;

    // Enums
    sql += `-- Types ENUM\nCREATE TYPE IF NOT EXISTS lampadaire_status AS ENUM ('functional', 'damaged');\nCREATE TYPE IF NOT EXISTS report_status AS ENUM ('pending', 'approved', 'rejected');\nCREATE TYPE IF NOT EXISTS app_role AS ENUM ('admin', 'user');\n\n`;

    // DDL
    sql += `-- Tables\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.profiles (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id uuid NOT NULL UNIQUE,\n  full_name text,\n  email text,\n  is_banned boolean NOT NULL DEFAULT false,\n  banned_at timestamptz,\n  banned_reason text,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.user_roles (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id uuid NOT NULL,\n  role app_role NOT NULL DEFAULT 'user',\n  UNIQUE(user_id, role)\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.lampadaires (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  identifier text NOT NULL,\n  latitude double precision NOT NULL,\n  longitude double precision NOT NULL,\n  status lampadaire_status NOT NULL DEFAULT 'functional',\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now()\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.lampadaire_history (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  lampadaire_id uuid NOT NULL REFERENCES public.lampadaires(id),\n  action text NOT NULL,\n  previous_status lampadaire_status,\n  new_status lampadaire_status,\n  technician_name text,\n  intervention_type text,\n  performed_by uuid,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.signalements (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  lampadaire_id uuid NOT NULL REFERENCES public.lampadaires(id),\n  user_id uuid NOT NULL,\n  cause text NOT NULL,\n  description text,\n  photo_url text NOT NULL,\n  status report_status NOT NULL DEFAULT 'pending',\n  admin_notes text,\n  processed_by uuid,\n  processed_at timestamptz,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.push_subscriptions (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id uuid NOT NULL,\n  endpoint text NOT NULL,\n  p256dh text NOT NULL,\n  auth text NOT NULL,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\n`;

    sql += `-- ==========================================\n-- DONNÉES\n-- ==========================================\n\n`;

    for (const table of tables) {
      let allRows: Record<string, unknown>[] = [];
      let offset = 0;
      const limit = 1000;
      
      while (true) {
        const { data, error } = await adminClient
          .from(table)
          .select("*")
          .range(offset, offset + limit - 1)
          .order("created_at", { ascending: true });
        
        if (error) {
          sql += `-- Erreur pour ${table}: ${error.message}\n\n`;
          break;
        }
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < limit) break;
        offset += limit;
      }

      sql += generateInserts(table, allRows);
    }

    const filename = `lampatrack_backup_${new Date().toISOString().slice(0, 10)}.sql`;

    return new Response(sql, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
