export function getNoteTemplate(title: string, date: string): string {
  return `# ${title}  
Date: ${date}  
## Notes
`;
}
