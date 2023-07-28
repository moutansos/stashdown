import { exists } from "https://deno.land/std/fs/mod.ts";


export async function createFolderIfItDoesntExist(folderPath: string): Promise<void> {
  if (folderPath === "." || folderPath === "./" || folderPath === ".\\") {
    return;
  }

  const fileExists = await exists(folderPath);
  if (!fileExists) {
    await Deno.mkdir(folderPath);
  }
}

export async function getFileCountInDirectory(directory: string, fileExtension: string): Promise<number> {
  let count = 0;
  for await (const dirEntry of Deno.readDir(directory)) {
    if (!dirEntry.isDirectory && dirEntry.name.endsWith(fileExtension)) {
      count++;
    }
  }

  return count;
}
