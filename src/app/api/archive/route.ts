import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/archive - Get all archived recipes for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();

    let query = supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("archived_at", { ascending: false });

    // Filter by title if search query provided
    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error("Error reading archive:", error);
      return NextResponse.json(
        { error: "Failed to read archive" },
        { status: 500 }
      );
    }

    // Map database column names to frontend expected format
    const mappedRecipes = (recipes || []).map((r) => ({
      id: r.id,
      title: r.title,
      sourceUrl: r.source_url,
      image: r.image,
      archivedAt: new Date(r.archived_at).getTime(),
      prepTime: r.prep_time,
      cookTime: r.cook_time,
      servings: r.servings,
    }));

    return NextResponse.json({ recipes: mappedRecipes });
  } catch (error) {
    console.error("Error reading archive:", error);
    return NextResponse.json(
      { error: "Failed to read archive" },
      { status: 500 }
    );
  }
}

// POST /api/archive - Add a recipe to the archive
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, sourceUrl, image, prepTime, cookTime, servings } = body;

    if (!title || !sourceUrl) {
      return NextResponse.json(
        { error: "Title and sourceUrl are required" },
        { status: 400 }
      );
    }

    // Upsert: insert or update if user_id + source_url already exists
    const { data, error } = await supabase
      .from("recipes")
      .upsert(
        {
          user_id: user.id,
          title,
          source_url: sourceUrl,
          image,
          prep_time: prepTime,
          cook_time: cookTime,
          servings,
          archived_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source_url" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving to archive:", error);
      return NextResponse.json(
        { error: "Failed to save to archive" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Error saving to archive:", error);
    return NextResponse.json(
      { error: "Failed to save to archive" },
      { status: 500 }
    );
  }
}
