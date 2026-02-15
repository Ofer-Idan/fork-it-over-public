"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Recipe, ShoppingApp, DeductionMatch, ConfirmedDeduction, PantryItem } from "@/lib/types";
import { formatIngredient } from "@/lib/parser/ingredients";
import { matchIngredientToPantry, type PantryMatchStatus } from "@/lib/pantry/matching";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SavedRecipe {
  title: string;
  sourceUrl: string;
  image?: string;
  savedAt: number;
}

const STORAGE_KEY = "hamburgler_saved_recipes";

// Icons
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

const ForkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 9v1.5m0 4.5v6m-3-15v3a3 3 0 006 0V3m-9 18h12" />
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const PantryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const CookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
  </svg>
);

const ArchiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PinterestIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345c-.091.379-.293 1.194-.333 1.361-.052.22-.174.267-.401.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [url, setUrl] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [sendingTo, setSendingTo] = useState<ShoppingApp | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loggingOut, setLoggingOut] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [showCookModal, setShowCookModal] = useState(false);
  const [cookMatches, setCookMatches] = useState<DeductionMatch[]>([]);
  const [cookLoading, setCookLoading] = useState(false);
  const [cookSuccess, setCookSuccess] = useState<string | null>(null);
  const [cookSelectedIds, setCookSelectedIds] = useState<Set<number>>(new Set());
  const [cookLowStock, setCookLowStock] = useState<{ id: string; name: string; category?: string; quantityType?: string; bulkQuantity?: string; quantity?: number; unit?: string; binaryQuantity?: string }[]>([]);
  const [cookOutItems, setCookOutItems] = useState<{ id: string; name: string }[]>([]);
  const [cookOutSelected, setCookOutSelected] = useState<Set<string>>(new Set());
  const [cookShoppingSending, setCookShoppingSending] = useState<ShoppingApp | null>(null);
  const [cookShoppingSuccess, setCookShoppingSuccess] = useState<string | null>(null);
  const [unmatchedIngredients, setUnmatchedIngredients] = useState<{ original: string; selected: boolean }[]>([]);
  const [addingUnmatched, setAddingUnmatched] = useState(false);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const router = useRouter();

  const MULTIPLIER_OPTIONS = [0.5, 1, 2, 3] as const;

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Load saved recipes and theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedRecipes(JSON.parse(saved));
      }
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark" || storedTheme === "light") {
        setTheme(storedTheme);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Save recipe to history
  const saveToHistory = (recipe: Recipe) => {
    const newSaved: SavedRecipe = {
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
      image: recipe.image,
      savedAt: Date.now(),
    };

    setSavedRecipes((prev) => {
      const filtered = prev.filter((r) => r.sourceUrl !== recipe.sourceUrl);
      const updated = [newSaved, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  };

  const extractFromUrl = useCallback(async (recipeUrl: string) => {
    setLoading(true);
    setError(null);
    setRecipe(null);
    setSendSuccess(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: recipeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract recipe");
      }

      setRecipe(data.recipe);
      setMultiplier(1);
      setSelectedIngredients(
        new Set(data.recipe.ingredients.map((_: unknown, i: number) => i))
      );
      saveToHistory(data.recipe);

      // Fetch pantry items for ingredient matching
      try {
        const pantryRes = await fetch("/api/pantry");
        if (pantryRes.ok) {
          const pantryData = await pantryRes.json();
          setPantryItems(pantryData.items || []);
        }
      } catch {
        // Pantry fetch failure is non-critical
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    extractFromUrl(url);
  };

  // Auto-extract if ?url= param is present (e.g. from archive)
  const searchParams = useSearchParams();
  useEffect(() => {
    const paramUrl = searchParams.get("url");
    if (paramUrl) {
      setUrl(paramUrl);
      extractFromUrl(paramUrl);
    }
  }, [searchParams, extractFromUrl]);

  const handleLoadSaved = (savedRecipe: SavedRecipe) => {
    setUrl(savedRecipe.sourceUrl);
    setShowHistory(false);
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }, 100);
  };

  const toggleIngredient = (index: number) => {
    const newSelected = new Set(selectedIngredients);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIngredients(newSelected);
  };

  const selectAll = () => {
    if (recipe) {
      setSelectedIngredients(new Set(recipe.ingredients.map((_, i) => i)));
    }
  };

  const selectNone = () => {
    setSelectedIngredients(new Set());
  };

  const selectMissingOnly = () => {
    if (!recipe) return;
    const missing = new Set<number>();
    recipe.ingredients.forEach((ing, i) => {
      const pantryMatch = pantryItems.length > 0 && ing.name
        ? matchIngredientToPantry(ing.name, pantryItems)
        : null;
      if (!pantryMatch || pantryMatch.status === "out" || pantryMatch.status === "low" || !pantryMatch.status) {
        missing.add(i);
      }
    });
    setSelectedIngredients(missing);
  };

  const handleSend = async (app: ShoppingApp) => {
    if (!recipe) return;

    setSendingTo(app);
    setSendSuccess(null);
    setError(null);

    const ingredients = recipe.ingredients
      .filter((_, i) => selectedIngredients.has(i))
      .map((ing) => formatIngredient(ing, multiplier));

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          app,
          recipeUrl: app === "bring" ? recipe.sourceUrl : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to send to ${app}`);
      }

      setSendSuccess(`${ingredients.length} ingredients sent to ${app === "bring" ? "Bring!" : "Todoist"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSendingTo(null);
    }
  };

  const handleCookThis = async () => {
    if (!recipe) return;
    setShowCookModal(true);
    setCookLoading(true);
    setCookSuccess(null);
    setCookMatches([]);
    setCookLowStock([]);
    setCookOutItems([]);
    setCookOutSelected(new Set());
    setCookShoppingSuccess(null);
    setUnmatchedIngredients([]);

    try {
      const res = await fetch("/api/pantry/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: recipe.ingredients, multiplier }),
      });
      const data = await res.json();
      if (res.ok && data.matches) {
        setCookMatches(data.matches);
        // Pre-select all matched items
        const selected = new Set<number>();
        data.matches.forEach((m: DeductionMatch, i: number) => {
          if (m.action !== "no_match") selected.add(i);
        });
        setCookSelectedIds(selected);
        // Collect unmatched ingredients for CTA
        const unmatched = data.matches
          .filter((m: DeductionMatch) => m.action === "no_match" && !m.pantryItemId)
          .map((m: DeductionMatch) => ({ original: m.recipeIngredient, selected: false }));
        setUnmatchedIngredients(unmatched);
      } else {
        setError(data.error || "Failed to match ingredients");
        setShowCookModal(false);
      }
    } catch {
      setError("Failed to match ingredients");
      setShowCookModal(false);
    } finally {
      setCookLoading(false);
    }
  };

  const handleCookConfirm = async () => {
    const deductions: ConfirmedDeduction[] = cookMatches
      .filter((_, i) => cookSelectedIds.has(i))
      .filter(m => m.action !== "no_match" && m.pantryItemId)
      .map(m => ({
        pantryItemId: m.pantryItemId as string,
        action: m.action as "deduct" | "reduce_bulk" | "set_binary_out",
        deductQuantity: m.deductQuantity,
        newBulkQuantity: m.newBulkQuantity,
      }));

    if (deductions.length === 0) {
      setShowCookModal(false);
      return;
    }

    setCookLoading(true);
    try {
      // Add selected unmatched ingredients to pantry as "out"
      const unmatchedToAdd = unmatchedIngredients.filter(u => u.selected);
      if (unmatchedToAdd.length > 0) {
        await fetch("/api/pantry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: unmatchedToAdd.map(u => ({
              name: u.original,
              canonicalName: u.original.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_"),
              category: "other" as const,
              quantityType: "binary" as const,
              binaryQuantity: "out" as const,
            })),
          }),
        });
      }

      const res = await fetch("/api/pantry/deduct/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions }),
      });
      const data = await res.json();
      if (res.ok) {
        setCookLowStock(data.lowStockItems || []);
        // Extract items that are now "out"
        const outItems = (data.lowStockItems || []).filter((item: { quantityType?: string; bulkQuantity?: string; binaryQuantity?: string; quantity?: number }) => {
          if (item.quantityType === "bulk") return item.bulkQuantity === "out";
          if (item.quantityType === "binary") return item.binaryQuantity === "out";
          if (item.quantityType === "countable") return (item.quantity ?? 0) === 0;
          return false;
        });
        setCookOutItems(outItems);
        setCookOutSelected(new Set(outItems.map((item: { id: string }) => item.id)));
        setCookSuccess(`Pantry updated! ${deductions.length} item${deductions.length !== 1 ? "s" : ""} deducted.`);
        setCookMatches([]);

        // Refresh pantry state so indicators update
        try {
          const pantryRes = await fetch("/api/pantry");
          if (pantryRes.ok) {
            const pantryData = await pantryRes.json();
            setPantryItems(pantryData.items || []);
          }
        } catch {
          // Non-critical
        }
      } else {
        setError(data.error || "Failed to apply deductions");
        setShowCookModal(false);
      }
    } catch {
      setError("Failed to apply deductions");
      setShowCookModal(false);
    } finally {
      setCookLoading(false);
    }
  };

  const handleCookShoppingSend = async (app: ShoppingApp) => {
    const items = cookOutItems.filter(item => cookOutSelected.has(item.id));
    if (items.length === 0) return;
    setCookShoppingSending(app);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: items.map(item => item.name),
          app,
        }),
      });
      if (res.ok) {
        setCookShoppingSuccess(`${items.length} item${items.length !== 1 ? "s" : ""} sent to ${app === "bring" ? "Bring!" : "Todoist"}`);
      } else {
        const data = await res.json();
        setError(data.error || `Failed to send to ${app}`);
      }
    } catch {
      setError(`Failed to send to ${app}`);
    } finally {
      setCookShoppingSending(null);
    }
  };

  const clearHistory = () => {
    setSavedRecipes([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <main className="max-w-6xl mx-auto p-6 pb-20">
      {/* Top Bar */}
      <div className="flex justify-end gap-2 mb-4">
        <Link
          href="/pantry"
          className="theme-toggle"
          aria-label="My pantry"
        >
          <PantryIcon />
        </Link>
        <Link
          href="/archive"
          className="theme-toggle"
          aria-label="Recipe archive"
        >
          <ArchiveIcon />
        </Link>
        <Link
          href="/settings"
          className="theme-toggle"
          aria-label="Settings"
        >
          <SettingsIcon />
        </Link>
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="theme-toggle"
          aria-label="Sign out"
        >
          {loggingOut ? <span className="loading-spinner w-5 h-5" /> : <LogoutIcon />}
        </button>
      </div>

      {/* Header */}
      <header className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-accent"><ForkIcon /></span>
          <h1 className="text-4xl font-bold text-primary">
            Fork It Over
          </h1>
        </div>
        <p className="text-lg text-secondary">
          No fluff. Just food.
        </p>
      </header>

      {/* URL Input */}
      <form onSubmit={handleExtract} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a recipe URL..."
            className="input-fun flex-1"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="loading-spinner" />
                Forking...
              </span>
            ) : (
              "Fork This Recipe"
            )}
          </button>
        </div>
      </form>

      {/* Recent Recipes Toggle */}
      {savedRecipes.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-secondary hover:text-accent transition-colors text-sm font-medium"
          >
            <span>Recent Recipes ({savedRecipes.length})</span>
            <ChevronIcon open={showHistory} />
          </button>

          {showHistory && (
            <div className="mt-4 p-4 bg-surface rounded-xl border border-default animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary">
                  Recent Recipes
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-secondary hover:text-error transition-colors"
                >
                  Clear all
                </button>
              </div>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {savedRecipes.map((saved, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleLoadSaved(saved)}
                      className="w-full text-left p-3 rounded-lg hover:bg-background transition-colors flex items-center gap-3 group"
                    >
                      {saved.image ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-background">
                          <Image
                            src={saved.image}
                            alt=""
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                          <ForkIcon />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary truncate group-hover:text-accent transition-colors">
                          {saved.title}
                        </p>
                        <p className="text-xs text-secondary">{formatDate(saved.savedAt)}</p>
                      </div>
                      <span className="text-secondary group-hover:text-accent transition-colors">
                        <ArrowRightIcon />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16 animate-slide-up">
          <div className="loading-spinner w-12 h-12 mx-auto mb-6" />
          <p className="text-lg text-secondary">Extracting recipe...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 toast-error animate-fade-in">
          {error}
        </div>
      )}

      {/* Success Message */}
      {sendSuccess && (
        <div className="mb-8 p-4 toast-success animate-fade-in">
          {sendSuccess}
        </div>
      )}

      {/* Recipe Card */}
      {recipe && !loading && (
        <div className="recipe-card animate-fade-in">
          {recipe.image && (
            <div className="relative h-72 w-full">
              <Image
                src={recipe.image}
                alt={recipe.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <h2 className="absolute bottom-6 left-6 right-6 text-2xl font-bold text-white">
                {recipe.title}
              </h2>
            </div>
          )}

          <div className="p-6">
            {!recipe.image && (
              <h2 className="text-2xl font-bold text-primary mb-4">
                {recipe.title}
              </h2>
            )}

            {recipe.description && (
              <p className="text-secondary mb-6">{recipe.description}</p>
            )}

            {/* Recipe Meta */}
            <div className="flex flex-wrap gap-3 mb-6">
              {recipe.prepTime && (
                <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full text-sm text-secondary">
                  <ClockIcon /> Prep: {recipe.prepTime}
                </div>
              )}
              {recipe.cookTime && (
                <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full text-sm text-secondary">
                  <ClockIcon /> Cook: {recipe.cookTime}
                </div>
              )}
              <div className="flex items-center gap-1 bg-background rounded-full text-sm text-secondary">
                {MULTIPLIER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setMultiplier(opt)}
                    className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                      multiplier === opt
                        ? "bg-[var(--color-accent)] text-white"
                        : "hover:bg-[var(--color-accent)]/10"
                    }`}
                  >
                    {opt}x
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary">
                    Ingredients
                  </h3>
                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={selectAll}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      All
                    </button>
                    <span className="text-secondary">|</span>
                    <button
                      onClick={selectNone}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      None
                    </button>
                    {pantryItems.length > 0 && (
                      <>
                        <span className="text-secondary">|</span>
                        <button
                          onClick={selectMissingOnly}
                          className="text-accent hover:text-accent-hover transition-colors"
                        >
                          Missing
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, i) => {
                    const showGroupHeader =
                      ing.group &&
                      (i === 0 || recipe.ingredients[i - 1].group !== ing.group);
                    const pantryMatch = pantryItems.length > 0 && ing.name
                      ? matchIngredientToPantry(ing.name, pantryItems)
                      : null;
                    const statusIcon: Record<PantryMatchStatus & string, { icon: string; color: string; title: string }> = {
                      stocked: { icon: "\u2713", color: "text-[var(--color-success)]", title: "In pantry" },
                      low: { icon: "\u26A0", color: "text-yellow-500", title: "Low stock" },
                      out: { icon: "\u2717", color: "text-[var(--color-error)]", title: "Out of stock" },
                    };
                    const indicator = pantryMatch?.status ? statusIcon[pantryMatch.status] : null;
                    return (
                      <li key={i}>
                        {showGroupHeader && (
                          <p className={`text-sm font-semibold text-secondary uppercase tracking-wide ${i === 0 ? "mb-2" : "mt-4 mb-2"}`}>
                            {ing.group}
                          </p>
                        )}
                        <div
                          className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                            selectedIngredients.has(i)
                              ? "bg-background"
                              : "bg-transparent"
                          }`}
                          onClick={() => toggleIngredient(i)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIngredients.has(i)}
                            onChange={() => toggleIngredient(i)}
                            className="ingredient-check mt-0.5"
                          />
                          <span
                            className={`flex-1 transition-colors ${
                              selectedIngredients.has(i)
                                ? "text-primary"
                                : "text-secondary line-through"
                            }`}
                          >
                            {formatIngredient(ing, multiplier)}
                          </span>
                          {indicator && (
                            <span className={`flex-shrink-0 text-xs font-medium flex items-center gap-1 ${indicator.color}`} title={indicator.title}>
                              <span className="font-bold">{indicator.icon}</span>
                              <span className="hidden sm:inline">
                                {pantryMatch?.status === "stocked" && "(In pantry)"}
                                {pantryMatch?.status === "low" && "(Running low)"}
                                {pantryMatch?.status === "out" && "(Out)"}
                              </span>
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Send Buttons */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleSend("bring")}
                    disabled={sendingTo !== null || selectedIngredients.size === 0}
                    className="w-full py-3 bg-[var(--color-success)] text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {sendingTo === "bring" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="loading-spinner" /> Sending...
                      </span>
                    ) : (
                      "Send to Bring!"
                    )}
                  </button>
                  <button
                    onClick={() => handleSend("todoist")}
                    disabled={sendingTo !== null || selectedIngredients.size === 0}
                    className="w-full py-3 bg-[#E44332] text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {sendingTo === "todoist" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="loading-spinner" /> Sending...
                      </span>
                    ) : (
                      "Send to Todoist"
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Instructions
                </h3>
                <ol className="space-y-6">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-4 bg-background p-4 rounded-lg">
                      <span className="flex-shrink-0 w-8 h-8 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </span>
                      <p className="text-secondary leading-loose pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Notes */}
            {recipe.notes && recipe.notes.length > 0 && (
              <div className="mt-8 p-4 bg-background rounded-lg border border-default">
                <h3 className="text-lg font-semibold text-primary mb-3">
                  Notes
                </h3>
                <ul className="space-y-2">
                  {recipe.notes.map((note, i) => (
                    <li key={i} className="flex gap-3 text-secondary">
                      <span className="text-accent">•</span>
                      <p className="leading-relaxed">{note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-default flex items-center justify-between">
              <div className="flex items-center gap-4">
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-secondary hover:text-accent transition-colors flex items-center gap-2"
                >
                  <LinkIcon /> View original
                </a>
                <a
                  href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(recipe.sourceUrl)}&media=${encodeURIComponent(recipe.image || "")}&description=${encodeURIComponent(recipe.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-secondary hover:text-accent transition-colors flex items-center gap-2"
                >
                  <PinterestIcon /> Pin it
                </a>
                <button
                  onClick={handleCookThis}
                  className="text-sm text-secondary hover:text-accent transition-colors flex items-center gap-2"
                >
                  <CookIcon /> I Cooked This
                </button>
              </div>
              <span className="text-sm text-secondary">
                Fork It Over
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cook Modal */}
      {showCookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowCookModal(false); setCookSuccess(null); }}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-primary text-lg">I Cooked This</h3>
              <button
                onClick={() => { setShowCookModal(false); setCookSuccess(null); }}
                className="text-secondary hover:text-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cookLoading && !cookSuccess && (
              <div className="text-center py-12">
                <div className="loading-spinner w-10 h-10 mx-auto mb-4" />
                <p className="text-secondary">Matching ingredients to your pantry...</p>
              </div>
            )}

            {!cookLoading && cookMatches.length > 0 && !cookSuccess && (
              <div className="space-y-3">
                <p className="text-secondary text-sm">Review the deductions below and confirm.</p>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {cookMatches.filter(m => m.action !== "no_match").map((match, i) => {
                    const origIdx = cookMatches.indexOf(match);
                    return (
                      <div
                        key={origIdx}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          cookSelectedIds.has(origIdx) ? "bg-background" : "opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={cookSelectedIds.has(origIdx)}
                          onChange={() => {
                            const next = new Set(cookSelectedIds);
                            if (next.has(origIdx)) next.delete(origIdx);
                            else next.add(origIdx);
                            setCookSelectedIds(next);
                          }}
                          className="ingredient-check"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-primary text-sm font-medium">{match.recipeIngredient}</p>
                          {match.action === "deduct" && match.pantryItemName && (
                            <p className="text-secondary text-xs">
                              {match.pantryItemName}: deduct {match.deductQuantity}
                            </p>
                          )}
                          {match.action === "reduce_bulk" && match.pantryItemName && (
                            <p className="text-secondary text-xs">
                              {match.pantryItemName}: &rarr; {match.newBulkQuantity}
                            </p>
                          )}
                          {match.action === "set_binary_out" && match.pantryItemName && (
                            <p className="text-secondary text-xs">
                              {match.pantryItemName}: &rarr; out
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Unmatched ingredients CTA */}
                  {unmatchedIngredients.length > 0 && (
                    <div className="border-t border-default pt-3 mt-3">
                      <p className="text-sm font-semibold text-secondary mb-2">Not in your pantry — add them?</p>
                      {unmatchedIngredients.map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                          <input
                            type="checkbox"
                            checked={u.selected}
                            onChange={() => {
                              const updated = [...unmatchedIngredients];
                              updated[i] = { ...updated[i], selected: !updated[i].selected };
                              setUnmatchedIngredients(updated);
                            }}
                            className="ingredient-check"
                          />
                          <span className="text-sm text-secondary">{u.original}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowCookModal(false)} className="px-4 py-2 text-sm text-secondary">Cancel</button>
                  <button
                    onClick={handleCookConfirm}
                    disabled={cookSelectedIds.size === 0 && unmatchedIngredients.filter(u => u.selected).length === 0}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    Update Pantry
                  </button>
                </div>
              </div>
            )}

            {cookSuccess && (
              <div className="space-y-4">
                <div className="toast-success">{cookSuccess}</div>

                {/* Shopping list prompt for out-of-stock items */}
                {cookOutItems.length > 0 && !cookShoppingSuccess && (
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-sm font-semibold text-primary mb-2">Out of stock — add to shopping list?</p>
                    <div className="space-y-1 mb-3">
                      {cookOutItems.map(item => (
                        <label key={item.id} className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cookOutSelected.has(item.id)}
                            onChange={() => {
                              const next = new Set(cookOutSelected);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              setCookOutSelected(next);
                            }}
                            className="ingredient-check"
                          />
                          {item.name}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCookShoppingSend("bring")}
                        disabled={cookShoppingSending !== null || cookOutSelected.size === 0}
                        className="flex-1 py-2 bg-[var(--color-success)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {cookShoppingSending === "bring" ? (
                          <span className="flex items-center justify-center gap-2"><span className="loading-spinner w-3 h-3" /> Sending...</span>
                        ) : "Add to Bring!"}
                      </button>
                      <button
                        onClick={() => handleCookShoppingSend("todoist")}
                        disabled={cookShoppingSending !== null || cookOutSelected.size === 0}
                        className="flex-1 py-2 bg-[#E44332] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {cookShoppingSending === "todoist" ? (
                          <span className="flex items-center justify-center gap-2"><span className="loading-spinner w-3 h-3" /> Sending...</span>
                        ) : "Add to Todoist"}
                      </button>
                    </div>
                    <button
                      onClick={() => setCookOutItems([])}
                      className="text-xs text-secondary hover:text-primary mt-2 transition-colors"
                    >
                      Not now
                    </button>
                  </div>
                )}

                {cookShoppingSuccess && (
                  <div className="toast-success text-sm">{cookShoppingSuccess}</div>
                )}

                {/* Remaining low stock items (not out) */}
                {cookLowStock.filter(item => {
                  if (item.quantityType === "bulk") return item.bulkQuantity !== "out";
                  if (item.quantityType === "binary") return item.binaryQuantity !== "out";
                  if (item.quantityType === "countable") return (item.quantity ?? 0) > 0;
                  return true;
                }).length > 0 && (
                  <div className="bg-background rounded-lg p-4">
                    <p className="text-sm font-semibold text-primary mb-2">Running low:</p>
                    <ul className="space-y-1">
                      {cookLowStock.filter(item => {
                        if (item.quantityType === "bulk") return item.bulkQuantity !== "out";
                        if (item.quantityType === "binary") return item.binaryQuantity !== "out";
                        if (item.quantityType === "countable") return (item.quantity ?? 0) > 0;
                        return true;
                      }).map((item, i) => (
                        <li key={i} className="text-sm text-secondary flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          {item.name}
                          {item.bulkQuantity && ` (${item.bulkQuantity})`}
                          {item.quantity != null && ` (${item.quantity}${item.unit ? ` ${item.unit}` : ""})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => { setShowCookModal(false); setCookSuccess(null); setCookShoppingSuccess(null); }}
                    className="btn-primary text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State / Getting Started Guide */}
      {!recipe && !loading && !error && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mb-4 text-accent flex justify-center">
              <ForkIcon />
            </div>
            <p className="text-lg text-secondary">Paste a recipe URL above to get started</p>
          </div>

          <div className="bg-surface border border-default rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-2">What is Fork It Over?</h2>
              <p className="text-secondary text-sm leading-relaxed">
                Fork It Over strips away the ads, pop-ups, and life stories from recipe websites.
                Paste any recipe URL and get a clean view with just the ingredients and instructions.
                Send ingredients straight to your shopping list app.
              </p>
            </div>

            <hr className="border-default" />

            <div>
              <h3 className="font-semibold text-primary mb-3">How it works</h3>
              <ol className="space-y-3">
                <li className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                  <span className="text-secondary pt-0.5"><strong className="text-primary">Paste a URL</strong> from any recipe website and click "Fork This Recipe"</span>
                </li>
                <li className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                  <span className="text-secondary pt-0.5"><strong className="text-primary">Review the recipe</strong> -- ingredients, instructions, and notes, all ad-free</span>
                </li>
                <li className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                  <span className="text-secondary pt-0.5"><strong className="text-primary">Select ingredients</strong> and send them to Bring! or Todoist with one click</span>
                </li>
              </ol>
            </div>

            <hr className="border-default" />

            <div>
              <h3 className="font-semibold text-primary mb-3">Top bar icons</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="theme-toggle pointer-events-none"><PantryIcon /></span>
                  <span className="text-secondary"><strong className="text-primary">Pantry</strong> -- track what you have on hand</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="theme-toggle pointer-events-none"><ArchiveIcon /></span>
                  <span className="text-secondary"><strong className="text-primary">Archive</strong> -- browse all your saved recipes</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="theme-toggle pointer-events-none"><SettingsIcon /></span>
                  <span className="text-secondary"><strong className="text-primary">Settings</strong> -- connect Bring! or Todoist</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="theme-toggle pointer-events-none">{theme === "light" ? <MoonIcon /> : <SunIcon />}</span>
                  <span className="text-secondary"><strong className="text-primary">Theme</strong> -- toggle dark/light mode</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="theme-toggle pointer-events-none"><LogoutIcon /></span>
                  <span className="text-secondary"><strong className="text-primary">Sign out</strong> -- log out of your account</span>
                </div>
              </div>
            </div>

            <hr className="border-default" />

            <div className="text-sm text-secondary">
              <strong className="text-primary">Tip:</strong> Head to{" "}
              <Link href="/settings" className="text-accent hover:underline">Settings</Link>
              {" "}first to connect your Bring! or Todoist account so you can send ingredients directly to your shopping list.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
