import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

let textClient: ChatOpenAI | null = null;
let visionClient: ChatOpenAI | null = null;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[langchain] missing required env var: ${name}`);
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getNVIDIATextClient() {
  const apiKey = getEnvVar("AI_PROVIDER_API_KEY");
  const baseUrl = getEnvVar("AI_PROVIDER_BASE_URL");
  const model = getEnvVar("AI_TEXT_MODEL");

  if (!textClient) {
    textClient = new ChatOpenAI({
      model,
      apiKey,
      configuration: {
        baseURL: baseUrl,
      },
      temperature: 0.7,
      maxTokens: 2048,
      streamUsage: false,
    });
  }
  return textClient;
}

function getNVIDIAVisionClient() {
  const apiKey = getEnvVar("AI_PROVIDER_API_KEY");
  const baseUrl = getEnvVar("AI_PROVIDER_BASE_URL");
  const model = getEnvVar("AI_VISION_MODEL");

  if (!visionClient) {
    visionClient = new ChatOpenAI({
      model,
      apiKey,
      configuration: {
        baseURL: baseUrl,
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
  thread: `The twitter thread should follow this structure and the response needs to be directly the thread:
				1- Start with an engaging introduction that grabs attention and sets the premise for the thread.
				2- In each tweet, provide a key tip, idea, or actionable step, numbering each part in the end of the tweet (2/5, 3/5, etc.).
				3- Use emojis and motivational language to keep the tone positive and dynamic.
				4- End with a call to action or a question to encourage engagement.
				5- Please, never say nothing like "Okay, here's the Twitter thread you requested about ..." start directly with the thread.
				Keep the thread to a maximum of 5 tweets. The content should be clear, concise, and valuable.`,
  instagram: `Describe the given Instagram image in detail, including key visual elements, mood, and context. Then, create an engaging CAPTION that fits the tone of the image, using:
					1- A clear and captivating message NO MORE THAN 20 WORDS, no Caption word present).
					2- Appropriate Emojis to enhance expression.
					3- Relevant hashtags (maximum of 5)
					4- The caption should encourage interaction (e.g., through a call to action, question, or relatable statement).
					Tailor the tone to fit the theme of the image: inspirational, humorous, informative, or aesthetic.
					5- Return me only the caption, nothing else.
					6- Do not say anything else.
					`,
  linkedin: `Create a professional LinkedIn post following these guidelines:
				1- Begin with a compelling hook or personal insight that captures attention
				2- Use clear paragraphs with appropriate line breaks for readability
				3- Include relevant professional context and business value
				4- Incorporate 2-3 relevant hashtags naturally within or at the end of the post
				5- End with a clear call-to-action or thought-provoking question
				6- Keep the tone professional yet conversational
				7- Aim for 150-250 words
				8- If is necessary use some emoji this will be a serious as be posible
				9- Return only the post content, without any additional text or explanations`,
};

export async function generateContent(
  contentType: ContentType,
  prompt: string,
  imageBase64?: string,
): Promise<GenerateContentResult> {
  const needsVision = contentType === "instagram" && imageBase64;
  const model = needsVision ? getNVIDIAVisionClient() : getNVIDIATextClient();

  console.log(
    `[langchain] building messages — contentType=${contentType} model=${
      needsVision ? "vision" : "text"
    } hasImage=${Boolean(imageBase64)} imageBytes=${imageBase64 ? imageBase64.length : 0}`,
  );

  const systemPrompt = CONTENT_PROMPTS[contentType];
  const messages: Array<SystemMessage | HumanMessage> = [new SystemMessage(systemPrompt)];

  if (imageBase64 && contentType === "instagram") {
    messages.push(
      new HumanMessage({
        content: [
          { type: "text", text: `Topic: ${prompt}` },
          {
            type: "image_url",
            image_url: {
              // imageBase64 may already be a full data URL (from FileReader.readAsDataURL)
              // or it may be just the raw base64 string. Handle both cases.
              url: imageBase64.startsWith("data:")
                ? imageBase64
                : `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      }),
    );
  } else {
    messages.push(new HumanMessage(`Topic: ${prompt}`));
  }

  console.log(
    `[langchain] invoking model — ${messages.length} message(s), ` +
      `systemPromptChars=${systemPrompt.length} promptChars=${prompt.length}`,
  );
  const t0 = Date.now();
  let response;
  try {
    response = await model.invoke(messages);
  } catch (err) {
    console.error(`[langchain] model.invoke threw after ${Date.now() - t0}ms:`, err);
    throw err;
  }
  const elapsed = Date.now() - t0;

  const text = response.content as string;
  const usage = (response as { usage_metadata?: unknown }).usage_metadata;
  console.log(
    `[langchain] model responded in ${elapsed}ms — rawTextChars=${
      typeof text === "string" ? text.length : "<non-string>"
    } usage=${JSON.stringify(usage ?? null)}`,
  );
  console.log(
    `[langchain] raw model output:\n---\n${typeof text === "string" ? text : JSON.stringify(text)}\n---`,
  );

  if (!text) {
    console.error("[langchain] response content was empty — model returned nothing");
    throw new Error("No content generated from NVIDIA NIM API");
  }

  let content: string[];

  if (contentType === "thread") {
    content = text
      .split("---TWEET---")
      .map((t) => t.trim())
      .filter(Boolean);
    console.log(`[langchain] parsed thread — ${content.length} tweet(s) (split by ---TWEET---)`);
    if (content.length <= 1) {
      console.warn(
        '[langchain] thread produced 0 separators — model probably did not use "---TWEET---". ' +
          "Falling back to treating the whole response as a single tweet.",
      );
    }
  } else {
    content = [text.trim()];
  }

  return { content, contentType };
}
