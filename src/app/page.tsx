"use client";

import { useState, useEffect } from "react";
import type { Recipe, ShoppingApp } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

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

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
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

const ArchiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

export default function Home() {
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

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecipe(null);
    setSendSuccess(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract recipe");
      }

      setRecipe(data.recipe);
      setSelectedIngredients(
        new Set(data.recipe.ingredients.map((_: unknown, i: number) => i))
      );
      saveToHistory(data.recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSend = async (app: ShoppingApp) => {
    if (!recipe) return;

    setSendingTo(app);
    setSendSuccess(null);
    setError(null);

    const ingredients = recipe.ingredients
      .filter((_, i) => selectedIngredients.has(i))
      .map((ing) => ing.original);

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
    <main className="max-w-4xl mx-auto p-6 pb-20">
      {/* Top Bar */}
      <div className="flex justify-end gap-2 mb-4">
        <Link
          href="/archive"
          className="theme-toggle"
          aria-label="Recipe archive"
        >
          <ArchiveIcon />
        </Link>
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
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
              {recipe.servings && (
                <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full text-sm text-secondary">
                  <UsersIcon /> Serves: {recipe.servings}
                </div>
              )}
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
                  </div>
                </div>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, i) => (
                    <li
                      key={i}
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
                        className={`transition-colors ${
                          selectedIngredients.has(i)
                            ? "text-primary"
                            : "text-secondary line-through"
                        }`}
                      >
                        {ing.original}
                      </span>
                    </li>
                  ))}
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
                <ol className="space-y-4">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 w-7 h-7 bg-[var(--color-accent)] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </span>
                      <p className="text-secondary leading-relaxed pt-0.5">{step}</p>
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
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-secondary hover:text-accent transition-colors flex items-center gap-2"
              >
                <LinkIcon /> View original
              </a>
              <span className="text-sm text-secondary">
                Fork It Over
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!recipe && !loading && !error && (
        <div className="text-center py-16 text-secondary">
          <div className="mb-4 text-accent flex justify-center">
            <ForkIcon />
          </div>
          <p className="text-lg">Paste a recipe URL above to get started</p>
        </div>
      )}
    </main>
  );
}
