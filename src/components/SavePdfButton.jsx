import React from 'react';
import { Button } from '@mui/material';
import { PDFDocument, rgb } from 'pdf-lib';

const SavePdfButton = ({ pdfFile, editActions }) => {
    const handleSave = async () => {
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            editActions.forEach(action => {
                const page = pages[action.pageNumber - 1];
                switch (action.type) {
                    case 'blur':
                        page.drawRectangle({
                            x: action.x,
                            y: action.y,
                            width: action.width,
                            height: action.height,
                            color: rgb(0, 0, 0),
                            opacity: 0.5,
                        });
                        break;
                    case 'erase':
                        page.drawRectangle({
                            x: action.x,
                            y: action.y,
                            width: action.width,
                            height: action.height,
                            color: rgb(1, 1, 1),
                        });
                        break;
                    case 'addText':
                        page.drawText(action.text, {
                            x: action.x,
                            y: action.y,
                            size: 16,
                            color: rgb(0, 0, 0),
                        });
                        break;
                    default:
                        break;
                }
            });

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