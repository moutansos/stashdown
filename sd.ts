import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import { getNoteTemplate } from "./lib/templates.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";
import { getUserConfirmation, getUserFileInput, getUserInput } from "./lib/user-input.ts";
import { YargsInstance } from "https://deno.land/x/yargs@v17.7.2-deno/build/lib/yargs-factory.js";
import { createFolderIfItDoesntExist, getFileCountInDirectory } from "./lib/folder-utils.ts";
import { appendToFile } from "./lib/file-utils.ts";

function main() {
  const args = yargs(Deno.args)
    .usage("Usage: $0 <command>")
    .command(
      "new",
      "Create a new note",
      (yargs: YargsInstance) => {
        return yargs
          .options({
            directory: { type: "string", alias: "d", default: "./" },
            name: { type: "string", alias: "n", default: null },
          })
          .positional("name", {
            describe: "Name of the note",
          });
      },
      (args: Arguments) => {
        if (args._.length > 1) {
          console.log("Too many arguments supplied");
          Deno.exit(1);
        }
        const name = args.name;
        generateNewNote(name, args.directory);
      }
    )
    .command(
      "open",
      "Open a note",
      (yargs: YargsInstance) => {
        return yargs
          .options({
            directory: { type: "string", alias: "d", default: "." },
            name: { type: "string", alias: "n", default: null },
          })
          .positional("name", {
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
        openNote(name, args.directory);
      }
    )
    .help()
    .parse();

  if (args._.length === 0) {
    console.log("No command supplied. Use --help for more information");
    Deno.exit(1);
  }
}

main();

async function generateNewNote(name: string | null, workingDirectory: string): Promise<void> {
  createFolderIfItDoesntExist(workingDirectory);
  outputWorkingDirectoryText(workingDirectory);
  const cleanedName = name ? name : (await getUserInput("Note file name: ")).trim();

  const currentDate = new Date().toLocaleDateString("en-us", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const fileName = cleanedName.endsWith(".md") ? cleanedName : `${cleanedName}.md`;
  const filePath = `${workingDirectory}/${fileName}`;
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
  await openNote(cleanedName, workingDirectory);
}

async function openNote(name: string | null, workingDirectory: string) {
  await createFolderIfItDoesntExist(workingDirectory);
  outputWorkingDirectoryText(workingDirectory);
  await redirectToNewNoteProcessIfFolderIsEmpty(workingDirectory);

  const cleanedName = name ?? (await getUserFileInput("Note file to open:", workingDirectory));

  console.log("Opening note: ", cleanedName);

  const fileName = cleanedName.endsWith(".md") ? cleanedName : `${cleanedName}.md`;
  const filePath = `${workingDirectory}/${fileName}`;

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
      await openNote(null, workingDirectory);
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
      const assetsDirectory = await buildAssetFolderIfNotExist(cleanedName, workingDirectory);
      await Deno.copyFile(imageFile, `${assetsDirectory}/${newImageName}`);

      const imageFilePathForMarkdown = `./${assetsDirectory.slice(7)}/${newImageName}`;

      const imageText = `\n\n![${imageFile}](${imageFilePathForMarkdown})`;
      await appendToFile(filePath, imageText);
      continue;
    } else if (noteText === ":a" || noteText === ":archive") {
      if (!(await getUserConfirmation("Are you sure you want to archive this note?"))) {
        continue;
      }
      const archiveFolder = `${workingDirectory}/archive`;
      await createFolderIfItDoesntExist(archiveFolder);
      await Deno.copyFile(filePath, `${archiveFolder}/${fileName}`);
      const assetsDirectory = buildAssetsDirectoryPath(cleanedName, workingDirectory);
      const assetsDirectoryExists = await exists(assetsDirectory);
      if (assetsDirectoryExists) {
        await Deno.rename(
          assetsDirectory,
          `${archiveFolder}/${buildAssetsDirectoryFolderName(cleanedName)}}`
        );

        // await Deno.remove(assetsDirectory);
      }
      await Deno.remove(filePath);
      break;
    } else if (noteText === ":n" || noteText === ":new") {
      await generateNewNote(null, workingDirectory);
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

    const lastDate = await getLastDateFromFile(cleanedName, workingDirectory);
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
async function getLastDateFromFile(name: string, workingDirectory: string): Promise<string | null> {
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = `${workingDirectory}/${fileName}`;

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

async function buildAssetFolderIfNotExist(
  fileName: string,
  workingDirectory: string
): Promise<string> {
  const directoryPath = buildAssetsDirectoryPath(fileName, workingDirectory);
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

function buildAssetsDirectoryPath(fileName: string, workingDirectory: string): string {
  return `${workingDirectory}/${buildAssetsDirectoryFolderName(fileName)}`;
}

function outputWorkingDirectoryText(workingDirectory: string) {
  console.log(`Working directory: ${workingDirectory}`);
}

async function redirectToNewNoteProcessIfFolderIsEmpty(workingDirectory: string) {
  const numberOfNotesFiles = await getFileCountInDirectory(workingDirectory, ".md");
  if (numberOfNotesFiles === 0) {
    console.log(
      "No notes found in the specified directory. Create a new note below to get started."
    );
    await generateNewNote(null, workingDirectory);
    Deno.exit(0);
  }
}
