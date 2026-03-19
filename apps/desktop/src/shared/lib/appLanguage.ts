export const APP_LANGUAGES = ["en", "zh"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];
