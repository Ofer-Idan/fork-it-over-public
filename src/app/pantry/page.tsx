"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  PantryItem,
  PantryCategory,
  QuantityType,
  BulkQuantity,
  BinaryQuantity,
  StorageLocation,
} from "@/lib/types";
import { toCanonicalName } from "@/lib/pantry/canonical";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  STORAGE_LOCATIONS,
  STORAGE_LOCATION_LABELS,
  DEFAULT_QUANTITY_TYPES,
  DEFAULT_STORAGE_LOCATIONS,
} from "@/lib/pantry/constants";

const BULK_LEVELS: BulkQuantity[] = ["full", "half", "low", "out"];

const BULK_COLORS: Record<BulkQuantity, string> = {
  full: "bg-[var(--color-success)] text-white",
  half: "bg-yellow-500 text-white",
  low: "bg-orange-500 text-white",
  out: "bg-[var(--color-error)] text-white",
};

const BULK_BG: Record<BulkQuantity, string> = {
  full: "bg-[var(--color-success)]/20",
  half: "bg-yellow-500/20",
  low: "bg-orange-500/20",
  out: "bg-[var(--color-error)]/20",
};

// Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function isItemOut(item: PantryItem): boolean {
  if (item.quantityType === "bulk") return item.bulkQuantity === "out";
  if (item.quantityType === "binary") return item.binaryQuantity === "out";
  if (item.quantityType === "countable") return (item.quantity ?? 0) === 0;
  return false;
}

interface ScanItem {
  name: string;
  canonicalName: string;
  brand: string | null;
  category: PantryCategory;
  quantityType: QuantityType;
  quantity: number | null;
  unit: string | null;
  bulkQuantity: BulkQuantity | null;
  binaryQuantity: BinaryQuantity | null;
  confidence: number;
  notes: string | null;
  storageLocation: StorageLocation;
  selected: boolean;
}

type ScanStep = "idle" | "upload" | "processing" | "review";

interface EditForm {
  id: string;
  name: string;
  brand: string;
  category: PantryCategory;
  storageLocation: StorageLocation;
  quantityType: QuantityType;
  quantity: number | null;
  unit: string;
  restockThreshold: number | null;
  bulkQuantity: BulkQuantity;
  binaryQuantity: BinaryQuantity;
  notes: string;
}

