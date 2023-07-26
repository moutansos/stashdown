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
    "open",
    "Open a note",
    (yargs: any) => {
      return yargs.positional("name", {
        describe: "Name of the note",
        default: null,
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
  .parse();

async function generateNewNote(name: string | null): Promise<void> {
  const cleanedName = name ? name : (await getUserInput("Note file name: ")).trim();

  const currentDate = new Date().toLocaleDateString("en-us", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const fileName = cleanedName.endsWith(".md") ? cleanedName : `${cleanedName}.md`;
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

  console.log("File created");
  await openNote(cleanedName);
}

async function openNote(name: string | null) {
  const cleanedName = name ?? (await getUserFileInput("Note file:"));

  console.log("Opening note: ", cleanedName);

  const fileName = cleanedName.endsWith(".md") ? cleanedName : `${cleanedName}.md`;
  const filePath = `./notes/${fileName}`;

  console.log("File path: ", filePath);

  const fileExists = await exists(filePath);
  if (!fileExists) {
    console.log("File does not exist");
    Deno.exit(1);
  }

  while (true) {
    const noteText = await getUserInput(`${fileName}\\Note text:`);

    if (!noteText) {
      console.log("No text provided");
      continue;
    } else if (noteText === ":q" || noteText === ":quit" || noteText === ":exit") {
      break;
    } else if (noteText === ":o" || noteText === ":open") {
      await openNote(null);
      continue;
    } else if (noteText === ":ii" || noteText === ":insert image") {
      const imageFile = await getUserInput("Image file location: ");

      // check if image file exists
      const imageFileExists = await exists(imageFile);
      if (!imageFileExists) {
        console.log("Image file does not exist");
        continue;
      }
      //extract the extension from the image file
      const imageFileExtension = imageFile.split(".").pop();
      const newImageName = `${crypto.randomUUID()}.${imageFileExtension}`;
      const assetsDirectory = await buildAssetFolderIfNotExist(cleanedName);
      await Deno.copyFile(imageFile, `${assetsDirectory}/${newImageName}`);

      const imageFilePathForMarkdown = `./${assetsDirectory.slice(7)}/${newImageName}`;

      const imageText = `\n\n![${imageFile}](${imageFilePathForMarkdown})`;
      await appendToFile(filePath, imageText);
      continue;
    } else if (noteText === ":a" || noteText === ":archive") {
      if (!(await getUserConfirmation("Are you sure you want to archive this note?"))) {
        continue;
      }
      const archiveFolder = "./notes/archive";
      await createFolderIfItDoesntExist(archiveFolder);
      await Deno.copyFile(filePath, `${archiveFolder}/${fileName}`);
      const assetsDirectory = buildAssetsDirectoryPath(cleanedName);
      const assetsDirectoryExists = await exists(assetsDirectory);
      if (assetsDirectoryExists) {
        await Deno.rename(
          assetsDirectory,
          `${archiveFolder}/${buildAssetsDirectoryFolderName(cleanedName)}}`
        );

        await Deno.remove(assetsDirectory);
      }
      await Deno.remove(filePath);
      break;
    } else if (noteText === ":n" || noteText === ":new") {
      await generateNewNote(null);
      continue;
    } else if (noteText === ":h" || noteText === ":help") {
      console.log(`
        :q or :quit or :exit - exit the program (or current note)
        :o or :open - open a new note
        :ii or :insert image - insert an image into the note
        :a or :archive - archive the note
        :n or :new - create a new note
        :h or :help - show this help text
      `);
      continue;
    }

    const lastDate = await getLastDateFromFile(cleanedName);
    console.log("Last date found: ", lastDate);
    const currentDate = new Date().toLocaleDateString("en-us", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const dateHeaderText = lastDate && lastDate === currentDate ? `` : `### ${currentDate}\n`;

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

async function getUserInput(text: string): Promise<string> {
  const response = await enq.prompt({
    type: "input",
    name: "response",
    message: text,
  });

  const rawResponse = (response as any).response;
  // remove any trailing whitespace and quotes
  return rawResponse.trim().replace(/^"(.*)"$/, "$1");
}

async function getUserFileInput(text: string): Promise<string> {
  const fileNames: string[] = [];

  for await (const dirEntry of Deno.readDir("./notes")) {
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

async function getUserConfirmation(text: string): Promise<boolean> {
  const response = await enq.prompt({
    type: "confirm",
    name: "response",
    message: text,
  });

  return (response as any).response;
}

async function buildAssetFolderIfNotExist(fileName: string): Promise<string> {
  const directoryPath = buildAssetsDirectoryPath(fileName);
  const fileExists = await exists(directoryPath);
  if (!fileExists) {
    await Deno.mkdir(directoryPath);
  }
  return directoryPath;
}

function buildAssetsDirectoryFolderName(fileName: string): string {
  // remove the .md from the file name if it exists
  const fileNameWithoutExtension = fileName.endsWith(".md")
    ? fileName.substring(0, fileName.length - 3)
    : fileName;
  return `${fileNameWithoutExtension}-assets`;
}

function buildAssetsDirectoryPath(fileName: string): string {
  return `./notes/${buildAssetsDirectoryFolderName(fileName)}`;
}

async function createFolderIfItDoesntExist(folderPath: string): Promise<void> {
  const fileExists = await exists(folderPath);
  if (!fileExists) {
    await Deno.mkdir(folderPath);
  }
}
