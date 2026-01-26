import { NextRequest, NextResponse } from "next/server";
import { addToTodoist } from "@/lib/integrations/todoist";
import { addToBring } from "@/lib/integrations/bring";
import type { ShoppingApp } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ingredients, app, recipeUrl } = (await request.json()) as {
      ingredients: string[];
      app: ShoppingApp;
      recipeUrl?: string;
    };

    if (
      !ingredients ||
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return NextResponse.json(
        { error: "Ingredients array is required" },
        { status: 400 }
      );
    }

    if (!app || !["todoist", "bring"].includes(app)) {
      return NextResponse.json(
        { error: "Valid app (todoist or bring) is required" },
        { status: 400 }
      );
    }

    // Fetch user settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      console.error("Error fetching settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    if (app === "todoist") {
      const apiToken = settings?.todoist_api_token;
      const projectId = settings?.todoist_project_id;

      if (!apiToken) {
        return NextResponse.json(
          {
            error:
              "Todoist not configured. Add your API token in Settings.",
          },
          { status: 400 }
        );
      }

      await addToTodoist(ingredients, { apiToken, projectId });
    } else if (app === "bring") {
      const email = settings?.bring_email;
      const password = settings?.bring_password;
      const listUuid = settings?.bring_list_uuid;

      if (!email || !password) {
        return NextResponse.json(
          {
            error:
              "Bring! not configured. Add your credentials in Settings.",
          },
          { status: 400 }
        );
      }

      await addToBring(ingredients, { email, password, listUuid, recipeUrl });
    }

    return NextResponse.json({ success: true, count: ingredients.length });
  } catch (error) {
    console.error("Error sending to shopping list:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send to shopping list",
      },
      { status: 500 }
    );
  }
}
