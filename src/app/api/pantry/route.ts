import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PantryItemInput } from "@/lib/types";
import { toCanonicalName } from "@/lib/pantry/canonical";

// GET /api/pantry - Get all pantry items for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("pantry_items")
      .select("*")
      .eq("user_id", user.id)
      .order("category")
      .order("name");

    const location = request.nextUrl.searchParams.get("location");
    if (location) {
      query = query.eq("storage_location", location);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error("Error reading pantry:", error);
      return NextResponse.json({ error: "Failed to read pantry" }, { status: 500 });
    }

    const mapped = (items || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      canonicalName: r.canonical_name,
      brand: r.brand,
      category: r.category,
      storageLocation: r.storage_location,
      quantityType: r.quantity_type,
      quantity: r.quantity,
      unit: r.unit,
      bulkQuantity: r.bulk_quantity,
      binaryQuantity: r.binary_quantity,
      restockThreshold: r.restock_threshold,
      ingredientId: r.ingredient_id,
      source: r.source,
      notes: r.notes,
      lastUpdated: r.last_updated,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ items: mapped });
  } catch (error) {
    console.error("Error reading pantry:", error);
    return NextResponse.json({ error: "Failed to read pantry" }, { status: 500 });
  }
}

// POST /api/pantry - Bulk upsert pantry items
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = (await request.json()) as { items: PantryItemInput[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const rows = items.map((item) => ({
      user_id: user.id,
      name: item.name,
      canonical_name: item.canonicalName || toCanonicalName(item.name),
      brand: item.brand ?? null,
      category: item.category,
      storage_location: item.storageLocation ?? "pantry_shelf",
      quantity_type: item.quantityType,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      bulk_quantity: item.bulkQuantity ?? null,
      binary_quantity: item.binaryQuantity ?? null,
      restock_threshold: item.restockThreshold ?? null,
      source: item.source ?? "manual",
      notes: item.notes ?? null,
      last_updated: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("pantry_items")
      .upsert(rows, { onConflict: "user_id,canonical_name" })
      .select();

    if (error) {
      console.error("Error saving pantry items:", error);
      return NextResponse.json({ error: "Failed to save pantry items" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error("Error saving pantry items:", error);
    return NextResponse.json({ error: "Failed to save pantry items" }, { status: 500 });
  }
}

// PATCH /api/pantry - Update a single pantry item
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ...fields } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    // Map camelCase to snake_case for allowed fields
    const update: Record<string, unknown> = { last_updated: new Date().toISOString() };
    if (fields.name !== undefined) {
      update.name = fields.name;
      update.canonical_name = toCanonicalName(fields.name);
    }
    if (fields.category !== undefined) update.category = fields.category;
    if (fields.quantityType !== undefined) update.quantity_type = fields.quantityType;
    if (fields.quantity !== undefined) update.quantity = fields.quantity;
    if (fields.unit !== undefined) update.unit = fields.unit;
    if (fields.bulkQuantity !== undefined) update.bulk_quantity = fields.bulkQuantity;
    if (fields.binaryQuantity !== undefined) update.binary_quantity = fields.binaryQuantity;
    if (fields.restockThreshold !== undefined) update.restock_threshold = fields.restockThreshold;
    if (fields.storageLocation !== undefined) update.storage_location = fields.storageLocation;
    if (fields.brand !== undefined) update.brand = fields.brand;
    if (fields.notes !== undefined) update.notes = fields.notes;
    if (fields.source !== undefined) update.source = fields.source;

    const { error } = await supabase
      .from("pantry_items")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating pantry item:", error);
      return NextResponse.json({ error: "Failed to update pantry item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating pantry item:", error);
    return NextResponse.json({ error: "Failed to update pantry item" }, { status: 500 });
  }
}

// DELETE /api/pantry - Delete a single pantry item
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("pantry_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting pantry item:", error);
      return NextResponse.json({ error: "Failed to delete pantry item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pantry item:", error);
    return NextResponse.json({ error: "Failed to delete pantry item" }, { status: 500 });
  }
}
