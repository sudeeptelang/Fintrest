"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "What passed the test today",
  "Break down a ticker's 7-factor score",
  "What does the research say about my portfolio",
  "Explain the current market regime",
];

export default function AthenaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm Lens, Fintrest's research layer. I can walk you through today's signals, break down the 7-factor score on any ticker, explain what the research says about your watchlist or portfolio, or show you why a setup passed or failed the bar. I don't recommend trades — I explain the research. What do you want to look at?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);

    try {
      const res = await api.athenaChat(msg, sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.sessionId) setSessionId(res.sessionId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-[var(--font-heading)] text-lg font-bold">Ask Athena</h1>
            <p className="text-xs text-muted-foreground">AI market assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-[#1E1B4B] text-white/85 rounded-bl-sm border border-primary/20"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-primary/80 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white/60">Athena</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </motion.div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-[#1E1B4B] text-white/60 rounded-2xl rounded-bl-sm px-4 py-3 border border-primary/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs">Athena is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={sending}
            className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Research/Not-Advice chip — FTC/SEC compliance: reminds every user
          that Lens outputs are research, not recommendations. Persistent. */}
      <div className="px-1 pt-3 pb-2 border-t border-border">
        <div className="inline-flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] leading-snug text-foreground/75">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
          <p>
            <span className="font-semibold text-foreground">
              Lens publishes research, not recommendations.
            </span>{" "}
            It explains what the model saw and why — not what to buy.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 py-3 px-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask Lens about a signal, a 7-factor score, or a setup..."
          disabled={sending}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button
          size="icon"
          className="bg-primary hover:bg-primary/90 text-white h-10 w-10 rounded-xl flex-shrink-0"
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
