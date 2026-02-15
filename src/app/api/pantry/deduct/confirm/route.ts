import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ConfirmedDeduction } from "@/lib/types";

// POST /api/pantry/deduct/confirm - Apply confirmed deductions to pantry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deductions } = (await request.json()) as { deductions: ConfirmedDeduction[] };

    if (!deductions || !Array.isArray(deductions) || deductions.length === 0) {
      return NextResponse.json({ error: "Deductions are required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    for (const d of deductions) {
      if (d.action === "deduct" && d.deductQuantity != null) {
        // Fetch current quantity, subtract, floor at 0
        const { data: item } = await supabase
          .from("pantry_items")
          .select("quantity")
          .eq("id", d.pantryItemId)
          .eq("user_id", user.id)
          .single();

        if (item) {
          const newQty = Math.max(0, (item.quantity || 0) - d.deductQuantity);
          await supabase
            .from("pantry_items")
            .update({ quantity: newQty, last_updated: now })
            .eq("id", d.pantryItemId)
            .eq("user_id", user.id);
        }
      } else if (d.action === "reduce_bulk" && d.newBulkQuantity) {
        await supabase
          .from("pantry_items")
          .update({ bulk_quantity: d.newBulkQuantity, last_updated: now })
          .eq("id", d.pantryItemId)
          .eq("user_id", user.id);
      } else if (d.action === "set_binary_out") {
        await supabase
          .from("pantry_items")
          .update({ binary_quantity: "out", last_updated: now })
          .eq("id", d.pantryItemId)
          .eq("user_id", user.id);
      }
    }

    // Fetch items that are now low/out or below restock threshold
    const { data: lowItems } = await supabase
      .from("pantry_items")
      .select("*")
      .eq("user_id", user.id);

    const mapped = (lowItems || [])
      .filter(r => {
        if (r.quantity_type === "bulk") {
          return r.bulk_quantity === "low" || r.bulk_quantity === "out";
        }
        if (r.quantity_type === "binary") {
          return r.binary_quantity === "out";
        }
        if (r.quantity_type === "countable" && r.restock_threshold != null) {
          return (r.quantity || 0) <= r.restock_threshold;
        }
        if (r.quantity_type === "countable") {
          return (r.quantity || 0) === 0;
        }
        return false;
      })
      .map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        quantityType: r.quantity_type,
        quantity: r.quantity,
        unit: r.unit,
        bulkQuantity: r.bulk_quantity,
        binaryQuantity: r.binary_quantity,
      }));

    return NextResponse.json({ success: true, lowStockItems: mapped });
  } catch (error) {
    console.error("Error applying deductions:", error);
    return NextResponse.json({ error: "Failed to apply deductions" }, { status: 500 });
  }
}
