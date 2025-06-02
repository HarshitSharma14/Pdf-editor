import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import fontkit from '@pdf-lib/fontkit';

// Helper: Convert hex color to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
}

// Helper: Get standard PDF font
async function getStandardFont(pdfDoc, fontFamily = 'Helvetica', fontWeight = 'Regular') {
    const fam = (fontFamily || '').toLowerCase();
    const weight = (fontWeight || '').toLowerCase();

    if (fam.includes('times') || fam.includes('georgia')) {
        return weight.includes('bold')
            ? await pdfDoc.embedStandardFont('Times-Bold')
            : await pdfDoc.embedStandardFont('Times-Roman');
    }
    if (fam.includes('courier')) {
        return weight.includes('bold')
            ? await pdfDoc.embedStandardFont('Courier-Bold')
            : await pdfDoc.embedStandardFont('Courier');
    }
    // Default to Helvetica for Arial, Roboto, sans-serif, etc.
    return weight.includes('bold')
        ? await pdfDoc.embedStandardFont('Helvetica-Bold')
        : await pdfDoc.embedStandardFont('Helvetica');
}

const ResponsiveSavePdfButton = ({ pdfFile, editActions, pdfDimensions }) => {
    const [saving, setSaving] = React.useState(false);

    const handleSave = async () => {
        if (!pdfFile || !editActions || Object.keys(editActions).length === 0) {
            console.log('No file or actions to save');
            return;
        }

        setSaving(true);
        console.log('Starting save process with overlays:', editActions);

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            pdfDoc.registerFontkit(fontkit);
            const pages = pdfDoc.getPages();

            // Process each page that has overlays
            for (const [pageNumStr, actions] of Object.entries(editActions)) {
                const pageNumber = Number(pageNumStr);
                const page = pages[pageNumber - 1];
                if (!page || !actions || actions.length === 0) continue;

                console.log(`Processing page ${pageNumber} with ${actions.length} actions`);
                const { width: pdfWidth, height: pdfHeight } = page.getSize();

                // Separate actions by type
                const blurActions = actions.filter(a => a.type === 'blur');
                const eraseActions = actions.filter(a => a.type === 'erase');
                const textActions = actions.filter(a => a.type === 'addText');

                // Process blur effects first (using canvas rendering)
                if (blurActions.length > 0) {
                    try {
                        console.log(`Processing ${blurActions.length} blur actions`);

                        // Render page to canvas at high resolution
                        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        const pdfPage = await pdf.getPage(pageNumber);

                        // Use higher scale for better quality
                        const scale = 3;
                        const viewport = pdfPage.getViewport({ scale });

                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');

                        // Render the page
                        await pdfPage.render({
                            canvasContext: ctx,
                            viewport
                        }).promise;

                        // Process each blur area
                        for (const blur of blurActions) {
                            try {
                                // Scale coordinates to match rendered canvas
                                const scaledX = blur.x * scale;
                                const scaledY = blur.y * scale;
                                const scaledWidth = blur.width * scale;
                                const scaledHeight = blur.height * scale;

                                // Create temporary canvas for blur effect
                                const tempCanvas = document.createElement('canvas');
                                tempCanvas.width = scaledWidth;
                                tempCanvas.height = scaledHeight;
                                const tempCtx = tempCanvas.getContext('2d');

                                // Extract the area to blur
                                tempCtx.drawImage(
                                    canvas,
                                    scaledX, scaledY, scaledWidth, scaledHeight,
                                    0, 0, scaledWidth, scaledHeight
                                );

                                // Apply blur effect
                                tempCtx.filter = 'blur(20px)';
                                tempCtx.globalCompositeOperation = 'source-over';
                                tempCtx.drawImage(tempCanvas, 0, 0);

                                // Convert to image and embed in PDF
                                const imgDataUrl = tempCanvas.toDataURL('image/png', 1.0);
                                const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
                                const image = await pdfDoc.embedPng(imgBytes);

                                // Draw the blurred image on the PDF
                                page.drawImage(image, {
                                    x: blur.x,
                                    y: pdfHeight - blur.y - blur.height,
                                    width: blur.width,
                                    height: blur.height,
                                    opacity: 1
                                });

                                console.log(`Applied blur at: ${blur.x}, ${blur.y}, ${blur.width}x${blur.height}`);
                            } catch (blurError) {
                                console.error('Error processing individual blur:', blurError);
                            }
                        }
                    } catch (blurError) {
                        console.error('Error processing blur effects:', blurError);
                    }
                }

                // Process erase actions (white rectangles)
                for (const erase of eraseActions) {
                    try {
                        page.drawRectangle({
                            x: erase.x,
                            y: pdfHeight - erase.y - erase.height,
                            width: erase.width,
                            height: erase.height,
                            color: rgb(1, 1, 1), // White
                            opacity: 1
                        });
                        console.log(`Applied erase at: ${erase.x}, ${erase.y}, ${erase.width}x${erase.height}`);
                    } catch (eraseError) {
                        console.error('Error processing erase:', eraseError);
                    }
                }

                // Process text actions
                for (const text of textActions) {
                    try {
                        // Get font (using standard fonts for reliability)
                        const font = await getStandardFont(pdfDoc, text.fontFamily, text.fontWeight);

                        // Convert color
                        const color = hexToRgb(text.color || '#000000');

                        // Calculate font size - ensure it's reasonable
                        const fontSize = Math.max(8, Math.min(72, text.fontSize || 16));

                        // Draw text
                        page.drawText(text.text || '', {
                            x: text.x,
                            y: pdfHeight - text.y - (fontSize * 0.8), // Adjust baseline
                            size: fontSize,
                            font: font,
                            color: rgb(color.r, color.g, color.b),
                            opacity: 1
                        });

                        console.log(`Applied text "${text.text}" at: ${text.x}, ${text.y}`);
                    } catch (textError) {
                        console.error('Error processing text:', textError);
                    }
                }
            }

            // Save the modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Download the file
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited-pdf-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('PDF saved successfully');

        } catch (error) {
            console.error('Error saving PDF:', error);
            alert('Error saving PDF. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Fix the condition - editActions is an object, not array
    const hasEdits = editActions && Object.keys(editActions).length > 0 &&
        Object.values(editActions).some(pageActions => pageActions && pageActions.length > 0);

    const totalEdits = hasEdits ?
        Object.values(editActions).reduce((total, pageActions) =>
            total + (pageActions ? pageActions.length : 0), 0
        ) : 0;

    return (
        <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasEdits || saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
                minWidth: '160px',
                background: hasEdits ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' : undefined,
                boxShadow: hasEdits ? '0 3px 5px 2px rgba(33, 150, 243, .3)' : undefined,
                '&:hover': {
                    background: hasEdits ? 'linear-gradient(45deg, #1976D2 30%, #1DA1F2 90%)' : undefined,
                },
                '&:disabled': {
                    opacity: 0.6
                }
            }}
        >
            {saving ? 'Saving...' : hasEdits ? `Save PDF (${totalEdits} edits)` : 'Save PDF'}
        </Button>
    );
};

export default ResponsiveSavePdfButton;