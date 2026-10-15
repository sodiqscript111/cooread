// Request/response shapes shared by the API, the extension and the web app.
// The API validates these with zod schemas that are type-checked against
// these interfaces, so the two can't drift apart.

/** Limits enforced by the API and respected by clients when building requests. */
export const LIMITS = {
    maxParagraphChars: 2_000,
    maxHighlightChars: 2_000,
    maxContextParagraphs: 30,
    maxForwardParagraphs: 2,
    maxArticleParagraphs: 5_000,
    maxArticleChars: 400_000,
    maxTitleChars: 500,
    maxUrlChars: 2_048,
    monthlyExplanations: 50,
} as const;

export interface ExplainRequest {
    url: string;
    /** The exact text the reader selected. */
    highlight: string;
    /** The full paragraph the selection belongs to. */
    highlightParagraph: string;
    /** Paragraphs before the highlight that the reader has already read, oldest first. */
    before: string[];
    /** Up to two paragraphs after the highlight, never past what the reader has reached. */
    after: string[];
}

/** One server-sent event on the /api/explain stream. */
export type ExplainEvent =
    | { type: 'delta'; text: string }
    | { type: 'done'; cached: boolean; remaining: number | null }
    | { type: 'error'; message: string };

export interface SaveArticleRequest {
    url: string;
    title: string;
    paragraphs: string[];
    lastReadIndex: number;
}

export interface SaveArticleResponse {
    articleId: string;
    alreadySaved: boolean;
}

export interface ProgressRequest {
    url: string;
    lastReadIndex: number;
    totalParagraphs: number;
    /** Opening words of the furthest-read paragraph, used for "continue reading" links. */
    anchorText: string;
}

export type SummaryStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface LibraryArticle {
    id: string;
    url: string;
    title: string;
    summary: string | null;
    summaryStatus: SummaryStatus;
    category: string;
    savedAt: string;
    lastReadIndex: number;
    totalParagraphs: number;
    anchorText: string | null;
}

export interface LibraryResponse {
    library: Record<string, LibraryArticle[]>;
}

export interface ShareResponse {
    token: string;
}

export interface SharedArticle {
    id: string;
    url: string;
    title: string;
    summary: string | null;
    category: string;
    savedAt: string;
}

export interface SharedLibraryResponse {
    category: string;
    articles: SharedArticle[];
}

export interface ApiError {
    error: string;
    code?: 'unauthorized' | 'limit_reached' | 'invalid_request' | 'not_found' | 'rate_limited' | 'server_error';
}
