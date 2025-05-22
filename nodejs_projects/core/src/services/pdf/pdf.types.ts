/**
 * Defines the comprehensive options for PDF generation,
 * accommodating various engines like Playwright or jsPDF.
 */
import { MermaidTheme } from '../markdown/markdown.types.js'; // Import MermaidTheme

export interface PdfGenerationOptions {
  /** Suggested filename for the generated PDF. */
  filename?: string;

  /**
   * Page margins. Values can be numbers (assumed to be in pixels for Playwright, mm for jsPDF)
   * or strings with units (e.g., '10mm', '1in', '72px').
   * Playwright defaults to 1cm if not specified or if units are missing.
   */
  margins?: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  };

  /**
   * Paper format. If set, takes priority over width or height options.
   * Defaults to 'Letter'.
   * Common values: 'Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'.
   */
  pageFormat?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | string;

  /** Paper orientation. Defaults to 'portrait'. */
  orientation?: 'portrait' | 'landscape';

  /**
   * Scale of the webpage rendering. Defaults to 1.
   * Scale amount must be between 0.1 and 2.
   */
  scale?: number;

  /** Print background graphics. Defaults to false. */
  printBackground?: boolean;

  /** Display header and footer. Defaults to false. */
  displayHeaderFooter?: boolean;

  /**
   * HTML template for the print header. Should be valid HTML markup with the following
   * classes used to inject printing values into them:
   * - `date` formatted print date
   * - `title` document title
   * - `url` document location
   * - `pageNumber` current page number
   * - `totalPages` total pages in the document
   */
  headerTemplate?: string;

  /**
   * HTML template for the print footer. Should use the same format as headerTemplate.
   */
  footerTemplate?: string;

  /**
   * Give any CSS @page size declared in the page priority over the format option.
   * Defaults to false, which will scale the content to fit the paper size.
   */
  preferCSSPageSize?: boolean;

  /**
   * Paper width with units.
   */
  width?: string | number;

  /**
   * Paper height with units.
   */
  height?: string | number;

  /**
   * Path to save the PDF to. If `path` is a relative path, then it is resolved relative to the current working directory.
   * If no path is provided, the PDF won't be saved to the disk.
   * Note: This is a Playwright-specific option that the engine might handle,
   * but the service itself returns a Blob.
   */
  path?: string;

  // --- Options for Markdown processing step, when generating PDF from Markdown ---
  /** 
   * Specifies the Mermaid theme to apply during Markdown parsing for PDF output.
   * This will be used to select CSS classes and potentially theme variables.
   */
  mermaidTheme?: MermaidTheme;

  /** 
   * Specifies the font preference (sans-serif or serif) for Mermaid diagrams
   * during Markdown parsing for PDF output.
   */
  fontPreference?: 'sans' | 'serif';


  // --- Options potentially more relevant to jsPDF/html2canvas engine ---
  /**
   * @deprecated Will be handled by the 'scale' option or specific engine configurations.
   * Scale factor for html2canvas rendering.
   */
  html2canvasScale?: number;

  // Add any other html2canvas specific options or custom logic flags needed
  // e.g., customOnCloneLogic?: (clonedDoc: Document) => void;
}

export interface IPdfService {
  generatePdfFromHtml(htmlContent: string, options?: PdfGenerationOptions): Promise<Blob>;
  generatePdfFromMarkdown(markdownContent: string, options?: PdfGenerationOptions): Promise<Blob>;
}