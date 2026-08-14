"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Database,
  FileText,
  Loader2,
  LogOut,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import {
  apiUrl,
  AuthSession,
  AuthUser,
  clearAuthToken,
  KnowledgeDocument,
  requestJson,
  setAuthToken,
  withAuthHeaders,
} from "../lib/api";

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [session, setSession] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123456");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadAdminData = useCallback(async () => {
    try {
      const [nextDocuments, nextUsers] = await Promise.all([
        requestJson<KnowledgeDocument[]>(
          `${apiUrl}/knowledge/documents`,
          withAuthHeaders(),
        ),
        requestJson<AuthUser[]>(`${apiUrl}/users`, withAuthHeaders()),
      ]);
      setDocuments(nextDocuments);
      setUsers(nextUsers);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load admin data.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const user = await requestJson<AuthUser>(
          `${apiUrl}/auth/me`,
          withAuthHeaders(),
        );
        setSession(user);
        if (user.role === "admin") {
          await loadAdminData();
        }
      } catch {
        clearAuthToken();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAdminData]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await requestJson<AuthSession>(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setAuthToken(data.accessToken);
      setSession(data.user);
      if (data.user.role === "admin") {
        await loadAdminData();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Login failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    clearAuthToken();
    setSession(null);
    setDocuments([]);
    setUsers([]);
  }

  async function handleDocumentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextContent = content.trim();

    if (!nextTitle || !nextContent || isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await requestJson<KnowledgeDocument>(
        `${apiUrl}/knowledge/documents`,
        withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nextTitle,
            content: nextContent,
          }),
        }),
      );
      setTitle("");
      setContent("");
      await loadAdminData();
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
      await requestJson<{ ok: boolean }>(
        `${apiUrl}/knowledge/documents/${id}`,
        withAuthHeaders({ method: "DELETE" }),
      );
      await loadAdminData();
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

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-6 text-[#1f2723]">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md space-y-4 rounded-md border border-[#dbe2d8] bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#254d3a] text-white">
              <Shield size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#254d3a]">
                Admin login
              </p>
              <h1 className="text-xl font-semibold">Knowledge admin</h1>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-md border border-[#cfd8cc] px-3 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="h-11 w-full rounded-md border border-[#cfd8cc] px-3 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
            />
          </div>

          {error && (
            <div className="rounded-md border border-[#e2b6a8] bg-[#fff2ee] px-4 py-3 text-sm text-[#8a3a24]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#254d3a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3e2e] disabled:cursor-not-allowed disabled:bg-[#aab4ad]"
          >
            {isLoading && (
              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
            )}
            Login
          </button>

          <Link
            href="/"
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to chat
          </Link>
        </form>
      </main>
    );
  }

  if (session.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-6 text-[#1f2723]">
        <div className="w-full max-w-md rounded-md border border-[#dbe2d8] bg-white p-6">
          <h1 className="text-xl font-semibold">Admin role required</h1>
          <p className="mt-2 text-sm text-[#647069]">
            Your account can log in, but it does not have permission to manage
            company knowledge.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={logout}
              className="flex h-10 items-center gap-2 rounded-md bg-[#254d3a] px-4 text-sm font-semibold text-white"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
            <Link
              href="/"
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-4 text-sm font-semibold transition hover:bg-white"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to chat
            </Link>
          </div>
        </div>
      </main>
    );
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
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[#647069] sm:inline">
              {session.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
            <Link
              href="/admin/users"
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
            >
              <Users size={16} aria-hidden="true" />
              Users
            </Link>
            <Link
              href="/"
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to chat
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <form
            onSubmit={handleDocumentSubmit}
            className="space-y-4 rounded-md border border-[#dbe2d8] bg-white p-5"
          >
            <h2 className="text-lg font-semibold">Add company knowledge</h2>
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
                rows={14}
                className="w-full resize-y rounded-md border border-[#cfd8cc] px-3 py-3 text-sm leading-6 outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
              />
            </div>

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

          {error && (
            <div className="rounded-md border border-[#e2b6a8] bg-[#fff2ee] px-4 py-3 text-sm text-[#8a3a24]">
              {error}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <Panel title="Documents" loading={isLoading}>
            {documents.length === 0 ? (
              <EmptyState>No private documents yet.</EmptyState>
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
          </Panel>

          <Panel
            title="Users"
            action={
              <Link
                href="/admin/users"
                className="text-xs font-semibold text-[#254d3a] hover:underline"
              >
                Manage
              </Link>
            }
          >
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-md border border-[#dbe2d8] px-3 py-3"
              >
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-[#647069]">{user.email}</p>
                <p className="mt-1 text-xs font-semibold text-[#254d3a]">
                  {user.role}
                </p>
              </div>
            ))}
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Panel({
  title,
  loading = false,
  action,
  children,
}: {
  title: string;
  loading?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-[#dbe2d8] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-[#7d6a3f]">
          {title}
        </h2>
        {loading && (
          <Loader2
            className="animate-spin text-[#647069]"
            size={15}
            aria-hidden="true"
          />
        )}
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-[#dbe2d8] px-3 py-3 text-sm text-[#647069]">
      {children}
    </p>
  );
}
