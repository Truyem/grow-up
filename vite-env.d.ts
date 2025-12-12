
interface ImportMetaEnv {
  readonly API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}