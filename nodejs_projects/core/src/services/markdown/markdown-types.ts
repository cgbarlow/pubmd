export type MermaidTheme = 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null'; // Changed null to "null"
export type MermaidSecurityLevel = 'strict' | 'loose' | 'antiscript' | 'sandbox';

export interface MarkdownParseOptions {
  mermaidTheme?: MermaidTheme; // This will now be one of the strings or undefined
  mermaidSecurityLevel?: MermaidSecurityLevel;
  sanitizeHtml?: boolean; // Corresponds to DOMPurify usage
  gfm?: boolean; // marked option
  breaks?: boolean; // marked option
  headerIds?: boolean; // marked option
}

export interface IMarkdownService {
  parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
}