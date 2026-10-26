
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  MessageCircle,
  Minus,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "../MoovioAIChat.css";

const DRAG_THRESHOLD = 110;

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm Moovio AI. I'm here to help you understand your vehicle's repair.",
};

export default function MoovioAIChat({ repair, token }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    WELCOME_MESSAGE,
  ]);
  const [sending, setSending] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const dragStart = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  const sendingRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
    }
  }, [open]);

  useEffect(() => {
    requestIdRef.current += 1;
    messagesRef.current = [WELCOME_MESSAGE];
    sendingRef.current = false;

    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setSending(false);
  }, [token]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  async function sendMessage(event) {
    event.preventDefault();

    const content = input.trim();

    if (!content || sendingRef.current) return;

    if (!token) {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I couldn't verify your tracking link. Please refresh the page and try again.",
        },
      ]);
      return;
    }

    const previousMessages = messagesRef.current;

    const history = previousMessages
      .filter((message) => message.id !== "welcome")
      .filter(
        (message) =>
          message.role === "user" ||
          (message.role === "assistant" &&
            !message.isError)
      )
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    messagesRef.current = [
      ...previousMessages,
      userMessage,
    ];

    setMessages(messagesRef.current);
    setInput("");
    setSending(true);
    sendingRef.current = true;

    const requestId = ++requestIdRef.current;

    try {
      // The deployed Supabase function's actual
      // endpoint slug is "bright-action".
      const { data, error } =
        await supabase.functions.invoke("bright-action", {
          body: {
            token,
            message: content,
            history,
          },
        });

      if (requestId !== requestIdRef.current) return;

      if (error) {
        let detail = error.message;

        if (error.context) {
          try {
            const payload =
              await error.context.clone().json();

            detail =
              payload?.error ||
              payload?.message ||
              detail;
          } catch {
            // Keep the original error message.
          }
        }

        throw new Error(
          detail || "Moovio AI is unavailable."
        );
      }

      if (
        !data ||
        typeof data.reply !== "string" ||
        !data.reply.trim()
      ) {
        throw new Error(
          "Moovio AI didn't return a response."
        );
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply.trim(),
      };

      messagesRef.current = [
        ...messagesRef.current,
        assistantMessage,
      ];

      setMessages(messagesRef.current);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        isError: true,
        content:
          error?.message ||
          "Something went wrong. Please try again.",
      };

      messagesRef.current = [
        ...messagesRef.current,
        errorMessage,
      ];

      setMessages(messagesRef.current);
    } finally {
      if (requestId === requestIdRef.current) {
        sendingRef.current = false;
        setSending(false);
      }
    }
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;

    dragStart.current = event.clientY;
    setDragging(true);

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (dragStart.current === null) return;

    const difference = event.clientY - dragStart.current;
    setDragY(Math.max(0, difference));
  }

  function handlePointerUp(event) {
    if (dragStart.current === null) return;

    const difference = event.clientY - dragStart.current;

    dragStart.current = null;
    setDragging(false);

    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    if (difference > DRAG_THRESHOLD) {
      setOpen(false);
    } else {
      setDragY(0);
    }
  }

  function handlePointerCancel() {
    dragStart.current = null;
    setDragging(false);
    setDragY(0);
  }

  return (
    <div className="moovio-ai-root">
      {open && (
        <div
          className="moovio-ai-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        type="button"
        className={`moovio-ai-bubble ${
          open ? "is-hidden" : ""
        }`}
        onClick={() => setOpen(true)}
        aria-label="Open Moovio AI chat"
        aria-expanded={open}
        aria-controls="moovio-ai-panel"
        tabIndex={open ? -1 : 0}
      >
        <MessageCircle
          size={25}
          strokeWidth={2.2}
        />
        <span className="moovio-ai-bubble-dot" />
      </button>

      <section
        id="moovio-ai-panel"
        className={`moovio-ai-panel ${
          open ? "is-open" : ""
        } ${dragging ? "is-dragging" : ""}`}
        style={{
          "--moovio-drag-y": `${dragY}px`,
        }}
        aria-label="Moovio AI chat"
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className="moovio-ai-drag-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          role="button"
          tabIndex={open ? 0 : -1}
          aria-label="Drag down or press Enter to minimize chat"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <div className="moovio-ai-drag-handle" />
        </div>

        <div className="moovio-ai-header">
          <div className="moovio-ai-header-icon">
            <Sparkles size={21} />
          </div>

          <div className="moovio-ai-header-copy">
            <h2>Moovio AI</h2>
            <p>Your personal repair assistant</p>
          </div>

          <button
            type="button"
            className="moovio-ai-minimize"
            onClick={() => setOpen(false)}
            aria-label="Minimize chat"
          >
            <Minus size={20} />
          </button>
        </div>

        {repair && (
          <div className="moovio-ai-vehicle">
            <span className="moovio-ai-vehicle-indicator" />
            <span>
              {[
                repair.vehicle_year,
                repair.vehicle_make,
                repair.vehicle_model,
              ]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        )}

        <div
          className="moovio-ai-messages"
          ref={scrollRef}
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
        >
          <div className="moovio-ai-introduction">
            <div className="moovio-ai-intro-icon">
              <Sparkles size={25} />
            </div>

            <h3>Ask away.</h3>

            <p>
              Questions about your vehicle? Your repair
              assistant is here to help.
            </p>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`moovio-ai-message-row ${
                message.role === "user"
                  ? "from-user"
                  : "from-ai"
              }`}
            >
              {message.role === "assistant" && (
                <div className="moovio-ai-message-avatar">
                  <Sparkles size={14} />
                </div>
              )}

              <div className="moovio-ai-message">
                {message.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="moovio-ai-message-row from-ai">
              <div className="moovio-ai-message-avatar">
                <Sparkles size={14} />
              </div>

              <div
                className="moovio-ai-message"
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 42,
                }}
              >
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "currentColor",
                      opacity: 0.55,
                      animation:
                        "moovio-ai-typing 1s ease-in-out infinite",
                      animationDelay: `${index * 0.16}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="moovio-ai-bottom">
          <form
            className="moovio-ai-input-form"
            onSubmit={sendMessage}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={
                sending
                  ? "Moovio AI is thinking..."
                  : "Ask about your repair..."
              }
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              maxLength={1000}
              disabled={sending}
              aria-label="Your message"
            />

            {input.trim() && !sending ? (
              <button
                type="submit"
                className="moovio-ai-send"
                aria-label="Send message"
              >
                <ArrowUp
                  size={19}
                  strokeWidth={2.5}
                />
              </button>
            ) : (
              <div className="moovio-ai-send-placeholder">
                <ArrowUp size={19} />
              </div>
            )}
          </form>

          <p
            style={{
              margin: "10px 12px 0",
              color: "#8b99af",
              fontSize: 10,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            Moovio AI is in beta and may make mistakes.
            Verify important details with your repair shop.
          </p>

          <p className="moovio-ai-footer">
            POWERED BY <strong>MOOVIO AI</strong>
          </p>
        </div>
      </section>

      <style>
        {`
          @keyframes moovio-ai-typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.35;
            }
            30% {
              transform: translateY(-5px);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
