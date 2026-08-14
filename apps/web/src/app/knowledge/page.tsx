"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Database,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { apiUrl, KnowledgeDocument, requestJson } from "../lib/api";

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async () => {
    try {
      const data = await requestJson<KnowledgeDocument[]>(
        `${apiUrl}/knowledge/documents`,
      );
      setDocuments(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load private data.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextContent = content.trim();

    if (!nextTitle || !nextContent || isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await requestJson<KnowledgeDocument>(`${apiUrl}/knowledge/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle,
          content: nextContent,
        }),
      });
      setTitle("");
      setContent("");
      await loadDocuments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save private data.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteDocument(id: string) {
    setIsLoading(true);
    setError("");

    try {
      await requestJson<{ ok: boolean }>(`${apiUrl}/knowledge/documents/${id}`, {
        method: "DELETE",
      });
      await loadDocuments();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete private data.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#1f2723]">
      <header className="border-b border-[#dbe2d8] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#254d3a] text-white">
              <Database size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#254d3a]">
                Admin workspace
              </p>
              <h1 className="truncate text-xl font-semibold">
                Knowledge admin
              </h1>
            </div>
          </div>
          <Link
            href="/"
            className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to chat
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-md border border-[#dbe2d8] bg-white p-5"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Document title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Company policy, internal FAQ, product docs..."
                className="h-11 w-full rounded-md border border-[#cfd8cc] px-3 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Private content
              </label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste private text, markdown, notes, policy, docs..."
                rows={18}
                className="w-full resize-y rounded-md border border-[#cfd8cc] px-3 py-3 text-sm leading-6 outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
              />
            </div>

            {error && (
              <div className="rounded-md border border-[#e2b6a8] bg-[#fff2ee] px-4 py-3 text-sm text-[#8a3a24]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !title.trim() || !content.trim()}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#254d3a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3e2e] disabled:cursor-not-allowed disabled:bg-[#aab4ad]"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Plus size={17} aria-hidden="true" />
              )}
              Add to knowledge
            </button>
          </form>
        </section>

        <aside className="rounded-md border border-[#dbe2d8] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-[#7d6a3f]">
              Documents
            </h2>
            {isLoading && (
              <Loader2
                className="animate-spin text-[#647069]"
                size={15}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="space-y-2">
            {documents.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#dbe2d8] px-3 py-3 text-sm text-[#647069]">
                No private documents yet.
              </p>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center gap-3 rounded-md border border-[#dbe2d8] px-3 py-3"
                >
                  <FileText
                    className="shrink-0 text-[#254d3a]"
                    size={17}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {document.title}
                    </p>
                    <p className="text-xs text-[#647069]">
                      {document.chunkCount} chunks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteDocument(document.id)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#7d877f] transition hover:bg-[#f2e9e2] hover:text-[#8a3a24]"
                    aria-label="Delete private data"
                    title="Delete private data"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
