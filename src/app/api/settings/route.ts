import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/settings - Get current user's settings
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Map database fields to frontend format (with masked sensitive data)
    const settings = data
      ? {
          todoistApiToken: data.todoist_api_token ? "••••••••" : "",
          todoistProjectId: data.todoist_project_id || "",
          bringEmail: data.bring_email || "",
          bringPassword: data.bring_password ? "••••••••" : "",
          bringListUuid: data.bring_list_uuid || "",
        }
      : {
          todoistApiToken: "",
          todoistProjectId: "",
          bringEmail: "",
          bringPassword: "",
          bringListUuid: "",
        };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update current user's settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      todoistApiToken,
      todoistProjectId,
      bringEmail,
      bringPassword,
      bringListUuid,
    } = body;

    // Get existing settings to preserve masked values
    const { data: existing } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Build update object, preserving existing values if masked placeholder is sent
    const updateData: Record<string, string | null> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Only update if value is not the masked placeholder
    if (todoistApiToken !== undefined && todoistApiToken !== "••••••••") {
      updateData.todoist_api_token = todoistApiToken || null;
    } else if (existing) {
      updateData.todoist_api_token = existing.todoist_api_token;
    }

    if (todoistProjectId !== undefined) {
      updateData.todoist_project_id = todoistProjectId || null;
    } else if (existing) {
      updateData.todoist_project_id = existing.todoist_project_id;
    }

    if (bringEmail !== undefined) {
      updateData.bring_email = bringEmail || null;
    } else if (existing) {
      updateData.bring_email = existing.bring_email;
    }

    if (bringPassword !== undefined && bringPassword !== "••••••••") {
      updateData.bring_password = bringPassword || null;
    } else if (existing) {
      updateData.bring_password = existing.bring_password;
    }

    if (bringListUuid !== undefined) {
      updateData.bring_list_uuid = bringListUuid || null;
    } else if (existing) {
      updateData.bring_list_uuid = existing.bring_list_uuid;
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving settings:", error);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
