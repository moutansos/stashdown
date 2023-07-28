# stashdown
A minimalistic tool for taking message-style notes in markdown files.
----
Do you like texting yourself notes? Do you like taking notes in markdown? Do you want complete control over syncing your notes as flat files? Do you hate writing out timestamps manually in markdown files? If you said yes, then stashdown may be the tool for you. It's a CLI based tool that when paired with an editor can provide a basic way to timestamp and generate your notes.

## Installation

> Deno and git are required!

You can install this tool with the following commands:

```sh
git clone https://github.com/moutansos/stashdown
cd stashdown
deno install --allow-read --allow-write ./sd.ts
```

## Usage
Stashdown is meant to be used in tandem with an editor that can handle real-time file updates. I generally use VS Code. I then run stashdown in the VS Code terminal below my markdown editor and preview. Stashdown is not meant to do everything when generating your markdown files, just provide a timestamp and a basic message to get you started with your note. Then you can edit the markdown file with whatever you want. An example of usage:

```sh
# create a new stashdown notes repository:
$ sd new -d my-notes-repo
Working directory: my-notes-repo
√ Note file name:  · my-note-file
√ Note title:  · My Note
File created
Working directory: my-notes-repo
Opening note:  my-note-file
File path:  my-notes-repo/my-note-file.md
√ my-note-file.md\Note text: · My first note!
√ my-note-file.md\Note text: · Another one!
? my-note-file.md\Note text: »
```
 > By default, stashdown starts working in the current directory. If you want to use a different directory you can supply the `-d` option like in the example above. This is optional though.

Stashdown asks you for the name of the note file to create, here it's `my-note-file` and then it asks for the title of the note file which we will call `My Note`. Next, you'll notice that there's a prompt for the note text. This prompt writes text with a timestamp into the markdown file in your notes repository. Every time you hit enter with some text, you get a new timestamp in your file. It also adds a header for the current date and creates a new date header for every new day you create notes. 

> Instead of using the `new` command you can replace it with `open` to open an existing stashdown repository. Also if `new` is used with an existing repo, it creates a new note instead of prompting to open a file

The above example outputs a markdown file like this:

```md
# My Note  
Date: Friday, Jul 28, 2023  
## Notes
### Friday, Jul 28, 2023
  
#### 11:25:48 AM:  
My first note!
  
#### 11:29:24 AM:  
Another one!

```

Stashdown doesn't just take notes though. you can get help on the prompt by typing `:h`:

```sh
√ my-note-file.md\Note text: · :h

        :q or :quit or :exit - exit the program (or current note)
        :o or :open - open a new note
        :ii or :insert image - insert an image into the note
        :a or :archive - archive the note
        :n or :new - create a new note
        :h or :help - show this help text

? my-note-file.md\Note text: »
```

From here, there are a few different operations you can run:

### :q - Quit

Typing `:q` at the prompt closes the current note. Notes are opened in a stacked manner. If you open another note and do some editing and close that note, you'll be back to your original note. If you close the last note in the stack, the program exits.

### :o - Open

Typing `:o` at the prompt opens a new file, asking the user in an auto-fill prompt which file to open. As stated above, these are stacked. Opening another note does not close your note in the stack below.

### :ii - Insert Image

Typing `:ii` at the prompt, prompts the user for a file location of an image. Type or paste in the location of the image you want to insert, and stashdown will take that file, load it into an assets directory in the notes repository, and then drop a basic image tag into the markdown document, with the old file path as the alt text of the image.

### :a - Archive

Typing `:a` at the prompt, prompts the user to archive the current note. This moves the note (and it's assets directory) into an `archive/` directory within the notes repository.

### :n - New Note

Typing `:n` at the prompt, starts the flow for creating a new note in the current notes repository. It does the same thing as using the `new` command on the command line.


## Contributing

If you'd like to contribute to stashdown, the easiest way to run it in the current repository is with one of the two `run-in-repo.ps1` or `run-in-repo.sh` scripts, depending on your platform. These will start stashdown in a `notes` folder in the repository which is already added to the `.gitignore` file. This makes tweaking stashdown and then re-running the application simple. There are also compile scripts available if you want to compile stashdown to a single binary.