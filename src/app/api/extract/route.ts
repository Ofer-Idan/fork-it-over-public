import { NextRequest, NextResponse } from "next/server";
import { extractRecipe } from "@/lib/parser";
import { createClient } from "@/lib/supabase/server";

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // Remove trailing slash from pathname (except root)
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

async function saveToArchive(
  userId: string,
  recipe: {
    title: string;
    sourceUrl: string;
    image?: string;
    prepTime?: string;
    cookTime?: string;
    servings?: string;
  }
) {
  try {
    const supabase = await createClient();

    // Upsert: insert or update if user_id + source_url already exists
    await supabase.from("recipes").upsert(
      {
        user_id: userId,
        title: recipe.title,
        source_url: normalizeUrl(recipe.sourceUrl),
        image: recipe.image,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        archived_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source_url" }
    );
  } catch (error) {
    console.error("Error saving to archive:", error);
    // Don't fail the request if archiving fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const recipe = await extractRecipe(url);

    // Auto-save to archive (fire and forget)
    saveToArchive(user.id, recipe);

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Error extracting recipe:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract recipe",
      },
      { status: 500 }
    );
  }
}
