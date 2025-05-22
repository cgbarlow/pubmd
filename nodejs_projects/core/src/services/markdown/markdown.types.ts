export type MermaidTheme = 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null' | 'light' | 'grey'; // Added light and grey
export type MermaidSecurityLevel = 'strict' | 'loose' | 'antiscript' | 'sandbox';

export interface MarkdownParseOptions {
  mermaidTheme?: MermaidTheme; // For direct Mermaid theme names like 'dark', 'default'
  mermaidSecurityLevel?: MermaidSecurityLevel;
  sanitizeHtml?: boolean; // Corresponds to DOMPurify usage
  gfm?: boolean; // marked option
  breaks?: boolean; // marked option
  headerIds?: boolean; // marked option
  fontPreference?: 'sans' | 'serif'; // Added font preference

  /** 
   * Specifies the rendering strategy for Mermaid on the server.
   * If 'base', mermaidThemeVariables should be provided.
   * If a theme name (e.g., 'light', 'dark'), the service will attempt to apply it.
   */
  mermaidRenderTheme?: 'base' | MermaidTheme; 
  /**
   * A record of CSS variables to be injected for Mermaid's 'base' theme.
   * e.g., { '--mermaid-primary-color': 'blue', ... }
   */
  mermaidThemeVariables?: Record<string, string>;
}

export interface IMarkdownService {
  parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
}