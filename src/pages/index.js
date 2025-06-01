import React, { useState } from 'react';
import { Container, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import { getOverlaysForExport } from '../store/overlaySlice';

// Import your existing components (now updated with responsive code)
import PdfUploader from '../components/PdfUploader';
import PdfViewer from '../components/PdfViewer';           // Updated with responsive code
import PdfEditorToolbar from '../components/PdfEditorToolbar'; // Updated with responsive code  
import PdfCanvasOverlay from '../components/PdfCanvasOverlay';  // Updated with responsive code
import SavePdfButton from '../components/SavePdfButton';        // Updated with responsive code

export default function Home() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

    const [pdfFile, setPdfFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [activeMode, setActiveMode] = useState('view');
    const [pdfDimensions, setPdfDimensions] = useState(null);

    // Get overlays for export (in original PDF coordinates)
    const exportOverlays = useSelector(state => {
        const allOverlays = Object.entries(state.overlay.overlays).flatMap(([page, actions]) =>
            actions.map(action => ({ ...action, pageNumber: Number(page) }))
        );
        return allOverlays;
    });

    const onDocumentLoadSuccess = (pdf) => {
        setNumPages(pdf.numPages);
        setPageNumber(1);
    };

    const handleFileUpload = (file) => {
        setPdfFile(file);
        setPageNumber(1);
        setPdfDimensions(null);
    };

    const handlePdfSizeChange = (dimensions) => {
        setPdfDimensions(dimensions);
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                maxWidth: { xs: '100%', sm: '100%', md: '1400px' },
                px: { xs: 1, sm: 2, md: 3 },
                py: { xs: 2, sm: 3, md: 4 }
            }}
        >
            <Box my={{ xs: 2, sm: 3, md: 4 }}>
                {/* Header */}
                <Box
                    textAlign="center"
                    mb={{ xs: 3, sm: 4, md: 5 }}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 2,
                        py: { xs: 2, sm: 3, md: 4 },
                        px: { xs: 2, sm: 3 },
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}
                >
                    <Typography
                        variant={isMobile ? "h5" : isTablet ? "h4" : "h3"}
                        component="h1"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            mb: { xs: 1, sm: 2 }
                        }}
                    >
                        📄 Responsive PDF Editor
                    </Typography>
                    <Typography
                        variant={isMobile ? "body2" : "body1"}
                        sx={{
                            opacity: 0.9,
                            maxWidth: '600px',
                            mx: 'auto'
                        }}
                    >
                        Edit, blur, erase, and add text to your PDFs with perfect responsiveness across all devices
                    </Typography>
                </Box>

                {/* Upload Section */}
                <Box
                    mb={3}
                    sx={{
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: 2,
                        p: { xs: 2, sm: 3 },
                        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <PdfUploader onFileUpload={handleFileUpload} />
                </Box>

                {/* Toolbar Section */}
                {pdfFile && (
                    <Box
                        mb={3}
                        sx={{
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: 2,
                            p: { xs: 2, sm: 3 },
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <Box
                            display="flex"
                            flexDirection={{ xs: 'column', sm: 'row' }}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            gap={2}
                        >
                            <PdfEditorToolbar
                                setActiveMode={setActiveMode}
                                activeMode={activeMode}
                            />
                            <SavePdfButton
                                pdfFile={pdfFile}
                                editActions={exportOverlays}
                                pdfDimensions={pdfDimensions}
                            />
                        </Box>
                    </Box>
                )}

                {/* Main Editor Section */}
                {pdfFile && (
                    <Box
                        sx={{
                            position: 'relative',
                            background: 'rgba(255,255,255,0.95)',
                            borderRadius: 2,
                            p: { xs: 1, sm: 2, md: 3 },
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(10px)',
                            minHeight: '600px'
                        }}
                    >
                        {/* Status Bar */}
                        <Box
                            mb={2}
                            p={2}
                            sx={{
                                background: activeMode === 'view'
                                    ? 'linear-gradient(90deg, #e3f2fd, #f3e5f5)'
                                    : activeMode === 'blur'
                                        ? 'linear-gradient(90deg, #fff3e0, #fce4ec)'
                                        : activeMode === 'erase'
                                            ? 'linear-gradient(90deg, #ffebee, #fce4ec)'
                                            : 'linear-gradient(90deg, #e8f5e8, #f1f8e9)',
                                borderRadius: 1,
                                border: '1px solid rgba(0,0,0,0.1)'
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 'medium',
                                    textAlign: 'center',
                                    color: 'text.secondary'
                                }}
                            >
                                {activeMode === 'view' && '👁️ View Mode - Click and drag to navigate'}
                                {activeMode === 'blur' && '🌀 Blur Mode - Click and drag to blur areas'}
                                {activeMode === 'erase' && '🗑️ Erase Mode - Click and drag to erase content'}
                                {activeMode === 'addText' && '📝 Text Mode - Click "Add Text" then click on PDF to add text'}
                            </Typography>
                        </Box>

                        {/* PDF Viewer with Overlay */}
                        <Box
                            position="relative"
                            display="flex"
                            justifyContent="center"
                            sx={{
                                '& > div': {
                                    position: 'relative',
                                    maxWidth: '100%'
                                },
                                // Force consistent cursor in PDF area based on active mode
                                cursor: activeMode === 'view' ? 'default' :
                                    activeMode === 'addText' ? 'text' : 'crosshair',
                                '& .react-pdf__Page, & .react-pdf__Page *, & canvas': {
                                    cursor: 'inherit !important'
                                }
                            }}
                        >
                            <Box
                                position="relative"
                                sx={{
                                    maxWidth: '100%',
                                    cursor: 'default', // Prevent cursor interference
                                    '& > div:first-of-type': {
                                        position: 'relative',
                                        zIndex: 1,
                                        cursor: 'default !important' // Force default cursor on PDF
                                    }
                                }}
                            >
                                <PdfViewer
                                    file={pdfFile}
                                    pageNumber={pageNumber}
                                    numPages={numPages}
                                    onDocumentLoadSuccess={onDocumentLoadSuccess}
                                    onPageChange={setPageNumber}
                                    onPdfSizeChange={handlePdfSizeChange}
                                />

                                {/* Canvas Overlay - positioned absolutely over the PDF */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: activeMode === 'view' ? 'none' : 'auto',
                                        zIndex: 10, // Higher than PDF
                                        cursor: 'default' // Prevent interference
                                    }}
                                >
                                    <PdfCanvasOverlay
                                        pageNumber={pageNumber}
                                        activeMode={activeMode}
                                        pdfFile={pdfFile}
                                        pdfDimensions={pdfDimensions}
                                    />
                                </Box>
                            </Box>
                        </Box>

                        {/* Mobile-specific controls */}
                        {isMobile && (
                            <Box
                                mt={3}
                                p={2}
                                sx={{
                                    background: 'rgba(0,0,0,0.02)',
                                    borderRadius: 1,
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="caption" color="textSecondary">
                                    💡 Tip: Use two fingers to zoom and pan on mobile
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Help Section */}
                {!pdfFile && (
                    <Box
                        mt={4}
                        p={3}
                        sx={{
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            borderRadius: 2,
                            textAlign: 'center'
                        }}
                    >
                        <Typography variant="h6" gutterBottom>
                            🚀 Get Started
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Upload a PDF file to start editing. The editor automatically adapts to your screen size
                            and maintains overlay positions perfectly across all devices.
                        </Typography>
                        <Box
                            mt={2}
                            display="flex"
                            justifyContent="center"
                            flexWrap="wrap"
                            gap={2}
                        >
                            <Box textAlign="center">
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>🌀 Blur</Typography>
                                <Typography variant="caption">Hide sensitive info</Typography>
                            </Box>
                            <Box textAlign="center">
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>🗑️ Erase</Typography>
                                <Typography variant="caption">Remove unwanted content</Typography>
                            </Box>
                            <Box textAlign="center">
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>📝 Text</Typography>
                                <Typography variant="caption">Add custom text</Typography>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </Container>
    );
}