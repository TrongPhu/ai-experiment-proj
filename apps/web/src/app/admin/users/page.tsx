"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  BadgeCheck,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import {
  apiUrl,
  AuthSession,
  AuthUser,
  clearAuthToken,
  requestJson,
  setAuthToken,
  withAuthHeaders,
} from "../../lib/api";

const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  role: z.enum(["user", "admin"], {
    error: "Select a valid role.",
  }),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function AdminUsersPage() {
  const [session, setSession] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loginEmail, setLoginEmail] = useState("admin@example.com");
  const [loginPassword, setLoginPassword] = useState("admin123456");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  async function loadUsers() {
    const nextUsers = await requestJson<AuthUser[]>(
      `${apiUrl}/users`,
      withAuthHeaders(),
    );
    setUsers(nextUsers);
  }

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const user = await requestJson<AuthUser>(
          `${apiUrl}/auth/me`,
          withAuthHeaders(),
        );
        setSession(user);
        if (user.role === "admin") {
          await loadUsers();
        }
      } catch {
        clearAuthToken();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      const data = await requestJson<AuthSession>(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      setAuthToken(data.accessToken);
      setSession(data.user);
      if (data.user.role === "admin") {
        await loadUsers();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Login failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(values: CreateUserFormValues) {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      const createdUser = await requestJson<AuthUser>(
        `${apiUrl}/users`,
        withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
            role: values.role,
          }),
        }),
      );

      reset();
      setNotice(`Created ${createdUser.email} with ${createdUser.role} role.`);
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create user.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    clearAuthToken();
    setSession(null);
    setUsers([]);
    setNotice("");
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
              <h1 className="text-xl font-semibold">User management</h1>
            </div>
          </div>

          <Field label="Email">
            <input
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              className="h-11 w-full rounded-md border border-[#cfd8cc] px-3 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
            />
          </Field>

          <Field label="Password">
            <input
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              type="password"
              className="h-11 w-full rounded-md border border-[#cfd8cc] px-3 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
            />
          </Field>

          <Feedback error={error} notice={notice} />

          <button
            type="submit"
            disabled={isLoading || !loginEmail.trim() || !loginPassword}
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
            users.
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
              <Users size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#254d3a]">
                Admin workspace
              </p>
              <h1 className="truncate text-xl font-semibold">
                User management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[#647069] sm:inline">
              {session.email}
            </span>
            <Link
              href="/knowledge"
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
            >
              <Database size={16} aria-hidden="true" />
              Knowledge
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
            <Link
              href="/"
              className="flex h-10 items-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 text-sm font-semibold transition hover:bg-white"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Chat
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-md border border-[#dbe2d8] bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[#e8f1e8] text-[#254d3a]">
              <UserPlus size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create user account</h2>
              <p className="text-sm text-[#647069]">
                Assign the account role when creating the login.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(handleCreateUser)}
            noValidate
            className="grid gap-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" error={errors.name?.message}>
                <input
                  {...register("name")}
                  placeholder="Nguyen Van A"
                  aria-invalid={Boolean(errors.name)}
                  className={inputClass(Boolean(errors.name))}
                />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7d877f]"
                    size={17}
                    aria-hidden="true"
                  />
                  <input
                    {...register("email")}
                    placeholder="user@company.com"
                    aria-invalid={Boolean(errors.email)}
                    className={inputClass(Boolean(errors.email), "pl-10")}
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Temporary password"
                error={errors.password?.message}
              >
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7d877f]"
                    size={17}
                    aria-hidden="true"
                  />
                  <input
                    {...register("password")}
                    placeholder="At least 8 characters"
                    type="password"
                    aria-invalid={Boolean(errors.password)}
                    className={inputClass(Boolean(errors.password), "pl-10")}
                  />
                </div>
              </Field>

              <Field label="Role" error={errors.role?.message}>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2">
                      <RoleButton
                        active={field.value === "user"}
                        title="User"
                        description="Chat access"
                        onClick={() => field.onChange("user")}
                      />
                      <RoleButton
                        active={field.value === "admin"}
                        title="Admin"
                        description="Data and users"
                        onClick={() => field.onChange("admin")}
                      />
                    </div>
                  )}
                />
              </Field>
            </div>

            <Feedback error={error} notice={notice} />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#254d3a] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3e2e] disabled:cursor-not-allowed disabled:bg-[#aab4ad]"
              >
                {isLoading ? (
                  <Loader2
                    className="animate-spin"
                    size={17}
                    aria-hidden="true"
                  />
                ) : (
                  <UserPlus size={17} aria-hidden="true" />
                )}
                Create account
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setError("");
                  setNotice("");
                }}
                className="h-11 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-4 text-sm font-semibold transition hover:bg-white"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-md border border-[#dbe2d8] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-[#7d6a3f]">
              Accounts
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
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-md border border-[#dbe2d8] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-[#647069]">
                      {user.email}
                    </p>
                  </div>
                  <span className="rounded-md bg-[#e8f1e8] px-2 py-1 text-xs font-semibold text-[#254d3a]">
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error && <span className="mt-2 block text-xs text-[#8a3a24]">{error}</span>}
    </label>
  );
}

function RoleButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 items-center gap-3 rounded-md border px-3 text-left transition ${
        active
          ? "border-[#709772] bg-[#eef7ee] text-[#1f2723]"
          : "border-[#dbe2d8] bg-[#fbfcfa] text-[#647069] hover:bg-white"
      }`}
    >
      <BadgeCheck
        className={active ? "text-[#254d3a]" : "text-[#7d877f]"}
        size={18}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs">{description}</span>
      </span>
    </button>
  );
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  if (error) {
    return (
      <div className="rounded-md border border-[#e2b6a8] bg-[#fff2ee] px-4 py-3 text-sm text-[#8a3a24]">
        {error}
      </div>
    );
  }

  if (notice) {
    return (
      <div className="rounded-md border border-[#b9d2b7] bg-[#eff8ee] px-4 py-3 text-sm text-[#254d3a]">
        {notice}
      </div>
    );
  }

  return null;
}

function inputClass(hasError: boolean, extra = "") {
  return `h-11 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${
    hasError
      ? "border-[#d28b76] focus:border-[#b85d42] focus:ring-[#f3d0c6]"
      : "border-[#cfd8cc] focus:border-[#709772] focus:ring-[#c7dcc3]"
  } ${extra}`;
}
