/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_REPORT_API_URL?: string;
  readonly VITE_PREVIEW_PASSWORD_SHA256?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
