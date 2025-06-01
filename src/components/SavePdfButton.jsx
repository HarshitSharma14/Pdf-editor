import React from 'react';
import { Button } from '@mui/material';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf'; // pdfjs-dist is already used in the project

const SavePdfButton = ({ pdfFile, editActions, renderedCanvasSize }) => {
    const handleSave = async () => {
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            // Group overlays by page
            const overlaysByPage = {};
            editActions.forEach(action => {
                if (!overlaysByPage[action.pageNumber]) overlaysByPage[action.pageNumber] = [];
                overlaysByPage[action.pageNumber].push(action);
            });

            // For each page, process overlays
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
                actions.forEach(action => {
                    const pdfX = action.x * scaleX;
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
                        // Use a fixed font size (16)
                        const fontSize = 16;
                        // Support multi-line text
                        const lines = action.text.split('\n');
                        lines.forEach((line, i) => {
                            page.drawText(line, {
                                x: pdfX,
                                y: pdfHeight - pdfY - fontSize - i * (fontSize + 2), // top-left, with line spacing
                                size: fontSize,
                                color: rgb(0, 0, 0),
                            });
                        });
                    }
                });
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