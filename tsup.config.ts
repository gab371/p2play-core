import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "spectator/index": "src/spectator/index.ts",
    "voice/index": "src/voice/index.ts",
    "url/index": "src/url/index.ts",
    "chat/index": "src/chat/index.ts",
    "session/index": "src/session/index.ts",
    "presence/index": "src/presence/index.ts",
    "ui/index": "src/ui/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    "react",
    "react-dom",
    "peerjs",
    "radix-ui",
    "lucide-react",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
  ],
});
