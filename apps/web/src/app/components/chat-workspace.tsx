"use client";

import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bot,
  BrainCircuit,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Microscope,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import {
  apiUrl,
  AuthSession,
  AuthUser,
  clearAuthToken,
  requestJson,
  setAuthToken,
  setRefreshToken,
  withAuthHeaders,
} from "../lib/api";

type Role = "system" | "user" | "assistant";

type Message = {
  id?: string;
  role: Role;
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              width?: number;
              text?: "signin_with" | "signup_with" | "continue_with";
            },
          ) => void;
        };
      };
    };
  }
}

type Topic = {
  title: string;
  description: string;
  icon: typeof BrainCircuit;
  questions: string[];
};

const topics: Topic[] = [
  {
    title: "Nghiên cứu AI",
    description: "Ý tưởng thử nghiệm, mô hình, pipeline",
    icon: BrainCircuit,
    questions: [
      "Giải thích RAG là gì và khi nào nên dùng?",
      "So sánh fine-tuning và prompt engineering cho chatbot nội bộ.",
      "Thiết kế một workflow đánh giá câu trả lời của LLM.",
    ],
  },
  {
    title: "Code Assistant",
    description: "Hỗ trợ kiến trúc, debug, refactor",
    icon: Code2,
    questions: [
      "Viết ví dụ NestJS service gọi Ollama theo dạng stream.",
      "Gợi ý cấu trúc monorepo cho NextJS và NestJS.",
      "Review giúp cách xử lý lỗi khi gọi API model local.",
    ],
  },
  {
    title: "Ollama Local",
    description: "Model local, prompt, hiệu năng",
    icon: Cpu,
    questions: [
      "Nên chọn model Ollama nào cho máy RAM 16GB?",
      "Cách tối ưu prompt để model local trả lời ngắn gọn hơn?",
      "Làm sao kiểm tra Ollama đang chạy và có model nào?",
    ],
  },
  {
    title: "Thử nghiệm",
    description: "Kịch bản lab và benchmark nhỏ",
    icon: Microscope,
    questions: [
      "Tạo checklist test chất lượng chatbot nghiên cứu.",
      "Đề xuất bộ câu hỏi benchmark cho trợ lý lập trình.",
      "Thiết kế log format để phân tích phiên chat.",
    ],
  },
];

const welcomeMessage =
  "Chào mừng tới AI Lab. Chọn một câu hỏi mẫu hoặc nhập trực tiếp nội dung để hỏi những điều bạn cần biết.";

const starterMessages: Message[] = [];

const defaultGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function isWelcomeMessage(message: Message) {
  return (
    message.role === "assistant" && message.content.trim() === welcomeMessage
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function renderMessageContent(content: string) {
  return content.split("\n").map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={`blank-${index}`} className="h-3" />;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={`${trimmed}-${index}`} className="flex gap-2">
          <span className="mt-[0.45em] size-1.5 shrink-0 rounded-full bg-current opacity-70" />
          <span>{renderInlineMarkdown(bulletMatch[1])}</span>
        </div>
      );
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      return (
        <div key={`${trimmed}-${index}`} className="flex gap-2">
          <span className="shrink-0 tabular-nums">{numberedMatch[1]}.</span>
          <span>{renderInlineMarkdown(numberedMatch[2])}</span>
        </div>
      );
    }

    return <div key={`${trimmed}-${index}`}>{renderInlineMarkdown(line)}</div>;
  });
}

