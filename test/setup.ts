import { vi } from "vitest";
import { awslambda } from "./lambda-stream";

vi.mock("react", () => ({}));
vi.mock("react/jsx-runtime", () => ({}));

vi.stubGlobal("awslambda", awslambda);
