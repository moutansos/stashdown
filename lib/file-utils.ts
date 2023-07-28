import { writeAll } from "https://deno.land/std@0.194.0/streams/write_all.ts";

export async function appendToFile(filePath: string, text: string) {
  const file = await Deno.open(filePath, { write: true, append: true });
  const encoder = new TextEncoder();
  await writeAll(file, encoder.encode(text));
  file.close();
}