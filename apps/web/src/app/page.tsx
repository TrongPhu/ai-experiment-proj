"use client";

import {
  FormEvent,
  KeyboardEvent,
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
  Loader2,
  Microscope,
  Send,
  Sparkles,
  User,
} from "lucide-react";

type Role = "system" | "user" | "assistant";

type Message = {
  role: Role;
  content: string;
};

type Topic = {
  title: string;
  description: string;
  icon: typeof BrainCircuit;
  questions: string[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

const starterMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Chào mừng tới AI Lab local. Chọn một câu hỏi mẫu hoặc nhập trực tiếp để gửi tới Ollama qua NestJS.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const [activeTopic, setActiveTopic] = useState(topics[0].title);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeQuestions = useMemo(
    () => topics.find((topic) => topic.title === activeTopic)?.questions ?? [],
    [activeTopic],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isLoading, error]);

  async function sendMessage(content: string) {
    const text = content.trim();
    if (!text || isLoading) {
      return;
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const detail = await response.text();
        let message = detail || `Request failed with ${response.status}`;

        try {
          const parsed = JSON.parse(detail) as { message?: unknown };
          if (typeof parsed.message === "string") {
            message = parsed.message;
          }
        } catch {
          // Keep the raw response body when the API does not return JSON.
        }

        throw new Error(message);
      }

      const data = (await response.json()) as { message: Message };
      setMessages((current) => [...current, data.message]);
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

  return (
    <main className="h-dvh overflow-hidden bg-[#f5f7f4] text-[#1f2723]">
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-[#dbe2d8] bg-[#fbfcfa] lg:h-full lg:w-[360px] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-[#dbe2d8] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-[#254d3a] text-white">
                  <Sparkles size={20} aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">AI Research Lab</h1>
                  <p className="text-sm text-[#647069]">NextJS + NestJS + Ollama</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-2">
                {topics.map((topic) => {
                  const Icon = topic.icon;
                  const isActive = topic.title === activeTopic;

                  return (
                    <button
                      key={topic.title}
                      type="button"
                      onClick={() => setActiveTopic(topic.title)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-[#8eb08f] bg-[#eef5ec]"
                          : "border-transparent hover:border-[#dbe2d8] hover:bg-white"
                      }`}
                    >
                      <Icon className="shrink-0 text-[#254d3a]" size={20} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{topic.title}</span>
                        <span className="block truncate text-xs text-[#647069]">
                          {topic.description}
                        </span>
                      </span>
                      <ChevronRight className="shrink-0 text-[#7d877f]" size={16} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase text-[#7d6a3f]">
                  Câu hỏi theo chủ đề
                </p>
                <div className="space-y-2">
                  {activeQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      className="w-full rounded-md border border-[#dbe2d8] bg-white px-3 py-3 text-left text-sm leading-5 text-[#2b332f] transition hover:border-[#b8c9b6] hover:bg-[#f7faf5]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-[#dbe2d8] bg-white/85 px-5 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#254d3a]">Local Assistant</p>
                <h2 className="text-xl font-semibold">Chat với model Ollama</h2>
              </div>
              <div className="hidden rounded-md border border-[#dbe2d8] bg-[#fbfcfa] px-3 py-2 text-sm text-[#647069] sm:block">
                API: {apiUrl}
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <article
                    key={`${message.role}-${index}`}
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
                      <p className="whitespace-pre-wrap">{message.content}</p>
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
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                  Ollama đang suy nghĩ...
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

          <div className="shrink-0 border-t border-[#dbe2d8] bg-white px-4 py-4">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-5xl gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Nhập câu hỏi cho Ollama..."
                className="min-h-12 flex-1 resize-none rounded-md border border-[#cfd8cc] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#89948d] focus:border-[#709772] focus:bg-white focus:ring-2 focus:ring-[#c7dcc3]"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#254d3a] text-white transition hover:bg-[#1d3e2e] disabled:cursor-not-allowed disabled:bg-[#aab4ad]"
                aria-label="Gửi tin nhắn"
                title="Gửi tin nhắn"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} aria-hidden="true" />
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
