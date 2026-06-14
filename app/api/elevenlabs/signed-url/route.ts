import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

export async function GET() {
  noStore();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!agentId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs signed URL error:", response.status, errorText);
      
      let parsedError = errorText;
      try {
        const parsed = JSON.parse(errorText);
        parsedError = parsed.detail?.message || parsed.message || errorText;
      } catch {
        // Not JSON
      }

      if (parsedError.includes("convai_write")) {
        parsedError =
          "Your ElevenLabs API key is valid, but it is missing the convai_write permission required to start Conversational AI sessions. Enable Conversational AI write access for this API key in ElevenLabs or use an unrestricted key.";
      }

      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status} - ${parsedError}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Failed to get signed URL:", error);
    return NextResponse.json(
      { error: "Failed to get signed URL" },
      { status: 500 }
    );
  }
}
