/**
 * Builds a story as an EPUB 3 file for Kindle and other e-readers (story S1-E13-05, PRIVACY part
 * f; Robert, 1 Nov 2026, 06:31 to 06:33).
 *
 * The book, in reading order: the cover, the title page, the copyright page, the table of
 * contents (a page too, so it can be read), then every chapter, each its own page. The file
 * follows the EPUB 3 rules readers check first:
 * - "mimetype" is the ZIP's first file and is stored uncompressed;
 * - META-INF/container.xml points to OEBPS/content.opf, which lists every file (the manifest)
 *   and the reading order (the spine), with the title, the name, the language and the date;
 * - nav.xhtml is the EPUB 3 table of contents, and toc.ncx the same list for older readers;
 * - every page is well-formed XHTML in the story's language, so screen readers and hyphenation
 *   use the right one; the cover is marked as such for shelves and Kindle.
 * Who calls it: src/features/data-export/lib/runEpub.ts. What it calls: chapterTextToXhtml() and
 * JSZip, all in the browser (ADR 0012), so the name on the book never leaves the device.
 */
import JSZip from 'jszip';

import { chapterTextToXhtml, escapeXml } from './chapterTextToXhtml';
import type { EpubBook, EpubImage } from './epubTypes';

/** One page of the book: its file, its heading for the contents and its XHTML body. */
interface BookPage {
  id: string;
  fileName: string;
  heading: string;
  body: string;
  /** Whether the page is listed in the table of contents. */
  isListed: boolean;
}

/** One picture inside the book. */
interface BookPicture {
  id: string;
  /** The picture's ID in the chapter text. */
  pictureId: string;
  fileName: string;
  image: EpubImage;
}

/** The plain stylesheet: the reader's own font and size stay in charge. */
const stylesheet = `body { margin: 0 5%; line-height: 1.5; }
h1 { margin: 2em 0 1em; text-align: center; line-height: 1.2; }
h2, h3 { margin: 1.5em 0 0.5em; }
p { margin: 0 0 0.8em; }
hr { margin: 2em auto; width: 30%; border: none; border-top: 1px solid currentColor; }
blockquote { margin: 1em 2em; font-style: italic; }
figure { margin: 1em 0; text-align: center; }
figure img { max-width: 100%; }
.cover { margin: 0; padding: 0; text-align: center; }
.cover img { max-width: 100%; max-height: 100%; }
.title-page { text-align: center; margin-top: 30%; }
.by-line { font-style: italic; }
.copyright p { font-size: 0.9em; }
.note { font-style: italic; }
nav ol { list-style: none; padding: 0; }
`;

/** The media type of a picture. */
function mediaTypeOf(image: EpubImage): string {
  return image.type === 'png' ? 'image/png' : 'image/jpeg';
}

/** A whole XHTML page around a body. */
function xhtmlPage(book: EpubBook, heading: string, body: string): string {
  const language = escapeXml(book.languageCode);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}">