export function ChatWorkspace({
  initialConversationId = null,
}: {
  initialConversationId?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [session, setSession] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("admin@example.com");
  const [loginPassword, setLoginPassword] = useState("admin123456");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [googleClientId, setGoogleClientId] = useState(defaultGoogleClientId);
  const [googleReady, setGoogleReady] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [input, setInput] = useState("");
  const [activeTopic, setActiveTopic] = useState(topics[0].title);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const openConversationRequestRef = useRef(0);

  const activeQuestions = useMemo(
    () => topics.find((topic) => topic.title === activeTopic)?.questions ?? [],
    [activeTopic],
  );
  const visibleMessages = useMemo(
    () => messages.filter((message) => !isWelcomeMessage(message)),
    [messages],
  );

  const updateConversationUrl = useCallback((conversationId: string | null) => {
    const path = conversationId ? `/conversations/${conversationId}` : "/";

    window.history.pushState({}, "", path);
  }, []);

  const loadConversations = useCallback(async () => {
    if (!session) {
      setConversations([]);
      return;
    }

    try {
      const data = await requestJson<Conversation[]>(
        `${apiUrl}/conversations`,
        withAuthHeaders(),
      );
      setConversations(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không tải được lịch sử hội thoại.",
      );
    }
  }, [session]);

  const applyAuthSession = useCallback(
    async (data: AuthSession) => {
      openConversationRequestRef.current += 1;
      setAuthToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setSession(data.user);
      setShowLogin(false);
      setMessages(starterMessages);
      setActiveConversationId(null);
      setHistoryLoading(false);
      setError("");
      updateConversationUrl(null);

      const nextConversations = await requestJson<Conversation[]>(
        `${apiUrl}/conversations`,
        withAuthHeaders(),
      );
      setConversations(nextConversations);
    },
    [updateConversationUrl],
  );

  const handleGoogleCredential = useCallback(
    async (credential?: string) => {
      if (!credential) {
        setError("Google login did not return a credential.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await requestJson<AuthSession>(`${apiUrl}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });

        await applyAuthSession(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Google login failed.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [applyAuthSession],
  );

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const user = await requestJson<AuthUser>(
          `${apiUrl}/auth/me`,
          withAuthHeaders(),
        );
        setSession(user);
      } catch {
        clearAuthToken();
      } finally {
        setAuthChecked(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (googleClientId) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const config = await requestJson<{ clientId: string | null }>(
          `${apiUrl}/auth/google/config`,
        );

        if (config.clientId) {
          setGoogleClientId(config.clientId);
        }
      } catch {
        // The regular email/password flow still works without Google config.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [googleClientId]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadConversations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadConversations, session]);

  useEffect(() => {
    if (!showLogin || !googleClientId || session) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void handleGoogleCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 216,
        text: authMode === "register" ? "signup_with" : "signin_with",
      });
      setGoogleReady(true);
    };

    if (existingScript) {
      if (window.google) {
        initializeGoogle();
      } else {
        existingScript.addEventListener("load", initializeGoogle, {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initializeGoogle, { once: true });
    document.head.appendChild(script);
  }, [authMode, googleClientId, handleGoogleCredential, session, showLogin]);

  const openConversation = useCallback(
    async function openConversation(
      id: string,
      options?: { replaceUrl?: boolean },
    ) {
      const requestId = openConversationRequestRef.current + 1;
      openConversationRequestRef.current = requestId;

      setActiveConversationId(id);
      setMessages([]);
      setHistoryLoading(true);
      setError("");

      try {
        const data = await requestJson<Conversation & { messages: Message[] }>(
          `${apiUrl}/conversations/${id}`,
          withAuthHeaders(),
        );

        if (openConversationRequestRef.current !== requestId) {
          return;
        }

        setActiveConversationId(data.id);
        setMessages(data.messages.length > 0 ? data.messages : starterMessages);
        if (options?.replaceUrl !== false) {
          updateConversationUrl(data.id);
        }
      } catch (requestError) {
        if (openConversationRequestRef.current !== requestId) {
          return;
        }

        setMessages(starterMessages);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không mở được hội thoại.",
        );
      } finally {
        if (openConversationRequestRef.current === requestId) {
          setHistoryLoading(false);
        }
      }
    },
    [updateConversationUrl],
  );

  useEffect(() => {
    if (
      authChecked &&
      initialConversationId &&
      initialConversationId !== activeConversationId
    ) {
      if (!session) {
        const timer = window.setTimeout(() => {
          setError("Dang nhap de mo lai hoi thoai da luu.");
          setShowLogin(true);
        }, 0);

        return () => window.clearTimeout(timer);
      }

      const timer = window.setTimeout(() => {
        void openConversation(initialConversationId, { replaceUrl: false });
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [
    activeConversationId,
    authChecked,
    initialConversationId,
    openConversation,
    session,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isLoading, error]);

  async function deleteConversation(
    event: MouseEvent<HTMLButtonElement>,
    id: string,
  ) {
    event.stopPropagation();
    setError("");

    try {
      await requestJson<{ ok: boolean }>(`${apiUrl}/conversations/${id}`, {
        ...withAuthHeaders({ method: "DELETE" }),
      });
      if (activeConversationId === id) {
        startNewChat();
      }
      await loadConversations();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không xoá được hội thoại.",
      );
    }
  }

  async function sendMessage(
    content: string,
    options?: { startNewConversation?: boolean },
  ) {
    const text = content.trim();
    if (!text || isLoading || historyLoading) {
      return;
    }

    const conversationId =
      !session || options?.startNewConversation ? null : activeConversationId;
    const baseMessages = options?.startNewConversation
      ? starterMessages
      : messages.filter((message) => !isWelcomeMessage(message));
    const nextMessages: Message[] = [
      ...baseMessages,
      { role: "user", content: text },
    ];

    if (options?.startNewConversation) {
      setActiveConversationId(null);
    }
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const data = await requestJson<{
        conversationId: string | null;
        message: Message;
      }>(
        `${apiUrl}/chat`,
        withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            messages: nextMessages,
          }),
        }),
      );

      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
        updateConversationUrl(data.conversationId);
      }
      setMessages((current) => [...current, data.message]);
      if (session) {
        await loadConversations();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không gọi được API chat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startNewChat() {
    setActiveConversationId(null);
    setMessages(starterMessages);
    setInput("");
    setError("");
    updateConversationUrl(null);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data = await requestJson<AuthSession>(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      await applyAuthSession(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Khong dang nhap duoc.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !registerName.trim() ||
      !registerEmail.trim() ||
      registerPassword.length < 8
    ) {
      setError(
        "Name, valid email, and password with at least 8 chars are required.",
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await requestJson<AuthSession>(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
        }),
      });

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      await applyAuthSession(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create account.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    openConversationRequestRef.current += 1;
    clearAuthToken();
    setSession(null);
    setConversations([]);
    setActiveConversationId(null);
    setMessages(starterMessages);
    setError("");
    setHistoryLoading(false);
    setShowLogin(false);
    updateConversationUrl(null);
  }

  function selectTopic(topicTitle: string) {
    setActiveTopic(topicTitle);
    startNewChat();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  const profileName = session?.name?.trim() || session?.email || "Guest";
  const profileEmail = session?.email ?? "Chat without saved history";
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || "G";
  const profileRole = session?.role === "admin" ? "Admin" : "Free Plan";

  const authPanel = !session ? (
    <form
      onSubmit={authMode === "login" ? handleLogin : handleRegister}
      className="space-y-2.5"
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setAuthMode("login");
            setError("");
          }}
          className={`h-9 rounded-md text-sm font-semibold transition ${
            authMode === "login"
              ? "bg-[#254d3a] text-white"
              : "border border-[#dbe2d8] bg-[#fbfcfa] text-[#254d3a]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode("register");
            setError("");
          }}
          className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
            authMode === "register"
              ? "bg-[#254d3a] text-white"
              : "border border-[#dbe2d8] bg-[#fbfcfa] text-[#254d3a]"
          }`}
        >
          <UserPlus size={15} aria-hidden="true" />
          Register
        </button>
      </div>

      {authMode === "register" && (
        <input
          value={registerName}
          onChange={(event) => setRegisterName(event.target.value)}
          placeholder="Full name"
          className="h-9 w-full rounded-md border border-[#cfd8cc] px-2.5 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
        />
      )}

      {authMode === "login" ? (
        <>
          <input
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="Email"
            className="h-9 w-full rounded-md border border-[#cfd8cc] px-2.5 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
          />
          <input
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="h-9 w-full rounded-md border border-[#cfd8cc] px-2.5 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
          />
        </>
      ) : (
        <>
          <input
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
            placeholder="Email"
            className="h-9 w-full rounded-md border border-[#cfd8cc] px-2.5 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
          />
          <input
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
            placeholder="Password at least 8 chars"
            type="password"
            className="h-9 w-full rounded-md border border-[#cfd8cc] px-2.5 text-sm outline-none focus:border-[#709772] focus:ring-2 focus:ring-[#c7dcc3]"
          />
        </>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#254d3a] text-sm font-semibold text-white transition hover:bg-[#1d3e2e] disabled:cursor-not-allowed disabled:bg-[#aab4ad]"
      >
        {isLoading && (
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        )}
        {authMode === "login" ? "Login" : "Create account"}
      </button>

      {error && (
        <p className="rounded-md border border-[#e2b6a8] bg-[#fff2ee] px-3 py-2 text-xs text-[#8a3a24]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-[#647069]">
        <span className="h-px flex-1 bg-[#dbe2d8]" />
        Google
        <span className="h-px flex-1 bg-[#dbe2d8]" />
      </div>

      {googleClientId ? (
        <div
          ref={googleButtonRef}
          className={`google-signin-compact flex min-h-9 w-full justify-center [&>div]:max-w-full [&_iframe]:max-w-full ${
            googleReady ? "" : "opacity-70"
          }`}
        />
      ) : (
        <p className="rounded-md border border-dashed border-[#dbe2d8] px-3 py-2 text-xs text-[#647069]">
          Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to enable Google
          login.
        </p>
      )}
    </form>
  ) : null;

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-6 text-[#1f2723]">
        <Loader2 className="animate-spin text-[#254d3a]" size={24} />
      </main>
    );
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#f5f7f4] text-[#1f2723]">
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-[#dbe2d8] bg-[#fbfcfa] lg:h-full lg:w-[280px] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-[104px] flex-col justify-center border-b border-[#dbe2d8] px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-md bg-[#254d3a] text-white">
                  <Sparkles size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-base font-semibold">
                    AI Research Lab
                  </h1>
                  <p className="truncate text-xs text-[#647069]">
                    Local AI Assistant
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={startNewChat}
                className="mt-3 flex h-9 w-full items-center justify-start gap-2 rounded-md px-2 text-sm font-medium text-[#1f2723] transition hover:bg-[#eef5ec]"
              >
                <Plus size={16} aria-hidden="true" />
                Chat mới
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-[#7d6a3f]">
                    Lịch sử
                  </p>
                  {historyLoading && (
                    <Loader2
                      className="animate-spin text-[#647069]"
                      size={14}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  {!session ? (
                    <p className="rounded-md border border-dashed border-[#dbe2d8] px-2.5 py-2 text-sm text-[#647069]">
                      Dang nhap de luu va mo lai lich su chat.
                    </p>
                  ) : conversations.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[#dbe2d8] px-2.5 py-2 text-sm text-[#647069]">
                      Chưa có hội thoại đã lưu.
                    </p>
                  ) : (
                    conversations.map((conversation) => {
                      const isActive = conversation.id === activeConversationId;

                      return (
                        <div
                          key={conversation.id}
                          className={`group flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition ${
                            isActive
                              ? "border-[#8eb08f] bg-[#eef5ec]"
                              : "border-transparent hover:bg-[#eef5ec]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              void openConversation(conversation.id)
                            }
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                            title={conversation.title}
                          >
                            <MessageSquare
                              className="shrink-0 text-[#254d3a]"
                              size={16}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {conversation.title}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(event) =>
                              void deleteConversation(event, conversation.id)
                            }
                            className="flex size-7 shrink-0 items-center justify-center rounded-md text-[#7d877f] opacity-100 transition hover:bg-[#f2e9e2] hover:text-[#8a3a24] lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label="Xoá hội thoại"
                            title="Xoá hội thoại"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-[#7d6a3f]">
                  Chủ đề
                </p>
                <div className="space-y-1">
                  {topics.map((topic) => {
                    const Icon = topic.icon;
                    const isActive = topic.title === activeTopic;

                    return (
                      <button
                        key={topic.title}
                        type="button"
                        onClick={() => selectTopic(topic.title)}
                        title={`${topic.title}: ${topic.description}`}
                        className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition ${
                          isActive
                            ? "border-[#8eb08f] bg-[#eef5ec]"
                            : "border-transparent hover:bg-[#eef5ec]"
                        }`}
                      >
                        <Icon
                          className="shrink-0 text-[#254d3a]"
                          size={17}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-sm font-semibold"
                            title={topic.title}
                          >
                            {topic.title}
                          </span>
                          <span
                            className="block truncate text-xs text-[#647069]"
                            title={topic.description}
                          >
                            {topic.description}
                          </span>
                        </span>
                        <ChevronRight
                          className="shrink-0 text-[#7d877f]"
                          size={16}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-[#7d6a3f]">
                  Câu hỏi theo chủ đề
                </p>
                <div className="space-y-1.5">
                  {activeQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() =>
                        void sendMessage(question, {
                          startNewConversation: true,
                        })
                      }
                      title={question}
                      className="w-full rounded-md border border-transparent bg-transparent px-2.5 py-2 text-left text-sm leading-5 text-[#2b332f] transition hover:bg-[#eef5ec]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex h-20 shrink-0 items-center border-t border-[#dbe2d8] bg-[#fbfcfa] px-3">
              {showLogin && (
                <div className="absolute bottom-[84px] left-3 right-3 z-20 rounded-lg border border-[#dbe2d8] bg-white p-3 shadow-xl">
                  {session ? (
                    <div className="space-y-2">
                      <div className="border-b border-[#e4e9e1] pb-2">
                        <p
                          className="truncate text-sm font-semibold"
                          title={profileName}
                        >
                          {profileName}
                        </p>
                        <p
                          className="mt-1 truncate text-sm text-[#647069]"
                          title={profileEmail}
                        >
                          {profileEmail}
                        </p>
                      </div>

                      {session.role === "admin" && (
                        <div className="space-y-1">
                          <Link
                            href="/knowledge"
                            onClick={() => setShowLogin(false)}
                            className="flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition hover:bg-[#f2f5f0]"
                          >
                            <Database size={16} aria-hidden="true" />
                            Knowledge admin
                          </Link>
                          <Link
                            href="/admin/users"
                            onClick={() => setShowLogin(false)}
                            className="flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition hover:bg-[#f2f5f0]"
                          >
                            <User size={16} aria-hidden="true" />
                            User management
                          </Link>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={logout}
                        className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#dbe2d8] bg-[#fbfcfa] text-sm font-semibold text-[#254d3a] transition hover:bg-white"
                      >
                        <LogOut size={16} aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    authPanel
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowLogin((current) => !current);
                  setError("");
                }}
                className="flex h-12 w-full items-center gap-2.5 rounded-md px-2 text-left transition hover:bg-[#eef5ec]"
                aria-expanded={showLogin}
                title={`${profileName} - ${profileEmail}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#254d3a] text-sm font-semibold text-white">
                  {profileInitial}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-semibold"
                    title={profileName}
                  >
                    {profileName}
                  </span>
                  <span
                    className="block truncate text-xs text-[#647069]"
                    title={profileRole}
                  >
                    {profileRole}
                  </span>
                </span>
                {session ? (
                  <ChevronRight
                    className={`shrink-0 text-[#7d877f] transition ${
                      showLogin ? "-rotate-90" : ""
                    }`}
                    size={16}
                    aria-hidden="true"
                  />
                ) : (
                  <LogIn
                    className="shrink-0 text-[#254d3a]"
                    size={17}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-[104px] shrink-0 items-center border-b border-[#dbe2d8] bg-white/85 px-5 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#254d3a]">
                  Local AI Assistant
                </p>
                <h2 className="truncate text-xl font-semibold">
                  Sản phẩm thử nghiệm
                </h2>
                <p className="mt-1 max-w-3xl truncate text-sm text-[#647069]">
                  {welcomeMessage}
                </p>
              </div>
              {/* <div className="hidden rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 py-2 text-sm text-[#647069] sm:block">
                API: {apiUrl}
              </div> */}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
              {historyLoading && (
                <div className="flex items-center gap-3 text-sm text-[#647069]">
                  <Loader2
                    className="animate-spin"
                    size={18}
                    aria-hidden="true"
                  />
                  Đang tải hội thoại...
                </div>
              )}

              {visibleMessages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <article
                    key={message.id ?? `${message.role}-${index}`}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md bg-[#254d3a] text-white">
                        <Bot size={18} aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`max-w-[780px] break-words rounded-md border px-4 py-3 text-sm leading-6 shadow-sm ${
                        isUser
                          ? "border-[#c5b37a] bg-[#fff8df]"
                          : "border-[#dbe2d8] bg-white"
                      }`}
                    >
                      <div className="space-y-1">
                        {renderMessageContent(message.content)}
                      </div>
                    </div>
                    {isUser && (
                      <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md bg-[#7d6a3f] text-white">
                        <User size={18} aria-hidden="true" />
                      </div>
                    )}
                  </article>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-3 text-sm text-[#647069]">
                  <Loader2
                    className="animate-spin"
                    size={18}
                    aria-hidden="true"
                  />
                  Đang suy nghĩ...
                </div>
              )}

              {error && (
                <div className="rounded-md border border-[#e2b6a8] bg-[#fff2ee] px-4 py-3 text-sm text-[#8a3a24]">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="flex h-20 shrink-0 items-center border-t border-[#dbe2d8] bg-white px-4">
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex w-full max-w-5xl gap-3"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={historyLoading}
                rows={1}
                placeholder="Nhập câu hỏi cho Ollama..."
                className="min-h-12 flex-1 resize-none rounded-md border border-[#cfd8cc] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#89948d] focus:border-[#709772] focus:bg-white focus:ring-2 focus:ring-[#c7dcc3] disabled:cursor-not-allowed disabled:bg-[#edf1eb]"
              />
              <button
                type="submit"
                disabled={isLoading || historyLoading || !input.trim()}
                className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#254d3a] text-white transition hover:bg-[#1d3e2e] disabled:cursor-not-allowed disabled:bg-[#aab4ad]"
                aria-label="Gửi tin nhắn"
                title="Gửi tin nhắn"
              >
                {isLoading ? (
                  <Loader2
                    className="animate-spin"
                    size={20}
                    aria-hidden="true"
                  />
                ) : (
                  <Send size={20} aria-hidden="true" />
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
