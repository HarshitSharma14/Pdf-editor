import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
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

// Helper: word wrap text to fit within a maximum width
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
        if (line) lines.push(line);
    }
    return lines;
}

// Supported font families for the project
const SUPPORTED_FONTS = [
    'AmaticSC', 'Lato', 'Norwester', 'OpenSans', 'Oswald', 'Poppins', 'Roboto', 'RobotoCondensed', 'SourceSansPro'
];

function getFontFileName(fontFamily, fontWeight = 'Regular', fontStyle = 'normal') {
    let fam = fontFamily ? fontFamily.replace(/ /g, '') : 'Roboto';
    if (!SUPPORTED_FONTS.includes(fam)) fam = 'Roboto';

    let weight = fontWeight.charAt(0).toUpperCase() + fontWeight.slice(1);
    if (weight === 'Normal') weight = 'Regular';
    if (weight === 'SemiBold') weight = 'Semibold';

    let style = '';
    if (fontStyle === 'italic' || fontStyle === 'oblique') style = 'Italic';

    return `${fam}-${weight}${style}.ttf`;
}

const ResponsiveSavePdfButton = ({ pdfFile, editActions, pdfDimensions }) => {
    const [saving, setSaving] = React.useState(false);

    const handleSave = async () => {
        if (!pdfFile || !editActions.length) return;

        setSaving(true);

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const pages = pdfDoc.getPages();

            // Group overlays by page
            const overlaysByPage = {};
            editActions.forEach(action => {
                if (!overlaysByPage[action.pageNumber]) {
                    overlaysByPage[action.pageNumber] = [];
                }
                overlaysByPage[action.pageNumber].push(action);
            });

            const fontCache = {};

            // Process each page
            for (const [pageNumStr, actions] of Object.entries(overlaysByPage)) {
                const pageNumber = Number(pageNumStr);
                const page = pages[pageNumber - 1];
                if (!page) continue;

                const { width: pdfWidth, height: pdfHeight } = page.getSize();

                // Handle blur overlays first (require canvas rendering)
                const blurActions = actions.filter(a => a.type === 'blur');
                if (blurActions.length > 0) {
                    try {
                        // Render the page to canvas using pdfjs
                        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        const pdfPage = await pdf.getPage(pageNumber);

                        // Render at high resolution for better quality
                        const scale = 2;
                        const viewport = pdfPage.getViewport({ scale });

                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');

                        await pdfPage.render({ canvasContext: ctx, viewport }).promise;

                        // Process each blur area
                        for (const blur of blurActions) {
                            // Convert percentage coordinates to canvas coordinates
                            const canvasX = blur.x * viewport.width;
                            const canvasY = blur.y * viewport.height;
                            const canvasW = blur.width * viewport.width;
                            const canvasH = blur.height * viewport.height;

                            // Create blur effect
                            const blurCanvas = document.createElement('canvas');
                            blurCanvas.width = canvasW;
                            blurCanvas.height = canvasH;
                            const blurCtx = blurCanvas.getContext('2d');

                            // Extract area to blur
                            blurCtx.drawImage(canvas, canvasX, canvasY, canvasW, canvasH, 0, 0, canvasW, canvasH);

                            // Apply blur
                            blurCtx.filter = 'blur(12px)';
                            blurCtx.drawImage(blurCanvas, 0, 0);

                            // Convert to image and embed in PDF
                            const imgDataUrl = blurCanvas.toDataURL('image/png');
                            const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
                            const img = await pdfDoc.embedPng(imgBytes);

                            // Convert percentage coordinates to PDF coordinates
                            const pdfX = blur.x * pdfWidth;
                            const pdfY = blur.y * pdfHeight;
                            const pdfW = blur.width * pdfWidth;
                            const pdfH = blur.height * pdfHeight;

                            // Draw blurred image on PDF (note: PDF coordinates are bottom-up)
                            page.drawImage(img, {
                                x: pdfX,
                                y: pdfHeight - pdfY - pdfH,
                                width: pdfW,
                                height: pdfH,
                            });
                        }
                    } catch (error) {
                        console.warn('Error processing blur effect:', error);
                    }
                }

                // Process erase and text overlays
                for (const action of actions) {
                    if (action.type === 'erase') {
                        // Convert percentage coordinates to PDF coordinates
                        const pdfX = action.x * pdfWidth;
                        const pdfY = action.y * pdfHeight;
                        const pdfW = action.width * pdfWidth;
                        const pdfH = action.height * pdfHeight;

                        page.drawRectangle({
                            x: pdfX,
                            y: pdfHeight - pdfY - pdfH, // PDF coordinates are bottom-up
                            width: pdfW,
                            height: pdfH,
                            color: rgb(1, 1, 1), // White color for erase
                        });
                    } else if (action.type === 'addText') {
                        // Handle text overlay
                        const pdfX = action.x * pdfWidth;
                        const pdfY = action.y * pdfHeight;
                        const pdfW = action.width * pdfWidth;
                        const pdfH = action.height * pdfHeight;

                        // Calculate responsive font size
                        let fontSize;
                        if (action.fontSizePercentage) {
                            fontSize = action.fontSizePercentage * pdfHeight;
                        } else {
                            fontSize = (action.fontSize || 16) * (pdfHeight / 842); // Normalize to A4 height
                        }
                        fontSize = Math.max(8, Math.min(fontSize, 72)); // Clamp between 8 and 72pt

                        // Get font
                        const fontFamily = action.fontFamily || 'Roboto';
                        const fontWeight = action.fontWeight || 'Regular';
                        const fontStyle = action.fontStyle || 'normal';
                        const fontFileName = getFontFileName(fontFamily, fontWeight, fontStyle);
                        const fontKey = fontFileName;

                        if (!fontCache[fontKey]) {
                            try {
                                const fontBytes = await fetch(`/fonts/${fontFileName}`).then(res => res.arrayBuffer());
                                fontCache[fontKey] = await pdfDoc.embedFont(fontBytes);
                            } catch (e) {
                                // Fallback to standard fonts
                                console.warn(`Font ${fontFileName} not found, using fallback`);
                                fontCache[fontKey] = await getPDFFont(pdfDoc, fontFamily, fontWeight);
                            }
                        }

                        const font = fontCache[fontKey];

                        // Calculate text positioning
                        let ascent, lineHeight, startY;
                        try {
                            ascent = font.ascentAtSize ? font.ascentAtSize(fontSize) : fontSize * 0.8;
                            lineHeight = font.heightAtSize ? font.heightAtSize(fontSize) : fontSize * 1.2;
                        } catch (e) {
                            ascent = fontSize * 0.8;
                            lineHeight = fontSize * 1.2;
                        }

                        startY = pdfHeight - pdfY - ascent;

                        // Word wrap text to fit within the text box
                        const wrappedLines = wrapTextToWidth(action.text || '', font, fontSize, pdfW);

                        // Draw each line
                        wrappedLines.forEach((line, i) => {
                            if (line.trim()) {
                                page.drawText(line, {
                                    x: pdfX,
                                    y: startY - (i * lineHeight),
                                    size: fontSize,
                                    font,
                                    color: rgb(0, 0, 0),
                                });
                            }
                        });
                    }
                }
            }

            // Save and download the modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `edited-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error saving PDF:', error);
            alert('Error saving PDF. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const canSave = pdfFile && editActions.length > 0;

    return (
        <Button
            variant="contained"
            onClick={handleSave}
            disabled={!canSave || saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
                minWidth: '140px',
                background: canSave ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' : undefined,
                boxShadow: canSave ? '0 3px 5px 2px rgba(33, 150, 243, .3)' : undefined,
                '&:hover': {
                    background: canSave ? 'linear-gradient(45deg, #1976D2 30%, #1DA1F2 90%)' : undefined,
                },
                '&:disabled': {
                    opacity: 0.6
                }
            }}
        >
            {saving ? 'Saving...' : canSave ? `Save PDF (${editActions.length} edits)` : 'Save PDF'}
        </Button>
    );
};

export default ResponsiveSavePdfButton;