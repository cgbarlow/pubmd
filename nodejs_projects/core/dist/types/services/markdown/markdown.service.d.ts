import { IMarkdownService, MarkdownParseOptions } from './markdown.types';
export declare class MarkdownService implements IMarkdownService {
    constructor();
    parse(markdownText: string, options?: MarkdownParseOptions): Promise<string>;
}
