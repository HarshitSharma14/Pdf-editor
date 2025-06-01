import React from 'react';
import { Button } from '@mui/material';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf'; // pdfjs-dist is already used in the project
import fontkit from '@pdf-lib/fontkit';
// Map fontFamily/fontWeight to PDF standard fonts
function getPDFFont(pdfDoc, fontFamily, fontWeight) {
    const fam = (fontFamily || '').toLowerCase();
    if (fam.includes('times') || fam.includes('georgia')) {
        return fontWeight === 'bold' ? pdfDoc.embedStandardFont('Times-Bold') : pdfDoc.embedStandardFont('Times-Roman');
    }
    if (fam.includes('courier')) {
        return fontWeight === 'bold' ? pdfDoc.embedStandardFont('Courier-Bold') : pdfDoc.embedStandardFont('Courier');
    }
    // Arial, Roboto, Helvetica, sans-serif → Helvetica
    return fontWeight === 'bold' ? pdfDoc.embedStandardFont('Helvetica-Bold') : pdfDoc.embedStandardFont('Helvetica');
}

// Helper: word wrap a string to fit a max width using a PDF font
function wrapTextToWidth(text, font, fontSize, maxWidth) {
    const lines = [];
    for (const rawLine of text.split('\n')) {
        let line = '';
        for (const word of rawLine.split(' ')) {
            const testLine = line ? line + ' ' + word : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        }
        lines.push(line);
    }
    return lines;
}

// Supported font families for your project
const SUPPORTED_FONTS = [
    'AmaticSC', 'Lato', 'Norwester', 'OpenSans', 'Oswald', 'Poppins', 'Roboto', 'RobotoCondensed', 'SourceSansPro'
];

function getFontFileName(fontFamily, fontWeight = 'Regular', fontStyle = 'normal') {
    let fam = fontFamily ? fontFamily.replace(/ /g, '') : 'Roboto';
    if (!SUPPORTED_FONTS.includes(fam)) fam = 'Roboto';
    let weight = fontWeight.charAt(0).toUpperCase() + fontWeight.slice(1);
    if (weight === 'Normal') weight = 'Regular';
    if (weight === 'SemiBold') weight = 'Semibold';
    if (weight === 'ExtraBold') weight = 'ExtraBold';
    if (weight === 'Black') weight = 'Black';
    let style = '';
    if (fontStyle === 'italic' || fontStyle === 'oblique') style = 'Italic';
    let fileName = `${fam}-${weight}${style}.ttf`;
    return fileName;
}

