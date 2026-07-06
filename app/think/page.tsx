"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

export default function Think() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/think" }),
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="mx-auto flex w-full min-h-0 max-w-[800px] flex-1 flex-col p-4">
      <header className="flex items-center gap-2 border-b border-[#333] pb-4">
        <span className="text-2xl">🧠</span>
        <div>
          <h1 className="text-xl font-semibold">Tryb głębokiego myślenia</h1>
          <p className="text-sm text-[#888]">
            Agent pokazuje tok rozumowania krok po kroku
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 ${
                message.role === "user"
                  ? "bg-[#2a2a3a]"
                  : "border border-[#333] bg-[#1a1a2a]"
              }`}
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? <span key={i}>{part.text}</span> : null,
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl border border-[#333] bg-[#1a1a2a] px-4 py-2 text-[#a0a0a0]">
              Myślę...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#333] pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zadaj trudne pytanie..."
          className="flex-1 rounded-xl border border-[#333] bg-[#1a1a2a] px-4 py-2 text-[#ededed] outline-none focus:border-[#555]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-[#2a2a3a] px-4 py-2 font-medium text-[#ededed] disabled:opacity-50"
        >
          Wyślij
        </button>
      </form>
    </div>
  );
}
