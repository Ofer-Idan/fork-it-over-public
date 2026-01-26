"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

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

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ForkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 9v1.5m0 4.5v6m-3-15v3a3 3 0 006 0V3m-9 18h12" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function ArchivePage() {
  const [recipes, setRecipes] = useState<ArchivedRecipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch("/api/archive");
      const data = await response.json();
      if (response.ok) {
        setRecipes(data.recipes);
      } else {
        setError(data.error || "Failed to load archive");
      }
    } catch {
      setError("Failed to load archive");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this recipe from your archive?")) return;

    setDeletingId(id);
    try {
      const response = await fetch("/api/archive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete recipe");
      }
    } catch {
      setError("Failed to delete recipe");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRecipes = search
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase())
      )
    : recipes;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 pb-20">
      {/* Header */}
      <header className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-colors mb-6"
        >
          <ArrowLeftIcon />
          <span>Back to home</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-accent"><ForkIcon /></span>
          <h1 className="text-3xl font-bold text-primary">Recipe Archive</h1>
        </div>
        <p className="text-secondary">
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} saved
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-8">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes by title..."
          className="input-field w-full"
          style={{ paddingLeft: '3rem' }}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="loading-spinner w-10 h-10 mx-auto mb-4" />
          <p className="text-secondary">Loading archive...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="toast-error mb-8">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recipes.length === 0 && (
        <div className="text-center py-16 text-secondary">
          <div className="mb-4 text-accent flex justify-center">
            <ForkIcon />
          </div>
          <p className="text-lg mb-2">No recipes archived yet</p>
          <p className="text-sm">Extract a recipe to add it to your archive</p>
        </div>
      )}

      {/* No Search Results */}
      {!loading && !error && recipes.length > 0 && filteredRecipes.length === 0 && (
        <div className="text-center py-16 text-secondary">
          <p className="text-lg">No recipes match &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Recipe Grid */}
      {!loading && !error && filteredRecipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <article
              key={recipe.id}
              className="bg-surface border border-default rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              {recipe.image ? (
                <div className="relative h-40 bg-background">
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="h-40 bg-background flex items-center justify-center">
                  <span className="text-secondary">
                    <ForkIcon />
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <h2 className="font-semibold text-primary mb-1 line-clamp-2">
                  {recipe.title}
                </h2>
                <p className="text-sm text-secondary mb-3">
                  {getDomain(recipe.sourceUrl)}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-secondary mb-4">
                  {(recipe.prepTime || recipe.cookTime) && (
                    <span className="flex items-center gap-1">
                      <ClockIcon />
                      {recipe.prepTime || recipe.cookTime}
                    </span>
                  )}
                  <span>{formatDate(recipe.archivedAt)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
                  >
                    <span>View original</span>
                    <ExternalLinkIcon />
                  </a>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    disabled={deletingId === recipe.id}
                    className="text-secondary hover:text-error transition-colors p-1 rounded disabled:opacity-50"
                    aria-label="Delete recipe"
                  >
                    {deletingId === recipe.id ? (
                      <span className="loading-spinner w-4 h-4" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
