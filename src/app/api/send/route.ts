import { NextRequest, NextResponse } from "next/server";
import { addToTodoist } from "@/lib/integrations/todoist";
import { addToBring } from "@/lib/integrations/bring";
import type { ShoppingApp } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { ingredients, app, recipeUrl } = (await request.json()) as {
      ingredients: string[];
      app: ShoppingApp;
      recipeUrl?: string;
    };

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
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

    if (app === "todoist") {
      const apiToken = process.env.TODOIST_API_TOKEN;
      const projectId = process.env.TODOIST_PROJECT_ID;

      if (!apiToken) {
        return NextResponse.json(
          { error: "Todoist API token not configured. Set TODOIST_API_TOKEN environment variable." },
          { status: 500 }
        );
      }

      await addToTodoist(ingredients, { apiToken, projectId });
    } else if (app === "bring") {
      const email = process.env.BRING_EMAIL;
      const password = process.env.BRING_PASSWORD;
      const listUuid = process.env.BRING_LIST_UUID;

      if (!email || !password) {
        return NextResponse.json(
          { error: "Bring! credentials not configured. Set BRING_EMAIL and BRING_PASSWORD environment variables." },
          { status: 500 }
        );
      }

      await addToBring(ingredients, { email, password, listUuid, recipeUrl });
    }

    return NextResponse.json({ success: true, count: ingredients.length });
  } catch (error) {
    console.error("Error sending to shopping list:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send to shopping list" },
      { status: 500 }
    );
  }
}
