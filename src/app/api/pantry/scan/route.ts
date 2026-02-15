import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { toCanonicalName } from "@/lib/pantry/canonical";
import type { PantryCategory, QuantityType, BulkQuantity, BinaryQuantity, StorageLocation } from "@/lib/types";

function getOpenAI() {
  return new OpenAI();
}

const SYSTEM_PROMPT = `You are a kitchen inventory assistant. You analyze photos of food storage areas (pantry shelves, refrigerator interiors, freezer compartments, and spice racks) to identify individual food items.

Your job is to produce a structured inventory of every identifiable food item in the image.

RULES:
1. Use common ingredient names, not brand names, as the primary identifier.
   - GOOD: "marinara sauce", "penne pasta", "all-purpose flour"
   - BAD: "Rao's Homemade", "Barilla", "King Arthur"
   - Capture the brand separately in the brand field if visible.

2. Be specific about the item type when distinguishable:
   - "chicken breast" not just "chicken"
   - "black beans" not just "beans"
   - "extra virgin olive oil" not just "oil"
   - But if you can't distinguish (e.g., a sealed opaque package), use the general term and lower your confidence.

3. For quantity:
   - Countable items (cans, bottles, boxes, individual fruits/vegetables): provide an exact count.
   - Bulk items (bags of flour, bottles of oil): provide count of containers (e.g., 1 bag, 2 bottles).
   - If items are partially obscured, estimate conservatively and note it.

4. Group identical items:
   - 3 cans of the same item = 1 entry with container_count: 3
   - Don't create separate entries for identical items.

5. Confidence scoring:
   - 0.9-1.0: Item clearly visible, label readable or item obviously identifiable
   - 0.7-0.89: Item mostly visible, reasonable inference from packaging/shape/color
   - 0.5-0.69: Partially obscured, educated guess based on context
   - Below 0.5: Highly uncertain, include only if you have some basis for the guess

6. DO NOT:
   - Hallucinate items that aren't visible. If in doubt, omit or lower confidence.
   - Identify non-food items (cleaning supplies, containers, etc.) unless they're food storage containers with visible contents.
   - Make assumptions about items completely hidden behind other items.

7. For produce, note if there are visible signs of aging (wilting, browning, overripeness) in the notes field.`;

const STORAGE_LOCATION_NAMES: Record<string, string> = {
  pantry_shelf: "pantry shelf",
  fridge: "refrigerator",
  freezer: "freezer",
  spice_rack: "spice rack",
};

interface AIScannedItem {
  name: string;
  brand: string | null;
  category: PantryCategory;
  quantity_type: QuantityType;
  container_count: number | null;
  confidence: number;
  notes: string | null;
}

// POST /api/pantry/scan - Scan images for pantry items using GPT vision
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { images, storageLocation = "pantry_shelf" } = await request.json() as {
      images: { data: string; mediaType: string }[];
      storageLocation?: StorageLocation;
    };

    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 5) {
      return NextResponse.json({ error: "Provide 1-5 images" }, { status: 400 });
    }

    const imageContent = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mediaType};base64,${img.data}`,
      },
    }));

    const locationName = STORAGE_LOCATION_NAMES[storageLocation] || "kitchen storage area";

    const userPrompt = `Analyze ${images.length > 1 ? "these photos" : "this photo"} of my ${locationName}.

Identify all visible food items and return a JSON object with an "items" key containing an array of objects with these fields:
- "name": Common ingredient name (not brand name)
- "brand": Brand name if visible, otherwise null
- "category": One of "produce", "dairy_eggs", "protein", "grains_pasta", "canned_jarred", "frozen", "condiments_sauces", "spices_seasonings", "baking", "snacks", "beverages", "other"
- "quantity_type": "countable" for individual units (cans, boxes, fruits), "bulk" for continuous items (bag of flour, bottle of oil), "binary" for items that are simply present or not
- "container_count": Number of containers/units visible (for countable items), or 1 for bulk items. null for binary.
- "confidence": Float 0.0-1.0
- "notes": Any relevant observations (partially obscured, appears nearly empty, aging produce, appears half full, etc.), or null

Example: {"items": [{"name": "all-purpose flour", "brand": "King Arthur", "category": "baking", "quantity_type": "bulk", "container_count": 1, "confidence": 0.95, "notes": "bag appears about half full"}, {"name": "black beans", "brand": "Goya", "category": "canned_jarred", "quantity_type": "countable", "container_count": 3, "confidence": 0.9, "notes": null}]}

Return ONLY the JSON object.`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...imageContent,
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";

    let rawItems: AIScannedItem[];
    try {
      const parsed = JSON.parse(text);
      rawItems = Array.isArray(parsed) ? parsed : parsed.items || [];
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse scan results" }, { status: 500 });
      }
      rawItems = JSON.parse(jsonMatch[0]);
    }

    // Step 1: Filter out items with confidence < 0.3
    rawItems = rawItems.filter(item => (item.confidence ?? 0.5) >= 0.3);

    // Step 2: Normalize names and assign canonical names
    const normalized = rawItems.map(item => {
      const canonicalName = toCanonicalName(item.name);
      return { ...item, canonicalName };
    });

    // Step 3: Cross-photo deduplication — merge items with same canonical name
    const deduped = new Map<string, typeof normalized[0] & { mergedCount: number }>();
    for (const item of normalized) {
      const existing = deduped.get(item.canonicalName);
      if (existing) {
        // Merge: sum container counts, take highest confidence, combine notes
        existing.container_count = (existing.container_count || 0) + (item.container_count || 0);
        if (item.confidence > existing.confidence) {
          existing.confidence = item.confidence;
        }
        if (item.notes && !existing.notes) {
          existing.notes = item.notes;
        } else if (item.notes && existing.notes) {
          existing.notes = `${existing.notes}; ${item.notes}`;
        }
        if (item.brand && !existing.brand) {
          existing.brand = item.brand;
        }
        existing.mergedCount += 1;
      } else {
        deduped.set(item.canonicalName, { ...item, mergedCount: 1 });
      }
    }

    // Step 4: Map to output format with quantity defaults and fullness estimation
    const items = Array.from(deduped.values()).map(item => {
      // Estimate bulk quantity from notes
      let bulkQuantity: BulkQuantity | null = null;
      let binaryQuantity: BinaryQuantity | null = null;

      if (item.quantity_type === "bulk") {
        bulkQuantity = "full"; // default
        if (item.notes) {
          const notesLower = item.notes.toLowerCase();
          if (/nearly empty|almost out|almost empty|very low/.test(notesLower)) {
            bulkQuantity = "low";
          } else if (/half full|about half|halfway|half empty/.test(notesLower)) {
            bulkQuantity = "half";
          } else if (/mostly full|nearly full|almost full/.test(notesLower)) {
            bulkQuantity = "full";
          }
        }
      } else if (item.quantity_type === "binary") {
        binaryQuantity = "have";
      }

      // Countable: use container_count as quantity
      const quantity = item.quantity_type === "countable" ? (item.container_count || 1) : null;
      const unit = item.quantity_type === "countable" ? "count" : null;

      return {
        name: item.name,
        canonicalName: item.canonicalName,
        brand: item.brand || null,
        category: item.category,
        quantityType: item.quantity_type,
        quantity,
        unit,
        bulkQuantity,
        binaryQuantity,
        confidence: item.confidence,
        notes: item.notes || null,
        storageLocation,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error scanning pantry:", error);
    return NextResponse.json({ error: "Failed to scan pantry photos" }, { status: 500 });
  }
}
