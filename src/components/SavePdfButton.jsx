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
        if (!pdfFile || !editActions || Object.keys(editActions).length === 0) return;

        setSaving(true);
        console.log('Starting save process with overlays:', editActions);

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const pages = pdfDoc.getPages();

            // Group overlays by page
            const overlaysByPage = {};
            Object.entries(editActions).forEach(([pageNum, actions]) => {
                if (actions && actions.length > 0) {
                    overlaysByPage[pageNum] = actions;
                }
            });

            const fontCache = {};

            // Process each page
            for (const [pageNumStr, actions] of Object.entries(overlaysByPage)) {
                const pageNumber = Number(pageNumStr);
                const page = pages[pageNumber - 1];
                if (!page) continue;

                console.log(`Processing page ${pageNumber} with ${actions.length} actions`);

                const { width: pdfWidth, height: pdfHeight } = page.getSize();

                // Process text overlays first
                const textActions = actions.filter(a => a.type === 'addText');
                console.log(`Found ${textActions.length} text actions on page ${pageNumber}`);

                for (const action of textActions) {
                    try {
                        console.log('Processing text action:', action);

                        // Get font
                        const fontFamily = action.fontFamily || 'Roboto';
                        const fontFileName = getFontFileName(fontFamily);
                        const fontKey = fontFileName;

                        if (!fontCache[fontKey]) {
                            try {
                                const fontBytes = await fetch(`/fonts/${fontFileName}`).then(res => res.arrayBuffer());
                                fontCache[fontKey] = await pdfDoc.embedFont(fontBytes, { subset: true });
                                console.log(`Successfully loaded font: ${fontFileName}`);
                            } catch (e) {
                                console.warn(`Font ${fontFileName} not found, using fallback`);
                                fontCache[fontKey] = await getPDFFont(pdfDoc, fontFamily);
                            }
                        }

                        let font = fontCache[fontKey];
                        if (!font) {
                            console.error('Failed to load font, using default');
                            font = await pdfDoc.embedStandardFont('Helvetica');
                        }

                        // Draw text
                        page.drawText(action.text, {
                            x: action.x,
                            y: pdfHeight - action.y - action.height,
                            size: action.fontSize,
                            font,
                            color: rgb(0, 0, 0),
                            opacity: 1
                        });
                    } catch (error) {
                        console.error('Error processing text overlay:', error);
                    }
                }

                // Handle blur overlays
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
                            // Create blur effect
                            const blurCanvas = document.createElement('canvas');
                            blurCanvas.width = blur.width;
                            blurCanvas.height = blur.height;
                            const blurCtx = blurCanvas.getContext('2d');

                            // Extract area to blur
                            blurCtx.drawImage(canvas, blur.x, blur.y, blur.width, blur.height, 0, 0, blur.width, blur.height);

                            // Apply blur
                            blurCtx.filter = 'blur(12px)';
                            blurCtx.drawImage(blurCanvas, 0, 0);

                            // Convert to image and embed in PDF
                            const imgDataUrl = blurCanvas.toDataURL('image/png');
                            const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
                            const img = await pdfDoc.embedPng(imgBytes);

                            // Draw blurred image on PDF
                            page.drawImage(img, {
                                x: blur.x,
                                y: pdfHeight - blur.y - blur.height,
                                width: blur.width,
                                height: blur.height,
                            });
                        }
                    } catch (error) {
                        console.warn('Error processing blur effect:', error);
                    }
                }

                // Process erase overlays
                for (const action of actions) {
                    if (action.type === 'erase') {
                        page.drawRectangle({
                            x: action.x,
                            y: pdfHeight - action.y - action.height,
                            width: action.width,
                            height: action.height,
                            color: rgb(1, 1, 1), // White color for erase
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