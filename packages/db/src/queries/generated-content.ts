import { db } from "@generai/db";
import { generatedContent } from "@generai/db/schema/generated-content";
import { desc, eq } from "drizzle-orm";

/**
 * Save generated content for a user
 */
export const saveGeneratedContent = async (
  userId: string,
  content: string,
  prompt: string,
  contentType: string,
) => {
  const [result] = await db
    .insert(generatedContent)
    .values({
      id: crypto.randomUUID(),
      userId,
      content,
      prompt,
      contentType,
    })
    .returning();
  return result;
};

/**
 * Delete generated content by ID
 */
export const deleteGeneratedContent = async (id: string) => {
  const [result] = await db
    .delete(generatedContent)
    .where(eq(generatedContent.id, id))
    .returning();
  return result;
};

/**
 * Get generated content history for a user
 */
export const getGeneratedContentHistory = async (userId: string, limit = 20) => {
  const result = await db
    .select({
      id: generatedContent.id,
      content: generatedContent.content,
      prompt: generatedContent.prompt,
      contentType: generatedContent.contentType,
      createdAt: generatedContent.createdAt,
    })
    .from(generatedContent)
    .where(eq(generatedContent.userId, userId))
    .orderBy(desc(generatedContent.createdAt))
    .limit(limit);
  return result;
};