const SavePdfButton = ({ pdfFile, editActions, renderedCanvasSize }) => {
    const handleSave = async () => {
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const pages = pdfDoc.getPages();

            // Group overlays by page
            const overlaysByPage = {};
            editActions.forEach(action => {
                if (!overlaysByPage[action.pageNumber]) overlaysByPage[action.pageNumber] = [];
                overlaysByPage[action.pageNumber].push(action);
            });

            // For each page, process overlays
            const fontCache = {};
            for (const [pageNumStr, actions] of Object.entries(overlaysByPage)) {
                const pageNumber = Number(pageNumStr);
                const page = pages[pageNumber - 1];
                const { width: pdfWidth, height: pdfHeight } = page.getSize();

                // Use the rendered canvas size for this page
                const { width: renderedWidth, height: renderedHeight } = renderedCanvasSize || {};
                const scaleX = pdfWidth / renderedWidth;
                const scaleY = pdfHeight / renderedHeight;

                // Find if there are any blur overlays
                const blurActions = actions.filter(a => a.type === 'blur');
                if (blurActions.length > 0) {
                    // Render the page to a canvas using pdfjs-dist
                    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    const pdfPage = await pdf.getPage(pageNumber);
                    // Render at 2x for better quality
                    const viewport = pdfPage.getViewport({ scale: 2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await pdfPage.render({ canvasContext: ctx, viewport }).promise;

                    for (const blur of blurActions) {
                        // Use overlay coordinates directly for extraction from rendered canvas
                        // Map overlay coordinates to the rendered canvas (not scaled)
                        const scaleCanvasX = canvas.width / renderedWidth;
                        const scaleCanvasY = canvas.height / renderedHeight;
                        const x = blur.x * scaleCanvasX;
                        const y = blur.y * scaleCanvasY;
                        const w = blur.width * scaleCanvasX;
                        const h = blur.height * scaleCanvasY;

                        // Extract the area to a temp canvas
                        const blurCanvas = document.createElement('canvas');
                        blurCanvas.width = w;
                        blurCanvas.height = h;
                        const blurCtx = blurCanvas.getContext('2d');
                        blurCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
                        // Apply blur filter
                        blurCtx.filter = 'blur(8px)';
                        blurCtx.drawImage(blurCanvas, 0, 0);

                        // Convert blurred area to image
                        const imgDataUrl = blurCanvas.toDataURL('image/png');
                        const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
                        const img = await pdfDoc.embedPng(imgBytes);

                        // Convert overlay coordinates to PDF points for placement
                        const pdfX = blur.x * scaleX;
                        const pdfY = blur.y * scaleY;
                        const pdfW = blur.width * scaleX;
                        const pdfH = blur.height * scaleY;

                        // Draw the blurred image on the PDF page
                        page.drawImage(img, {
                            x: pdfX,
                            y: pdfHeight - pdfY - pdfH,
                            width: pdfW,
                            height: pdfH,
                        });
                    }
                }

                // Draw erase and text overlays as before, using correct scaling
                for (const action of actions) {
                    const pdfX = (action.x * scaleX) * 0.93;
                    const pdfY = action.y * scaleY;
                    const pdfW = action.width * scaleX;
                    const pdfH = action.height * scaleY;
                    if (action.type === 'erase') {
                        page.drawRectangle({
                            x: pdfX,
                            y: pdfHeight - pdfY - pdfH,
                            width: pdfW,
                            height: pdfH,
                            color: rgb(1, 1, 1),
                        });
                    } else if (action.type === 'addText') {
                        const fontSize = (action.fontSize || 16) * 0.6;
                        const fontFamily = action.fontFamily || 'Roboto';
                        const fontWeight = action.fontWeight || 'Regular';
                        const fontStyle = action.fontStyle || 'normal';
                        const fontFileName = getFontFileName(fontFamily, fontWeight, fontStyle);
                        const fontKey = fontFileName;
                        if (!fontCache[fontKey]) {
                            try {
                                // eslint-disable-next-line no-await-in-loop
                                const fontBytes = await fetch(`/fonts/${fontFileName}`).then(res => res.arrayBuffer());
                                // eslint-disable-next-line no-await-in-loop
                                fontCache[fontKey] = await pdfDoc.embedFont(fontBytes);
                            } catch (e) {
                                // fallback to Roboto-Regular.ttf if not found
                                if (!fontCache['Roboto-Regular.ttf']) {
                                    const fallbackBytes = await fetch('/fonts/Roboto-Regular.ttf').then(res => res.arrayBuffer());
                                    fontCache['Roboto-Regular.ttf'] = await pdfDoc.embedFont(fallbackBytes);
                                }
                                fontCache[fontKey] = fontCache['Roboto-Regular.ttf'];
                            }
                        }
                        const font = fontCache[fontKey];
                        // Use font metrics for alignment, fallback if not available
                        let ascent, lineHeight, startY;
                        if (typeof font.ascentAtSize === 'function' && typeof font.heightAtSize === 'function') {
                            ascent = font.ascentAtSize(fontSize);
                            lineHeight = font.heightAtSize(fontSize);
                        } else {
                            ascent = fontSize;
                            lineHeight = fontSize * 1.2;
                        }
                        // Increased fudge factor for better alignment
                        const fudge = fontSize * 0.75;
                        startY = pdfHeight - pdfY - ascent + fudge;
                        const wrappedLines = wrapTextToWidth(action.text, font, fontSize, pdfW);
                        wrappedLines.forEach((line, i) => {
                            page.drawText(line, {
                                x: pdfX,
                                y: startY - i * lineHeight,
                                size: fontSize,
                                font,
                                color: rgb(0, 0, 0),
                            });
                        });
                    }
                }
            }

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'modified.pdf';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error saving PDF:', error);
        }
    };

    return (
        <Button variant="contained" color="primary" onClick={handleSave}>
            Save PDF
        </Button>
    );
};

export default SavePdfButton; 