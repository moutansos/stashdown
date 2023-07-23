import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import { getNoteTemplate } from "./lib/templates.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";
import { writeAll } from "https://deno.land/std@0.194.0/streams/write_all.ts";
import enq from "npm:enquirer";

yargs(Deno.args)
  .command(
    "new <name>",
    "Create a new note",
    (yargs: any) => {
      return yargs.positional("name", {
        describe: "Name of the note",
      });
    },
    (args: Arguments) => {
      console.log(args);
      if (args._.length > 1) {
        console.log("Too many arguments supplied");
        Deno.exit(1);
      }
      const name = args.name;
      generateNewNote(name);
    }
  )
  .command(
    "open <name>",
    "Open a note",
    (yargs: any) => {
      return yargs.positional("name", {
        describe: "Name of the note",
      });
    },
    (args: Arguments) => {
      if (args._.length > 1) {
        console.log("Too many arguments supplied");
        Deno.exit(1);
      }
      const name = args.name;
      openNote(name);
    }
  )
  .strictCommands()
  .demandCommand(1)
  .parse();

async function generateNewNote(name: string | null): Promise<void> {
  if (!name) {
    console.log("No name provided");
    Deno.exit(1);
  }
  const currentDate = new Date().toLocaleDateString("en-us", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = `./notes/${fileName}`;
  const fileExists = await exists(filePath);
  if (fileExists) {
    console.log("File already exists");
    Deno.exit(1);
  }
  const title = await getUserInput("Note title: ");
  if (!title) {
    console.log("No title provided");
    Deno.exit(1);
  }
  const fileString = getNoteTemplate(title, currentDate);
  await Deno.writeTextFile(filePath, fileString);
}

async function openNote(name: string | null) {
  if (!name) {
    console.log("No name provided");
    Deno.exit(1);
  }

  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = `./notes/${fileName}`;

  const fileExists = await exists(filePath);
  if (!fileExists) {
    console.log("File does not exist");
    Deno.exit(1);
  }

  while (true) {
    const noteText = await getUserInput("Note text:");

    if (!noteText) {
      console.log("No text provided");
      continue;
    } else if (noteText === "q" || noteText === "quit" || noteText === "exit") {
      break;
    }

    const lastDate = await getLastDateFromFile(name);
    console.log("Last date found: ", lastDate);
    const currentDate = new Date().toLocaleDateString("en-us", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const dateHeaderText =
      lastDate && lastDate === currentDate ? `` : `### ${currentDate}\n`;

    const currentTime = new Date().toLocaleTimeString("en-us");
    const noteTextWithDate = `${dateHeaderText}  \n#### ${currentTime}:  \n${noteText}\n`;

    await appendToFile(filePath, noteTextWithDate);
  }
}

/**
 * Gets the last date from the file in the notes folder
 * looking at the last line in the file that starts with
 * "### " and pulls the date string from that line
 * @param name
 */
async function getLastDateFromFile(name: string): Promise<string | null> {
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = `./notes/${fileName}`;

  const fileExists = await exists(filePath);
  if (!fileExists) {
    console.log("File does not exist");
    Deno.exit(1);
  }
  const fileText = await Deno.readTextFile(filePath);
  const lines = fileText.split("\n").filter((line) => line.startsWith("### "));
  if (lines.length === 0) {
    return null;
  }
  const lastLine = lines[lines.length - 1];
  return lastLine.substring(4);
}

async function appendToFile(filePath: string, text: string) {
  const file = await Deno.open(filePath, { write: true, append: true });
  const encoder = new TextEncoder();
  await writeAll(file, encoder.encode(text));
  file.close();
}

async function getUserInput(text: string) {
  const response = await enq.prompt({
    type: "input",
    name: "response",
    message: text,
  });

  return (response as any).response;
}
