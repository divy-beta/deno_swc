import { bundle } from "../mod.ts";
import { assertEquals } from "./deps.ts";

Deno.test("bundle (no error)", () => {
  const result = bundle({
    entry: [],
  });
});