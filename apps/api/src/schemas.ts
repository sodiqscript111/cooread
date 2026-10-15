import { LIMITS, type ExplainRequest, type ProgressRequest, type SaveArticleRequest } from '@coreeder/shared';
import { z } from 'zod';

const paragraph = z.string().max(LIMITS.maxParagraphChars);
const url = z.string().min(1).max(LIMITS.maxUrlChars);

export const ExplainSchema = z.object({
    url,
    highlight: z.string().trim().min(1).max(LIMITS.maxHighlightChars),
    highlightParagraph: z.string().min(1).max(LIMITS.maxParagraphChars),
    before: z.array(paragraph).max(LIMITS.maxContextParagraphs),
    after: z.array(paragraph).max(LIMITS.maxForwardParagraphs),
}) satisfies z.ZodType<ExplainRequest>;

export const SaveArticleSchema = z.object({
    url,
    title: z.string().trim().min(1).max(LIMITS.maxTitleChars),
    // Long paragraphs are truncated rather than rejected: a single huge <pre> shouldn't block a save.
    paragraphs: z.array(z.string().transform((text) => text.slice(0, LIMITS.maxParagraphChars * 5)))
        .min(1)
        .max(LIMITS.maxArticleParagraphs),
    lastReadIndex: z.number().int().min(-1),
}) satisfies z.ZodType<SaveArticleRequest, SaveArticleRequest>;

export const ProgressSchema = z.object({
    url,
    lastReadIndex: z.number().int().min(-1),
    totalParagraphs: z.number().int().min(0).max(LIMITS.maxArticleParagraphs),
    anchorText: z.string().max(500),
}) satisfies z.ZodType<ProgressRequest>;

export const ShareSchema = z.object({
    category: z.string().trim().min(1).max(100),
});

export const WaitlistSchema = z.object({
    email: z.email().max(320).transform((email) => email.toLowerCase()),
});