type LocationTab = "all" | StorageLocation;

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<LocationTab>("all");

  // Add item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBrand, setAddBrand] = useState("");
  const [addCategory, setAddCategory] = useState<PantryCategory>("other");
  const [addStorageLocation, setAddStorageLocation] = useState<StorageLocation>("pantry_shelf");
  const [addQuantityType, setAddQuantityType] = useState<QuantityType>("binary");
  const [addQuantity, setAddQuantity] = useState<string>("");
  const [addUnit, setAddUnit] = useState("");
  const [addThreshold, setAddThreshold] = useState<string>("");
  const [addBulkQuantity, setAddBulkQuantity] = useState<BulkQuantity>("full");
  const [addSaving, setAddSaving] = useState(false);

  // Edit item
  const [editItem, setEditItem] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Scan flow
  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [scanImages, setScanImages] = useState<File[]>([]);
  const [scanPreviews, setScanPreviews] = useState<string[]>([]);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [scanSaving, setScanSaving] = useState(false);
  const [scanLocation, setScanLocation] = useState<StorageLocation>("pantry_shelf");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restock inline
  const [restockCountId, setRestockCountId] = useState<string | null>(null);
  const [restockCountValue, setRestockCountValue] = useState("");

  // FAB menu
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Auto-set quantity type and storage location when category changes in add form
  useEffect(() => {
    setAddQuantityType(DEFAULT_QUANTITY_TYPES[addCategory]);
    setAddStorageLocation(DEFAULT_STORAGE_LOCATIONS[addCategory]);
  }, [addCategory]);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/pantry");
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
      } else {
        setError(data.error || "Failed to load pantry");
      }
    } catch {
      setError("Failed to load pantry");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            name: addName.trim(),
            canonicalName: toCanonicalName(addName.trim()),
            brand: addBrand.trim() || null,
            category: addCategory,
            storageLocation: addStorageLocation,
            quantityType: addQuantityType,
            quantity: addQuantityType === "countable" ? (parseFloat(addQuantity) || 0) : null,
            unit: addQuantityType === "countable" ? addUnit || null : null,
            restockThreshold: addQuantityType === "countable" && addThreshold ? parseFloat(addThreshold) : null,
            bulkQuantity: addQuantityType === "bulk" ? addBulkQuantity : null,
            binaryQuantity: addQuantityType === "binary" ? "have" as BinaryQuantity : null,
          }],
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setAddName("");
        setAddBrand("");
        setAddCategory("other");
        setAddStorageLocation("pantry_shelf");
        setAddQuantityType("binary");
        setAddQuantity("");
        setAddUnit("");
        setAddThreshold("");
        setAddBulkQuantity("full");
        await fetchItems();
        setSuccess("Item added");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add item");
      }
    } catch {
      setError("Failed to add item");
    } finally {
      setAddSaving(false);
    }
  };

  const handleUpdateQuantity = async (item: PantryItem, delta: number) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));

    try {
      await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, quantity: newQty }),
      });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i));
    }
  };

  const handleCycleBulk = async (item: PantryItem) => {
    const currentIdx = BULK_LEVELS.indexOf(item.bulkQuantity || "full");
    const nextLevel = BULK_LEVELS[(currentIdx + 1) % BULK_LEVELS.length];
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, bulkQuantity: nextLevel } : i));

    try {
      await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, bulkQuantity: nextLevel }),
      });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, bulkQuantity: item.bulkQuantity } : i));
    }
  };

  const handleToggleBinary = async (item: PantryItem) => {
    const newVal: BinaryQuantity = item.binaryQuantity === "have" ? "out" : "have";
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, binaryQuantity: newVal } : i));

    try {
      await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, binaryQuantity: newVal }),
      });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, binaryQuantity: item.binaryQuantity } : i));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item from your pantry?")) return;

    const prev = items;
    setItems(items.filter(i => i.id !== id));

    try {
      const res = await fetch("/api/pantry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setItems(prev);
        setError("Failed to delete item");
      }
    } catch {
      setItems(prev);
      setError("Failed to delete item");
    }
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    setEditSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editItem.id,
          name: editItem.name,
          brand: editItem.brand || null,
          category: editItem.category,
          storageLocation: editItem.storageLocation,
          quantityType: editItem.quantityType,
          quantity: editItem.quantityType === "countable" ? editItem.quantity : null,
          unit: editItem.quantityType === "countable" ? editItem.unit || null : null,
          restockThreshold: editItem.quantityType === "countable" ? editItem.restockThreshold : null,
          bulkQuantity: editItem.quantityType === "bulk" ? editItem.bulkQuantity : null,
          binaryQuantity: editItem.quantityType === "binary" ? editItem.binaryQuantity : null,
          notes: editItem.notes || null,
        }),
      });

      if (res.ok) {
        setEditItem(null);
        await fetchItems();
        setSuccess("Item updated");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update item");
      }
    } catch {
      setError("Failed to update item");
    } finally {
      setEditSaving(false);
    }
  };

  // Scan flow handlers
  const handleScanFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setScanImages(files);
    setScanPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleScanUpload = async () => {
    if (scanImages.length === 0) return;
    setScanStep("processing");
    setError(null);

    try {
      const images = await Promise.all(
        scanImages.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );
          return { data: base64, mediaType: file.type };
        })
      );

      const res = await fetch("/api/pantry/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, storageLocation: scanLocation }),
      });

      const data = await res.json();

      if (res.ok && data.items) {
        setScanItems(data.items.map((item: ScanItem) => ({
          ...item,
          // Auto-check based on confidence tier: ≥0.5 checked, <0.5 unchecked
          selected: (item.confidence ?? 0.7) >= 0.5,
        })));
        setScanStep("review");
      } else {
        setError(data.error || "Failed to scan images");
        setScanStep("upload");
      }
    } catch {
      setError("Failed to scan images");
      setScanStep("upload");
    }
  };

  const handleScanSave = async () => {
    const selected = scanItems.filter(i => i.selected);
    if (selected.length === 0) return;
    setScanSaving(true);

    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map(({ selected: _, confidence: __, notes: ___, ...item }) => ({
            ...item,
            source: "scan",
          })),
        }),
      });

      if (res.ok) {
        setScanStep("idle");
        setScanImages([]);
        setScanPreviews([]);
        setScanItems([]);
        setScanLocation("pantry_shelf");
        await fetchItems();
        setSuccess(`${selected.length} items added to pantry`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save scanned items");
      }
    } catch {
      setError("Failed to save scanned items");
    } finally {
      setScanSaving(false);
    }
  };

  const handleScanCancel = () => {
    setScanStep("idle");
    setScanImages([]);
    setScanPreviews([]);
    setScanItems([]);
    setScanLocation("pantry_shelf");
  };

  const handleRestock = async (item: PantryItem) => {
    if (item.quantityType === "countable") {
      // Show inline input for countable items
      setRestockCountId(item.id);
      setRestockCountValue(String(item.restockThreshold ?? item.quantity ?? 1));
      return;
    }

    // Bulk → full, Binary → have
    const update: Record<string, unknown> = { id: item.id };
    if (item.quantityType === "bulk") {
      update.bulkQuantity = "full";
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, bulkQuantity: "full" as BulkQuantity } : i));
    } else if (item.quantityType === "binary") {
      update.binaryQuantity = "have";
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, binaryQuantity: "have" as BinaryQuantity } : i));
    }

    try {
      await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
    } catch {
      await fetchItems();
    }
  };

  const handleRestockCountConfirm = async (item: PantryItem) => {
    const newQty = parseFloat(restockCountValue) || 1;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
    setRestockCountId(null);

    try {
      await fetch("/api/pantry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, quantity: newQty }),
      });
    } catch {
      await fetchItems();
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Filter by search and location tab
  const filtered = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab !== "all" && i.storageLocation !== activeTab) return false;
    return true;
  });

  // Separate stocked vs out items
  const stockedItems = filtered.filter(i => !isItemOut(i));
  const outItems = filtered.filter(i => isItemOut(i));

  // Group by category
  const groupByCategory = (list: PantryItem[]) =>
    CATEGORIES.reduce<Record<string, PantryItem[]>>((acc, cat) => {
      const catItems = list.filter(i => i.category === cat);
      if (catItems.length > 0) acc[cat] = catItems;
      return acc;
    }, {});

  const stockedGrouped = groupByCategory(stockedItems);
  const outGrouped = groupByCategory(outItems);

  // Spice Rack tab: only spices_seasonings items
  const isSpiceRackTab = activeTab === "spice_rack";

  const spiceItems = items.filter(i => i.storageLocation === "spice_rack");
  const spiceStocked = spiceItems.filter(i => !isItemOut(i));
  const spiceOut = spiceItems.filter(i => isItemOut(i));

  // Render quantity control for an item
  const renderQuantityControl = (item: PantryItem) => {
    if (item.quantityType === "countable") {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUpdateQuantity(item, -1)}
            className="w-7 h-7 rounded-full bg-background hover:bg-[var(--color-accent)]/10 flex items-center justify-center text-secondary hover:text-accent transition-colors"
          >
            <MinusIcon />
          </button>
          <span className="text-primary font-medium min-w-[3rem] text-center">
            {item.quantity ?? 0}{item.unit ? ` ${item.unit}` : ""}
          </span>
          <button
            onClick={() => handleUpdateQuantity(item, 1)}
            className="w-7 h-7 rounded-full bg-background hover:bg-[var(--color-accent)]/10 flex items-center justify-center text-secondary hover:text-accent transition-colors"
          >
            <PlusIcon />
          </button>
        </div>
      );
    }

    if (item.quantityType === "bulk") {
      const level = item.bulkQuantity || "full";
      return (
        <button
          onClick={() => handleCycleBulk(item)}
          className="flex items-center gap-1"
          title="Tap to cycle: full > half > low > out"
        >
          {BULK_LEVELS.map((seg) => (
            <div
              key={seg}
              className={`w-5 h-3 rounded-sm transition-colors ${
                BULK_LEVELS.indexOf(seg) <= BULK_LEVELS.indexOf(level) && level !== "out"
                  ? BULK_COLORS[level]
                  : level === "out"
                  ? "bg-[var(--color-error)]/30"
                  : "bg-background"
              }`}
            />
          ))}
          <span className={`ml-1 text-xs font-medium capitalize ${level === "out" ? "text-error" : "text-secondary"}`}>
            {level}
          </span>
        </button>
      );
    }

    // Binary
    const isHave = item.binaryQuantity === "have";
    return (
      <button
        onClick={() => handleToggleBinary(item)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          isHave
            ? "bg-[var(--color-success)] text-white"
            : "bg-[var(--color-error)] text-white"
        }`}
      >
        {isHave ? "Have" : "Out"}
      </button>
    );
  };

  // Render a list item row
  const renderItemRow = (item: PantryItem) => {
    const out = isItemOut(item);
    return (
      <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${out ? "opacity-60" : ""}`}>
        <div className="flex-1 min-w-0">
          <span className="text-primary font-medium">{item.name}</span>
          {item.brand && <span className="text-secondary text-xs ml-2">({item.brand})</span>}
        </div>

        {/* Restock inline count input for countable out items */}
        {out && restockCountId === item.id ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={restockCountValue}
              onChange={e => setRestockCountValue(e.target.value)}
              className="input-field w-16 text-sm text-center py-1"
              min="0"
              step="any"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleRestockCountConfirm(item); if (e.key === "Escape") setRestockCountId(null); }}
            />
            {item.unit && <span className="text-xs text-secondary">{item.unit}</span>}
            <button onClick={() => handleRestockCountConfirm(item)} className="text-xs text-accent font-medium px-1">OK</button>
          </div>
        ) : out ? (
          <button
            onClick={() => handleRestock(item)}
            className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-all"
          >
            Restock
          </button>
        ) : (
          renderQuantityControl(item)
        )}

        <button
          onClick={() => setEditItem({
            id: item.id,
            name: item.name,
            brand: item.brand || "",
            category: item.category,
            storageLocation: item.storageLocation,
            quantityType: item.quantityType,
            quantity: item.quantity,
            unit: item.unit || "",
            restockThreshold: item.restockThreshold,
            bulkQuantity: item.bulkQuantity || "full",
            binaryQuantity: item.binaryQuantity || "have",
            notes: item.notes || "",
          })}
          className="text-secondary hover:text-accent transition-colors p-1"
          aria-label="Edit item"
        >
          <PencilIcon />
        </button>
        <button
          onClick={() => handleDelete(item.id)}
          className="text-secondary hover:text-error transition-colors p-1"
          aria-label="Delete item"
        >
          <TrashIcon />
        </button>
      </div>
    );
  };

  // Render spice rack grid view
  const renderSpiceRackGrid = () => (
    <div className="space-y-6">
      {spiceStocked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {spiceStocked.map(item => {
            const isHave = item.binaryQuantity !== "out" && item.bulkQuantity !== "out" && (item.quantity ?? 1) > 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.quantityType === "binary") handleToggleBinary(item);
                  else if (item.quantityType === "bulk") handleCycleBulk(item);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isHave
                    ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-primary"
                    : "bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-secondary"
                }`}
              >
                {item.name}
                {item.quantityType === "bulk" && item.bulkQuantity && (
                  <span className={`ml-1 text-xs ${BULK_BG[item.bulkQuantity]} px-1 rounded`}>
                    {item.bulkQuantity}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {spiceOut.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-secondary mb-2">Out of Stock</p>
          <div className="flex flex-wrap gap-2">
            {spiceOut.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.quantityType === "binary") handleToggleBinary(item);
                  else if (item.quantityType === "bulk") handleCycleBulk(item);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-secondary opacity-60"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {spiceItems.length === 0 && (
        <p className="text-center text-secondary py-8">No spices yet. Add some to get started.</p>
      )}
    </div>
  );

  // Render category sections
  const renderCategorySections = (grouped: Record<string, PantryItem[]>, dimmed?: boolean) =>
    Object.entries(grouped).map(([category, catItems]) => {
      const isCollapsed = collapsedCategories.has(category);
      return (
        <div key={category} className={`bg-surface border border-default rounded-xl overflow-hidden ${dimmed ? "opacity-60" : ""}`}>
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-4 hover:bg-background transition-colors"
          >
            <span className="font-semibold text-primary">
              {CATEGORY_LABELS[category as PantryCategory] || category} ({catItems.length})
            </span>
            <ChevronIcon open={!isCollapsed} />
          </button>
          {!isCollapsed && (
            <div className="border-t border-default divide-y divide-[var(--color-border)]">
              {catItems.map(renderItemRow)}
            </div>
          )}
        </div>
      );
    });

  return (
    <main className="max-w-6xl mx-auto p-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-colors mb-6"
        >
          <ArrowLeftIcon />
          <span>Back to home</span>
        </Link>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-primary">My Pantry</h1>
          <span className="text-secondary text-sm">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Location Tab Bar */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === "all"
              ? "bg-[var(--color-accent)] text-white"
              : "bg-surface text-secondary hover:text-primary border border-default"
          }`}
        >
          All
        </button>
        {STORAGE_LOCATIONS.map(loc => (
          <button
            key={loc}
            onClick={() => setActiveTab(loc)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === loc
                ? "bg-[var(--color-accent)] text-white"
                : "bg-surface text-secondary hover:text-primary border border-default"
            }`}
          >
            {STORAGE_LOCATION_LABELS[loc]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pantry items..."
          className="input-field w-full"
          style={{ paddingLeft: "3rem" }}
        />
      </div>

      {/* Messages */}
      {error && <div className="toast-error mb-6 animate-fade-in">{error}</div>}
      {success && <div className="toast-success mb-6 animate-fade-in">{success}</div>}

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-surface border border-default rounded-xl p-6 mb-6 animate-slide-up">
          <h3 className="font-semibold text-primary mb-4">Add Pantry Item</h3>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g. Olive Oil"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Brand (optional)</label>
                <input
                  type="text"
                  value={addBrand}
                  onChange={(e) => setAddBrand(e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g. Kirkland"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Category</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value as PantryCategory)}
                  className="input-field w-full"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Storage Location</label>
                <select
                  value={addStorageLocation}
                  onChange={(e) => setAddStorageLocation(e.target.value as StorageLocation)}
                  className="input-field w-full"
                >
                  {STORAGE_LOCATIONS.map(l => <option key={l} value={l}>{STORAGE_LOCATION_LABELS[l]}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Quantity Type</label>
              <div className="flex gap-2">
                {(["binary", "bulk", "countable"] as QuantityType[]).map(qt => (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => setAddQuantityType(qt)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      addQuantityType === qt
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-background text-secondary hover:text-primary"
                    }`}
                  >
                    {qt === "binary" ? "Have / Out" : qt === "bulk" ? "Bulk (Full/Half/Low)" : "Countable"}
                  </button>
                ))}
              </div>
            </div>

            {addQuantityType === "countable" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Quantity</label>
                  <input
                    type="number"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    className="input-field w-full"
                    min="0"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Unit</label>
                  <input
                    type="text"
                    value={addUnit}
                    onChange={(e) => setAddUnit(e.target.value)}
                    className="input-field w-full"
                    placeholder="e.g. lbs, oz, count"
                  />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Restock At</label>
                  <input
                    type="number"
                    value={addThreshold}
                    onChange={(e) => setAddThreshold(e.target.value)}
                    className="input-field w-full"
                    min="0"
                    step="any"
                  />
                </div>
              </div>
            )}

            {addQuantityType === "bulk" && (
              <div>
                <label className="block text-sm text-secondary mb-1">Stock Level</label>
                <div className="flex gap-2">
                  {BULK_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAddBulkQuantity(level)}
                      className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                        addBulkQuantity === level ? BULK_COLORS[level] : "bg-background text-secondary"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button type="submit" disabled={addSaving} className="btn-primary text-sm">
                {addSaving ? <span className="loading-spinner w-4 h-4" /> : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditItem(null)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary">Edit Item</h3>
              <button onClick={() => setEditItem(null)} className="text-secondary hover:text-primary"><XIcon /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Brand</label>
                <input
                  type="text"
                  value={editItem.brand}
                  onChange={e => setEditItem({ ...editItem, brand: e.target.value })}
                  className="input-field w-full"
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-secondary mb-1">Category</label>
                  <select
                    value={editItem.category}
                    onChange={e => setEditItem({ ...editItem, category: e.target.value as PantryCategory })}
                    className="input-field w-full"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Storage</label>
                  <select
                    value={editItem.storageLocation}
                    onChange={e => setEditItem({ ...editItem, storageLocation: e.target.value as StorageLocation })}
                    className="input-field w-full"
                  >
                    {STORAGE_LOCATIONS.map(l => <option key={l} value={l}>{STORAGE_LOCATION_LABELS[l]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Quantity Type</label>
                <div className="flex gap-2">
                  {(["binary", "bulk", "countable"] as QuantityType[]).map(qt => (
                    <button
                      key={qt}
                      type="button"
                      onClick={() => setEditItem({ ...editItem, quantityType: qt })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        editItem.quantityType === qt ? "bg-[var(--color-accent)] text-white" : "bg-background text-secondary"
                      }`}
                    >
                      {qt === "binary" ? "Have/Out" : qt === "bulk" ? "Bulk" : "Countable"}
                    </button>
                  ))}
                </div>
              </div>
              {editItem.quantityType === "countable" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-secondary mb-1">Qty</label>
                    <input
                      type="number"
                      value={editItem.quantity ?? ""}
                      onChange={e => setEditItem({ ...editItem, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                      className="input-field w-full"
                      min="0"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Unit</label>
                    <input
                      type="text"
                      value={editItem.unit}
                      onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Restock</label>
                    <input
                      type="number"
                      value={editItem.restockThreshold ?? ""}
                      onChange={e => setEditItem({ ...editItem, restockThreshold: e.target.value ? parseFloat(e.target.value) : null })}
                      className="input-field w-full"
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
              )}
              {editItem.quantityType === "bulk" && (
                <div>
                  <label className="block text-sm text-secondary mb-1">Stock Level</label>
                  <div className="flex gap-2">
                    {BULK_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEditItem({ ...editItem, bulkQuantity: level })}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                          editItem.bulkQuantity === level ? BULK_COLORS[level] : "bg-background text-secondary"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {editItem.quantityType === "binary" && (
                <div>
                  <label className="block text-sm text-secondary mb-1">Status</label>
                  <div className="flex gap-2">
                    {(["have", "out"] as BinaryQuantity[]).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEditItem({ ...editItem, binaryQuantity: val })}
                        className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                          editItem.binaryQuantity === val
                            ? val === "have" ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-error)] text-white"
                            : "bg-background text-secondary"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-secondary mb-1">Notes</label>
                <textarea
                  value={editItem.notes}
                  onChange={e => setEditItem({ ...editItem, notes: e.target.value })}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
                <button onClick={handleEditSave} disabled={editSaving} className="btn-primary text-sm">
                  {editSaving ? <span className="loading-spinner w-4 h-4" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Overlay */}
      {scanStep !== "idle" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleScanCancel}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary text-lg">
                {scanStep === "upload" && "Scan Your Pantry"}
                {scanStep === "processing" && "Analyzing Photos..."}
                {scanStep === "review" && "Review Scanned Items"}
              </h3>
              <button onClick={handleScanCancel} className="text-secondary hover:text-primary"><XIcon /></button>
            </div>

            {scanStep === "upload" && (
              <div className="space-y-4">
                <p className="text-secondary text-sm">Take photos of your pantry, fridge, or shelves. We&apos;ll identify the items for you.</p>

                <div>
                  <label className="block text-sm text-secondary mb-1">What are you scanning?</label>
                  <div className="flex gap-2 flex-wrap">
                    {STORAGE_LOCATIONS.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setScanLocation(loc)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          scanLocation === loc
                            ? "bg-[var(--color-accent)] text-white"
                            : "bg-background text-secondary hover:text-primary"
                        }`}
                      >
                        {STORAGE_LOCATION_LABELS[loc]}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScanFilesSelected}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-default rounded-xl text-secondary hover:text-accent hover:border-accent transition-colors flex flex-col items-center gap-2"
                >
                  <CameraIcon />
                  <span>Choose photos (max 5)</span>
                </button>
                {scanPreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {scanPreviews.map((src, i) => (
                      <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={handleScanCancel} className="px-4 py-2 text-sm text-secondary">Cancel</button>
                  <button
                    onClick={handleScanUpload}
                    disabled={scanImages.length === 0}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    Scan Photos
                  </button>
                </div>
              </div>
            )}

            {scanStep === "processing" && (
              <div className="text-center py-12">
                <div className="loading-spinner w-10 h-10 mx-auto mb-4" />
                <p className="text-secondary">Identifying pantry items...</p>
              </div>
            )}

            {scanStep === "review" && (() => {
              const confident = scanItems.filter(item => (item.confidence ?? 0.7) >= 0.7);
              const medium = scanItems.filter(item => (item.confidence ?? 0.7) >= 0.5 && (item.confidence ?? 0.7) < 0.7);
              const uncertain = scanItems.filter(item => (item.confidence ?? 0.7) < 0.5);

              const renderScanRow = (item: ScanItem, i: number) => {
                const globalIdx = scanItems.indexOf(item);
                const conf = item.confidence ?? 0.7;
                const confColor = conf >= 0.7 ? "text-[var(--color-success)]" : conf >= 0.5 ? "text-yellow-500" : "text-[var(--color-error)]";
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${item.selected ? "bg-background" : "opacity-50"}`}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => {
                        const updated = [...scanItems];
                        updated[globalIdx] = { ...updated[globalIdx], selected: !updated[globalIdx].selected };
                        setScanItems(updated);
                      }}
                      className="ingredient-check mt-2"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...scanItems];
                            updated[globalIdx] = { ...updated[globalIdx], name: e.target.value, canonicalName: toCanonicalName(e.target.value) };
                            setScanItems(updated);
                          }}
                          className="input-field flex-1 text-sm font-medium"
                        />
                        <span className={`text-xs font-medium ${confColor}`} title={`Confidence: ${Math.round(conf * 100)}%`}>
                          {conf >= 0.7 ? "\u2713" : conf >= 0.5 ? "?" : "??"}
                        </span>
                      </div>
                      {item.brand && (
                        <p className="text-xs text-secondary">{item.brand}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={item.category}
                          onChange={(e) => {
                            const updated = [...scanItems];
                            updated[globalIdx] = { ...updated[globalIdx], category: e.target.value as PantryCategory };
                            setScanItems(updated);
                          }}
                          className="input-field text-xs w-32"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                        </select>
                        {item.quantityType === "countable" ? (
                          <span className="text-xs text-secondary whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </span>
                        ) : item.quantityType === "bulk" ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${BULK_COLORS[item.bulkQuantity || "full"]}`}>
                            {item.bulkQuantity || "full"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success)] text-white">
                            Have
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-secondary italic">{item.notes}</p>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div className="space-y-4">
                  <p className="text-secondary text-sm">Review the items below. Uncheck any you don&apos;t want to add.</p>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {/* High confidence items */}
                    {confident.length > 0 && confident.map((item, i) => renderScanRow(item, i))}

                    {/* Medium confidence items */}
                    {medium.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs font-semibold text-yellow-500">?</span>
                          <span className="text-xs font-semibold text-secondary">Less certain ({medium.length})</span>
                        </div>
                        {medium.map((item, i) => renderScanRow(item, i))}
                      </>
                    )}

                    {/* Low confidence items */}
                    {uncertain.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs font-semibold text-[var(--color-error)]">??</span>
                          <span className="text-xs font-semibold text-secondary">AI wasn&apos;t sure ({uncertain.length})</span>
                        </div>
                        {uncertain.map((item, i) => renderScanRow(item, i))}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={handleScanCancel} className="px-4 py-2 text-sm text-secondary">Cancel</button>
                    <button
                      onClick={handleScanSave}
                      disabled={scanSaving || scanItems.filter(i => i.selected).length === 0}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {scanSaving ? (
                        <span className="flex items-center gap-2"><span className="loading-spinner w-4 h-4" /> Saving...</span>
                      ) : (
                        `Add ${scanItems.filter(i => i.selected).length} Items`
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="loading-spinner w-10 h-10 mx-auto mb-4" />
          <p className="text-secondary">Loading pantry...</p>
        </div>
      )}

      {/* Onboarding Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3">Stock Your Pantry</h2>
          <p className="text-secondary mb-8">
            Track what you have on hand so you know what to buy and what you can cook.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setScanStep("upload"); }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <CameraIcon /> Scan Pantry Photos
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 bg-surface border border-default rounded-lg text-primary font-semibold hover:bg-background transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon /> Add Items Manually
            </button>
            <Link
              href="/"
              className="block text-sm text-secondary hover:text-accent transition-colors pt-2"
            >
              I&apos;ll do this later
            </Link>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!loading && items.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-secondary">
          <p className="text-lg">No items match your search{activeTab !== "all" ? ` in ${STORAGE_LOCATION_LABELS[activeTab]}` : ""}</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {/* Spice Rack tab gets special grid view */}
          {isSpiceRackTab ? (
            <div className="bg-surface border border-default rounded-xl p-4">
              <h3 className="font-semibold text-primary mb-4">Spice Rack</h3>
              {renderSpiceRackGrid()}
            </div>
          ) : (
            <>
              {/* Stocked items */}
              {renderCategorySections(stockedGrouped)}

              {/* Out items */}
              {outItems.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mt-6 mb-2">
                    <hr className="flex-1 border-default" />
                    <span className="text-sm font-semibold text-secondary">Out of Stock ({outItems.length})</span>
                    <hr className="flex-1 border-default" />
                  </div>
                  {renderCategorySections(outGrouped, true)}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* FAB */}
      {items.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          {showFab && (
            <div className="mb-3 space-y-2 animate-slide-up">
              <button
                onClick={() => { setScanStep("upload"); setShowFab(false); }}
                className="flex items-center gap-2 bg-surface border border-default rounded-lg px-4 py-3 shadow-lg text-sm font-medium text-primary hover:bg-background transition-colors w-full"
              >
                <CameraIcon /> Scan Photos
              </button>
              <button
                onClick={() => { setShowAddForm(true); setShowFab(false); }}
                className="flex items-center gap-2 bg-surface border border-default rounded-lg px-4 py-3 shadow-lg text-sm font-medium text-primary hover:bg-background transition-colors w-full"
              >
                <PlusIcon /> Add Manually
              </button>
            </div>
          )}
          <button
            onClick={() => setShowFab(!showFab)}
            className={`w-14 h-14 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center transition-transform ${showFab ? "rotate-45" : ""}`}
          >
            <PlusIcon />
          </button>
        </div>
      )}
    </main>
  );
}
