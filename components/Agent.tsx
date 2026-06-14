"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConversation } from "@elevenlabs/react";

import { cn } from "@/lib/utils";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface FeedbackResponse {
  success: boolean;
  interviewId?: string;
  feedbackId?: string;
  error?: string;
}

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 45000
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const getStoredInterviewId = () => {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem("activeInterviewId") || undefined;
};

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  agentPrompt,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const isFeedbackGeneratingRef = useRef(false);
  const messagesRef = useRef<SavedMessage[]>([]);
  const interviewIdRef = useRef(interviewId);

  const conversation = useConversation({
    onConnect: () => {
      console.log("✅ Connected to ElevenLabs");
      setCallStatus(CallStatus.ACTIVE);
    },
    onDisconnect: () => {
      console.log("❌ Disconnected from ElevenLabs. Messages count:", messages.length);
      setCallStatus(CallStatus.FINISHED);
    },
    onMessage: (message) => {
      console.log("📨 Message received:", message);
      const role = message.source === "user" ? "user" : "assistant";
      const newMessage: SavedMessage = { role, content: message.message };
      setMessages((prev) => [...prev, newMessage]);
      if (role === "assistant") {
        setLastMessage(message.message);
      }
    },
    onError: (error) => {
      console.error("❌ ElevenLabs Error:", error);
      setCallStatus(CallStatus.INACTIVE);
    },
  });

  const { status, isSpeaking, startSession, endSession } = conversation;

  useEffect(() => {
    interviewIdRef.current = interviewId || getStoredInterviewId();

    if (interviewIdRef.current) {
      window.sessionStorage.setItem("activeInterviewId", interviewIdRef.current);
    }
  }, [interviewId]);

  const submitFeedback = useCallback(
    async (transcript: SavedMessage[], attempt = 1): Promise<FeedbackResponse> => {
      try {
        const response = await fetchWithTimeout("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interviewId: interviewIdRef.current || getStoredInterviewId(),
            feedbackId,
            transcript,
          }),
        });

        const result = (await response.json()) as FeedbackResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Feedback generation failed.");
        }

        return result;
      } catch (error) {
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
          return submitFeedback(transcript, attempt + 1);
        }

        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "Feedback generation timed out. Please check your connection and try again."
            : error instanceof Error
              ? error.message
              : "Feedback generation failed.";

        return { success: false, error: message };
      }
    },
    [feedbackId]
  );

  useEffect(() => {
    console.log(`Connection state: ${status}, CallStatus: ${callStatus}`);
    if (status === "connected") {
      setCallStatus(CallStatus.ACTIVE);
    } else if (status === "connecting") {
      setCallStatus(CallStatus.CONNECTING);
    } else if (status === "disconnected" && callStatus === CallStatus.ACTIVE) {
      console.log("Status changed to disconnected from active. Triggering finish.");
      setCallStatus(CallStatus.FINISHED);
    }
  }, [status, callStatus]);

  // Keep messagesRef in sync so we always have the latest messages
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleGenerateFeedback = useCallback(async (msgs?: SavedMessage[]) => {
    // Prevent duplicate calls
    if (isFeedbackGeneratingRef.current) {
      console.log("⚠️ Feedback generation already in progress, skipping.");
      return;
    }
    isFeedbackGeneratingRef.current = true;
    setIsGenerating(true);

    const transcript = msgs || messagesRef.current;
    console.log("📊 Generating feedback with", transcript.length, "messages...");

    try {
      const {
        success,
        interviewId: resolvedInterviewId,
        feedbackId: id,
        error,
      } = await submitFeedback(transcript);

      const targetInterviewId = resolvedInterviewId || interviewIdRef.current;

      if (success && id && targetInterviewId) {
        window.sessionStorage.setItem("activeInterviewId", targetInterviewId);
        router.push(`/interview/${targetInterviewId}/feedback`);
      } else {
        console.log("❌ Error saving feedback", error);
        alert(`Failed to generate feedback: ${error}`);
        isFeedbackGeneratingRef.current = false;
        setIsGenerating(false);
      }
    } catch (err) {
      console.error("❌ Exception during feedback generation:", err);
      alert(`Failed to generate feedback: ${err instanceof Error ? err.message : 'Unknown error'}`);
      isFeedbackGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [router, submitFeedback]);

  useEffect(() => {
    console.log(`useEffect routing check - status: ${callStatus}, messages: ${messagesRef.current.length}`);
    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        const fetchLatestInterviewAndRedirect = async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const response = await fetch("/api/interviews/latest", {
              cache: "no-store",
            });
            const result = await response.json();
            const latestInterview = result?.interview;

            if (latestInterview) {
              router.push(`/interview/${latestInterview.id}`);
            } else {
              router.push("/");
            }
          } catch (error) {
            console.error("Failed to fetch latest interview:", error);
            router.push("/");
          }
        };

        fetchLatestInterviewAndRedirect();
      } else {
        handleGenerateFeedback();
      }
    }
  }, [callStatus, feedbackId, interviewId, router, type, userId, handleGenerateFeedback]);

  const handleCall = async () => {
    console.log("🎤 Starting call...");
    setCallStatus(CallStatus.CONNECTING);

    try {
      // Request microphone permission first
      console.log("🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      console.log("✅ Microphone permission granted");
      console.log("🎙️ Audio tracks:", stream.getAudioTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
      })));
      stream.getTracks().forEach(track => track.stop());

      // Format questions for the agent
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
        console.log("📝 Formatted questions:", formattedQuestions);
      }

      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
      console.log("🤖 Agent ID:", agentId);

      if (!agentId) {
        throw new Error("NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured");
      }

      // Start the conversation with the agent
      console.log("🚀 Starting ElevenLabs session...");

      const sessionOptions: Parameters<typeof startSession>[0] = {
        agentId,
        connectionType: "webrtc",
        userId,
        connectionDelay: {
          default: 0,
          android: 0,
          ios: 0,
        },
      };

      if (formattedQuestions) {
        sessionOptions.dynamicVariables = {
          questions: formattedQuestions
        };
      }

      if (agentPrompt) {
        sessionOptions.overrides = {
          agent: {
            prompt: {
              prompt: agentPrompt
            }
          }
        };
      }

      try {
        await startSession(sessionOptions);
      } catch (error) {
        console.warn("Direct WebRTC session failed, retrying with direct WebSocket:", error);

        await startSession({
          ...sessionOptions,
          connectionType: "websocket",
        });
      }
      
      console.log("✅ Session started successfully");
      console.log("🎧 Listening for user input...");
      
    } catch (error) {
      console.error("❌ Failed to start conversation:", error);
      setCallStatus(CallStatus.INACTIVE);
      
      // Show user-friendly error message
      alert(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnect = async () => {
    console.log("Disconnecting manually. Messages:", messages.length);
    await endSession();
    setCallStatus(CallStatus.FINISHED);
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl">🤖</span>
            </div>
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <div className="size-[120px] rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/30">
              <span className="text-6xl">👤</span>
            </div>
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus === "ACTIVE" ? (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        ) : callStatus === "FINISHED" ? (
          <button
            className="relative btn-call"
            onClick={() => handleGenerateFeedback()}
            disabled={isGenerating}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                !isGenerating && "hidden"
              )}
            />
            <span className="relative">
              {isGenerating ? "Generating Feedback..." : "Generate Feedback"}
            </span>
          </button>
        ) : (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === "CONNECTING" ? ". . ." : "Call"}
            </span>
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
