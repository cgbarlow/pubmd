import { IMarkdownService, MarkdownParseOptions } from './markdown.types.ts';
export declare class MarkdownService implements IMarkdownService {
    constructor();
    parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
}
