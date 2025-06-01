import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button, Container, Box, Typography } from '@mui/material';

// Import react-pdf CSS
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import PdfUploader from '../components/PdfUploader';
import PdfViewer from '../components/PdfViewer';
import PdfEditorToolbar from '../components/PdfEditorToolbar';
import SavePdfButton from '../components/SavePdfButton';
import PdfCanvasOverlay from '../components/PdfCanvasOverlay';

// Set the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function Home() {
    const [pdfFile, setPdfFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [editActions, setEditActions] = useState([]);
    const [activeMode, setActiveMode] = useState('view');

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1); // Reset to first page when new document loads
    };

    const handleFileUpload = (file) => {
        setPdfFile(file);
        setPageNumber(1);
        setEditActions([]); // Clear previous edit actions
    };

    const handleEditAction = (action) => {
        setEditActions([...editActions, action]);
    };

    return (
        <Container maxWidth="md">
            <Box my={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    PDF Editor
                </Typography>
                <PdfUploader onFileUpload={handleFileUpload} />
                <PdfEditorToolbar
                    onEditAction={handleEditAction}
                    setActiveMode={setActiveMode}
                    activeMode={activeMode}
                />
                <SavePdfButton pdfFile={pdfFile} editActions={editActions} />
                {pdfFile && (
                    <Box
                        position="relative"
                        display="flex"
                        justifyContent="center"
                        mt={2}
                    >
                        <Box position="relative">
                            <PdfViewer
                                file={pdfFile}
                                pageNumber={pageNumber}
                                numPages={numPages}
                                onDocumentLoadSuccess={onDocumentLoadSuccess}
                                onPageChange={setPageNumber}
                            />
                            <PdfCanvasOverlay
                                editActions={editActions}
                                pageNumber={pageNumber}
                                onEditAction={handleEditAction}
                                activeMode={activeMode}
                                pdfFile={pdfFile}
                            />
                        </Box>
                    </Box>
                )}
            </Box>
        </Container>
    );
}