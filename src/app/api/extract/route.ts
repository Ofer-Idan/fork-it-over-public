import { NextRequest, NextResponse } from "next/server";
import { extractRecipe } from "@/lib/parser";
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

async function saveToArchive(recipe: {
  title: string;
  sourceUrl: string;
  image?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
}) {
  try {
    const redis = getRedis();
    let archive: ArchiveData;

    if (redis) {
      // Use Redis
      archive = (await redis.get<ArchiveData>(ARCHIVE_KEY)) || { recipes: [] };
    } else {
      // Fall back to JSON file
      try {
        const data = await fs.readFile(ARCHIVE_PATH, "utf-8");
        archive = JSON.parse(data);
      } catch {
        archive = { recipes: [] };
      }
    }

    // Check for duplicate by sourceUrl
    const existingIndex = archive.recipes.findIndex(
      (r) => r.sourceUrl === recipe.sourceUrl
    );

    const entry: ArchivedRecipe = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
      image: recipe.image,
      archivedAt: Date.now(),
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
    };

    if (existingIndex >= 0) {
      // Update existing entry
      entry.id = archive.recipes[existingIndex].id;
      archive.recipes[existingIndex] = entry;
    } else {
      // Add new entry
      archive.recipes.push(entry);
    }

    if (redis) {
      await redis.set(ARCHIVE_KEY, archive);
    } else {
      await fs.writeFile(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
    }
  } catch (error) {
    console.error("Error saving to archive:", error);
    // Don't fail the request if archiving fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    const recipe = await extractRecipe(url);

    // Auto-save to archive (fire and forget)
    saveToArchive(recipe);

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Error extracting recipe:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract recipe" },
      { status: 500 }
    );
  }
}
