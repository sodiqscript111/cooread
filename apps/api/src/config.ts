import { z } from 'zod';

const EnvSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
    SUPABASE_URL: z.url(),
    SUPABASE_JWT_SECRET: z.string().optional().transform((value) => value || undefined),
    CORS_ORIGINS: z.string().default('').transform((value) =>
        value.split(',').map((origin) => origin.trim()).filter(Boolean)),
    MONTHLY_EXPLANATION_LIMIT: z.coerce.number().int().positive().default(50),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const result = EnvSchema.safeParse(env);
    if (!result.success) {
        const problems = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
        throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
    }
    return result.data;
}
