import { config } from "dotenv";
import path from "path";
import { vi } from "vitest";

config({ path: path.resolve(__dirname, "..", ".env.local") });

// Emula o ambiente de servidor do Next.js para o pacote server-only nos testes
vi.mock("server-only", () => ({}));
