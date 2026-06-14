const { generateText } = require("ai");
const { createGoogleGenerativeAI } = require("@ai-sdk/google");

// Since we might not have dotenv, we can read it manually or rely on node's --env-file
console.log("GOOGLE_GENERATIVE_AI_API_KEY:", process.env.GOOGLE_GENERATIVE_AI_API_KEY);

async function main() {
  try {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: "Hello, say hello!",
    });
    console.log("AI Response:", text);
  } catch (error) {
    console.error("AI Error:", error);
  }
}

main();
