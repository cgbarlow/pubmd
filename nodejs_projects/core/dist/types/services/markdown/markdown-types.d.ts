export type MermaidTheme = 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null';
export type MermaidSecurityLevel = 'strict' | 'loose' | 'antiscript' | 'sandbox';
export interface MarkdownParseOptions {
    mermaidTheme?: MermaidTheme;
    mermaidSecurityLevel?: MermaidSecurityLevel;
    sanitizeHtml?: boolean;
    gfm?: boolean;
    breaks?: boolean;
    headerIds?: boolean;
}
export interface IMarkdownService {
    parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
}