<head>
<meta charset="UTF-8"/>
<title>${escapeXml(heading)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${body}
</body>
</html>
`;
}

/** The chapter pictures that loaded, each with its file name inside the book. */
function picturesOf(book: EpubBook): BookPicture[] {
  return [...book.pictures.entries()].map(([pictureId, image], index) => ({
    id: `picture-${index + 1}`,
    fileName: `images/picture-${index + 1}.${image.type}`,
    image,
    pictureId,
  }));
}

/** The front pages: the title page and the copyright page. */
function frontPages(book: EpubBook): BookPage[] {
  const titleBody = `<section class="title-page" epub:type="titlepage">
<h1>${escapeXml(book.title)}</h1>
<p class="by-line">${escapeXml(book.words.byLine)}</p>
</section>`;
  const copyrightLines = book.words.copyrightLines
    .map((line) => `<p>${escapeXml(line)}</p>`)
    .join('\n');
  const copyrightBody = `<section class="copyright" epub:type="copyright-page">
<h2>${escapeXml(book.words.copyrightHeading)}</h2>
${copyrightLines}
</section>`;
  return [
    { id: 'title', fileName: 'title.xhtml', heading: book.title, body: titleBody, isListed: true },
    {
      id: 'copyright',
      fileName: 'copyright.xhtml',
      heading: book.words.copyrightHeading,
      body: copyrightBody,
      isListed: true,
    },
  ];
}

/** One page per chapter, its heading first. */
function chapterPages(book: EpubBook, pictureFiles: ReadonlyMap<string, string>): BookPage[] {
  return book.chapters.map((chapter, index) => {
    const text = chapterTextToXhtml(chapter.markdown, {
      pictureFiles,
      embeds: book.embeds,
      words: book.words,
    });
    return {
      id: `chapter-${index + 1}`,
      fileName: `chapter-${index + 1}.xhtml`,
      heading: chapter.heading,
      body: `<section epub:type="chapter">\n<h1>${escapeXml(chapter.heading)}</h1>\n${text}\n</section>`,
      isListed: true,
    };
  });
}

/** The table of contents page (nav.xhtml), which lists every listed page in order. */
function navPage(book: EpubBook, pages: BookPage[]): string {
  const items = pages
    .filter((page) => page.isListed)
    .map((page) => `<li><a href="${page.fileName}">${escapeXml(page.heading)}</a></li>`)
    .join('\n');
  const firstChapter = pages.find((page) => page.id === 'chapter-1') ?? pages[0];
  const landmarks =
    firstChapter === undefined
      ? ''
      : `<nav epub:type="landmarks" hidden="">
<ol><li><a epub:type="bodymatter" href="${firstChapter.fileName}">${escapeXml(firstChapter.heading)}</a></li></ol>
</nav>`;
  const body = `<nav epub:type="toc" id="toc">
<h1>${escapeXml(book.words.contents)}</h1>
<ol>
${items}
</ol>
</nav>
${landmarks}`;
  return xhtmlPage(book, book.words.contents, body);
}

/** The older readers' table of contents (toc.ncx). */
function ncxFile(book: EpubBook, pages: BookPage[]): string {
  const points = pages
    .filter((page) => page.isListed)
    .map(
      (page, index) => `<navPoint id="point-${index + 1}" playOrder="${index + 1}">
<navLabel><text>${escapeXml(page.heading)}</text></navLabel>
<content src="${page.fileName}"/>
</navPoint>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${escapeXml(book.identifier)}"/></head>
<docTitle><text>${escapeXml(book.title)}</text></docTitle>
<navMap>
${points}
</navMap>
</ncx>
`;
}

/** EPUB's date format for "modified": no fractions of a second. */
function modifiedDate(isoDateTime: string): string {
  return `${new Date(isoDateTime).toISOString().slice(0, 19)}Z`;
}

/** The package file (content.opf): the details, every file and the reading order. */
function packageFile(book: EpubBook, pages: BookPage[], pictures: BookPicture[]): string {
  const coverItems =
    book.cover === null
      ? ''
      : `<item id="cover-image" href="images/cover.${book.cover.type}" media-type="${mediaTypeOf(book.cover)}" properties="cover-image"/>
<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
  const pageItems = pages
    .map(
      (page) =>
        `<item id="${page.id}" href="${page.fileName}" media-type="application/xhtml+xml"/>`,
    )
    .join('\n');
  const pictureItems = pictures
    .map(
      (picture) =>
        `<item id="${picture.id}" href="${picture.fileName}" media-type="${mediaTypeOf(picture.image)}"/>`,
    )
    .join('\n');
  // The reading order: the cover, the front pages, the contents, then the chapters.
  const spineIds = [
    ...(book.cover === null ? [] : ['cover']),
    ...pages.filter((page) => !page.id.startsWith('chapter-')).map((page) => page.id),
    'nav',
    ...pages.filter((page) => page.id.startsWith('chapter-')).map((page) => page.id),
  ];
  const spine = spineIds.map((id) => `<itemref idref="${id}"/>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${escapeXml(book.languageCode)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">urn:uuid:${escapeXml(book.identifier)}</dc:identifier>
<dc:title>${escapeXml(book.title)}</dc:title>
<dc:creator>${escapeXml(book.author)}</dc:creator>
<dc:language>${escapeXml(book.languageCode)}</dc:language>
<meta property="dcterms:modified">${modifiedDate(book.madeAt)}</meta>
${book.cover === null ? '' : '<meta name="cover" content="cover-image"/>'}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="style" href="style.css" media-type="text/css"/>
${coverItems}
${pageItems}
${pictureItems}
</manifest>
<spine toc="ncx">
${spine}
</spine>
</package>
`;
}

/** container.xml: where the package file is. */
const containerFile = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>
`;

/** The cover page, with the cover picture filling it. */
function coverPage(book: EpubBook, cover: EpubImage): string {
  const body = `<section class="cover" epub:type="cover">
<img src="images/cover.${cover.type}" alt="${escapeXml(book.words.coverAlt)}"/>
</section>`;
  return xhtmlPage(book, book.title, body);
}

/**
 * Builds the whole book.
 *
 * @param book - the title, the name, the chapters, the pictures and the translated words
 * @returns the .epub file's bytes
 * Errors: none of its own; JSZip's are passed on.
 */
export async function buildEpub(book: EpubBook): Promise<Uint8Array> {
  // Step 1: the pictures, and the pages that point to them.
  const pictures = picturesOf(book);
  const pictureFiles = new Map(pictures.map((picture) => [picture.pictureId, picture.fileName]));
  const pages = [...frontPages(book), ...chapterPages(book, pictureFiles)];
  // Step 2: "mimetype" first and uncompressed, then the files that say what is where.
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', containerFile);
  zip.file('OEBPS/content.opf', packageFile(book, pages, pictures));
  zip.file('OEBPS/toc.ncx', ncxFile(book, pages));
  zip.file('OEBPS/nav.xhtml', navPage(book, pages));
  zip.file('OEBPS/style.css', stylesheet);
  // Step 3: the cover, the pages and the pictures.
  if (book.cover !== null) {
    zip.file(`OEBPS/images/cover.${book.cover.type}`, book.cover.data);
    zip.file('OEBPS/cover.xhtml', coverPage(book, book.cover));
  }
  for (const page of pages) {
    zip.file(`OEBPS/${page.fileName}`, xhtmlPage(book, page.heading, page.body));
  }
  for (const picture of pictures) zip.file(`OEBPS/${picture.fileName}`, picture.image.data);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
