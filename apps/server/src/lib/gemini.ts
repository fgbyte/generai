import { GoogleGenAI } from "@google/genai/web";

let ai: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }

  return ai;
}

type ContentType = "thread" | "instagram" | "linkedin";

interface GenerateContentResult {
  content: string[];
  contentType: string;
}

const CONTENT_PROMPTS: Record<ContentType, string> = {
  thread:
    "Generate a Twitter/X thread of 3-5 tweets on the following topic. Each tweet should be engaging, concise, and flow naturally as a thread. Separate each tweet with '---TWEET---'. Do not number the tweets.",
  instagram:
    "Generate an engaging Instagram caption with relevant hashtags for the following. Include emojis where appropriate. Place hashtags at the end.",
  linkedin:
    "Generate a professional LinkedIn post on the following topic. The post should be insightful, well-structured, and suitable for a professional audience. Use appropriate line breaks for readability.",
};

export async function generateContent(
  contentType: ContentType,
  prompt: string,
  imageBase64?: string,
): Promise<GenerateContentResult> {
  const ai = getGeminiClient();

  const systemPrompt = CONTENT_PROMPTS[contentType];

  const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];

  if (imageBase64 && contentType === "instagram") {
    contents.push({
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    });
  }

  contents.push(`${systemPrompt}\n\nTopic: ${prompt}`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  });

  const text = response.text;

  if (!text) {
    throw new Error("No content generated from Gemini API");
  }

  let content: string[];

  if (contentType === "thread") {
    content = text
      .split("---TWEET---")
      .map((t) => t.trim())
      .filter(Boolean);
  } else {
    content = [text.trim()];
  }

  return { content, contentType };
}
