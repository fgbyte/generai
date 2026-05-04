import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

let textClient: ChatOpenAI | null = null;
let visionClient: ChatOpenAI | null = null;

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const TEXT_MODEL = "stepfun-ai/step-3.5-flash";
const VISION_MODEL = "meta/llama-3.2-11b-vision-instruct";

function getNVIDIATextClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  if (!textClient) {
    textClient = new ChatOpenAI({
      model: TEXT_MODEL,
      apiKey,
      configuration: {
        baseURL: NVIDIA_BASE_URL,
      },
      temperature: 0.7,
      maxTokens: 2048,
      streamUsage: false,
    });
  }

  return textClient;
}

function getNVIDIAVisionClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  if (!visionClient) {
    visionClient = new ChatOpenAI({
      model: VISION_MODEL,
      apiKey,
      configuration: {
        baseURL: NVIDIA_BASE_URL,
      },
      temperature: 0.7,
      maxTokens: 2048,
      streamUsage: false,
    });
  }

  return visionClient;
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
  const needsVision = contentType === "instagram" && imageBase64;
  const model = needsVision ? getNVIDIAVisionClient() : getNVIDIATextClient();

  const systemPrompt = CONTENT_PROMPTS[contentType];
  const messages: Array<SystemMessage | HumanMessage> = [
    new SystemMessage(systemPrompt),
  ];

  if (imageBase64 && contentType === "instagram") {
    messages.push(
      new HumanMessage({
        content: [
          { type: "text", text: `Topic: ${prompt}` },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      }),
    );
  } else {
    messages.push(new HumanMessage(`Topic: ${prompt}`));
  }

  const response = await model.invoke(messages);

  const text = response.content as string;

  if (!text) {
    throw new Error("No content generated from NVIDIA NIM API");
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
