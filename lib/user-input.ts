import enq from "npm:enquirer";

export async function getUserInput(text: string): Promise<string> {
  const response = await enq.prompt({
    type: "input",
    name: "response",
    message: text,
  });

  const rawResponse = (response as any).response;
  // remove any trailing whitespace and quotes
  return rawResponse.trim().replace(/^"(.*)"$/, "$1");
}

export async function getUserFileInput(text: string, workingDirectory: string): Promise<string> {
  const fileNames: string[] = [];

  for await (const dirEntry of Deno.readDir(workingDirectory)) {
    // is a directory and is a markdown file
    if (!dirEntry.isDirectory && dirEntry.name.endsWith(".md")) {
      fileNames.push(dirEntry.name);
    }
  }

  if (fileNames.length === 0) {
    console.log("No files found in notes folder");
    Deno.exit(1);
  }

  const response = await enq.prompt({
    type: "autocomplete",
    name: "response",
    message: text,
    choices: fileNames,
  });

  return (response as any).response;
}

export async function getUserConfirmation(text: string): Promise<boolean> {
  const response = await enq.prompt({
    type: "confirm",
    name: "response",
    message: text,
  });

  return (response as any).response;
}
