import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  content: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: "user", content: input }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "AI failed to respond");
      } else {
        setMessages((msgs) => [
          ...msgs,
          { role: "ai", content: data.response },
        ]);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
      setInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-card rounded-lg shadow p-4 flex flex-col h-[500px]">
      <div className="flex items-center mb-2">
        <span className="font-bold text-primary text-lg mr-2">
          AI Assistant
        </span>
        <span className="text-xs text-muted-foreground">
          (Ask about any dashboard or KPI)
        </span>
      </div>
      <div className="flex-1 overflow-y-auto border border-border rounded bg-muted p-2 mb-2">
        {messages.length === 0 && !loading && (
          <div className="text-muted-foreground text-center mt-10">
            Ask a question about your business performance...
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              msg.role === "user" ? "text-right mb-2" : "text-left mb-2"
            }
          >
            <div
              className={
                msg.role === "user"
                  ? "inline-block bg-primary/20 text-primary px-3 py-2 rounded-lg"
                  : "inline-block bg-muted text-card-foreground px-3 py-2 rounded-lg"
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left mb-2">
            <div className="inline-block bg-muted text-card-foreground px-3 py-2 rounded-lg animate-pulse">
              Thinking<span className="inline-block animate-blink">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && <div className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</div>}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold hover:bg-primary/90 disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
