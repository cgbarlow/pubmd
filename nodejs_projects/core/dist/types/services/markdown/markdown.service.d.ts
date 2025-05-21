import { MarkdownParseOptions, IMarkdownService } from './markdown.types.js';
export declare class MarkdownService implements IMarkdownService {
    private mermaidGlobalConfig;
    constructor();
    parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
}
