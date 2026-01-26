import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getRedis, ARCHIVE_KEY } from "@/lib/redis";

interface ArchivedRecipe {
  id: string;
  title: string;
  sourceUrl: string;
  image?: string;
  archivedAt: number;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
}

interface ArchiveData {
  recipes: ArchivedRecipe[];
}

const ARCHIVE_PATH = path.join(process.cwd(), "src/data/archive.json");

// Read from Redis if available, otherwise fall back to JSON file
async function readArchive(): Promise<ArchiveData> {
  const redis = getRedis();

  if (redis) {
    try {
      const data = await redis.get<ArchiveData>(ARCHIVE_KEY);
      return data || { recipes: [] };
    } catch (error) {
      console.error("Redis read error:", error);
      return { recipes: [] };
    }
  }

  // Fall back to JSON file for local dev
  try {
    const data = await fs.readFile(ARCHIVE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return { recipes: [] };
  }
}

// Write to Redis if available, otherwise fall back to JSON file
async function writeArchive(data: ArchiveData): Promise<void> {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(ARCHIVE_KEY, data);
      return;
    } catch (error) {
      console.error("Redis write error:", error);
      throw error;
    }
  }

  // Fall back to JSON file for local dev
  await fs.writeFile(ARCHIVE_PATH, JSON.stringify(data, null, 2));
}

// GET /api/archive - Get all archived recipes, optionally filtered by search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();

    const archive = await readArchive();
    let recipes = archive.recipes;

    // Filter by title if search query provided
    if (search) {
      recipes = recipes.filter((r) =>
        r.title.toLowerCase().includes(search)
      );
    }

    // Sort by date (newest first)
    recipes.sort((a, b) => b.archivedAt - a.archivedAt);

    return NextResponse.json({ recipes });
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
    const body = await request.json();
    const { title, sourceUrl, image, prepTime, cookTime, servings } = body;

    if (!title || !sourceUrl) {
      return NextResponse.json(
        { error: "Title and sourceUrl are required" },
        { status: 400 }
      );
    }

    const archive = await readArchive();

    // Check for duplicate by sourceUrl
    const existing = archive.recipes.find((r) => r.sourceUrl === sourceUrl);
    if (existing) {
      // Update the existing entry with new data
      existing.title = title;
      existing.image = image;
      existing.prepTime = prepTime;
      existing.cookTime = cookTime;
      existing.servings = servings;
      existing.archivedAt = Date.now();

      await writeArchive(archive);
      return NextResponse.json({ success: true, updated: true, id: existing.id });
    }

    // Create new archive entry
    const newRecipe: ArchivedRecipe = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      sourceUrl,
      image,
      archivedAt: Date.now(),
      prepTime,
      cookTime,
      servings,
    };

    archive.recipes.push(newRecipe);
    await writeArchive(archive);

    return NextResponse.json({ success: true, created: true, id: newRecipe.id });
  } catch (error) {
    console.error("Error saving to archive:", error);
    return NextResponse.json(
      { error: "Failed to save to archive" },
      { status: 500 }
    );
  }
}
