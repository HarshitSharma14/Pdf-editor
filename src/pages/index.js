import React, { useState } from 'react';
import { Container, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectAllOverlaysForExport } from '../store/overlaySlice';

// Import your existing components
import PdfUploader from '../components/PdfUploader';
import PdfViewer from '../components/PdfViewer';
import PdfEditorToolbar from '../components/PdfEditorToolbar';
import PdfCanvasOverlay from '../components/PdfCanvasOverlay';
import SavePdfButton from '../components/SavePdfButton';

export default function Home() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

    const [pdfFile, setPdfFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [activeMode, setActiveMode] = useState('view');
    const [pdfDimensions, setPdfDimensions] = useState(null);

    // Get export overlays for save button
    const exportOverlays = useSelector(selectAllOverlaysForExport);

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

    // Get total edits count for display
    const totalEdits = Object.values(exportOverlays).reduce((total, pageActions) =>
        total + (pageActions ? pageActions.length : 0), 0
    );

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
                {/* Enhanced Header */}
                <Box
                    textAlign="center"
                    mb={{ xs: 3, sm: 4, md: 5 }}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 3,
                        py: { xs: 3, sm: 4, md: 5 },
                        px: { xs: 2, sm: 3 },
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Background pattern */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                            opacity: 0.3
                        }}
                    />
                    <Typography
                        variant={isMobile ? "h4" : isTablet ? "h3" : "h2"}
                        component="h1"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            mb: { xs: 2, sm: 3 },
                            position: 'relative',
                            zIndex: 1
                        }}
                    >
                        🎨 PDF Editor Pro
                    </Typography>
                    <Typography
                        variant={isMobile ? "body1" : "h6"}
                        sx={{
                            opacity: 0.9,
                            maxWidth: '700px',
                            mx: 'auto',
                            position: 'relative',
                            zIndex: 1,
                            lineHeight: 1.6
                        }}
                    >
                        Professional PDF editing with blur effects, content removal, and text overlay.
                        Pixel-perfect results across all devices.
                    </Typography>

                    {/* Stats display when editing */}
                    {pdfFile && totalEdits > 0 && (
                        <Box
                            mt={3}
                            sx={{
                                display: 'inline-flex',
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: 2,
                                px: 3,
                                py: 1,
                                gap: 2,
                                position: 'relative',
                                zIndex: 1
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                📄 Page {pageNumber} of {numPages}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                ✏️ {totalEdits} edits
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Upload Section */}
                <Box
                    mb={3}
                    sx={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: 2,
                        p: { xs: 2, sm: 3 },
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.05)'
                    }}
                >
                    <PdfUploader onFileUpload={handleFileUpload} />
                </Box>

                {/* Toolbar and Save Section */}
                {pdfFile && (
                    <Box
                        mb={3}
                        sx={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            borderRadius: 2,
                            p: { xs: 2, sm: 3 },
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <Box
                            display="flex"
                            flexDirection={{ xs: 'column', md: 'row' }}
                            alignItems={{ xs: 'stretch', md: 'flex-start' }}
                            justifyContent="space-between"
                            gap={3}
                        >
                            <Box sx={{ flex: 1 }}>
                                <PdfEditorToolbar
                                    setActiveMode={setActiveMode}
                                    activeMode={activeMode}
                                />
                            </Box>

                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    gap: 2,
                                    alignItems: 'center',
                                    minWidth: { md: '200px' }
                                }}
                            >
                                <SavePdfButton
                                    pdfFile={pdfFile}
                                    editActions={exportOverlays}
                                    pdfDimensions={pdfDimensions}
                                />

                                {/* Quick stats */}
                                {totalEdits > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        sx={{
                                            textAlign: 'center',
                                            background: 'rgba(33, 150, 243, 0.1)',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontWeight: 'medium'
                                        }}
                                    >
                                        {totalEdits} edit{totalEdits > 1 ? 's' : ''} ready
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* Main Editor Section */}
                {pdfFile && (
                    <Box
                        sx={{
                            position: 'relative',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            borderRadius: 2,
                            p: { xs: 1, sm: 2, md: 3 },
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            minHeight: '600px'
                        }}
                    >
                        {/* Enhanced Status Bar */}
                        <Box
                            mb={3}
                            p={2}
                            sx={{
                                background: activeMode === 'view'
                                    ? 'linear-gradient(90deg, #e3f2fd, #f3e5f5)'
                                    : activeMode === 'blur'
                                        ? 'linear-gradient(90deg, #fff3e0, #fce4ec)'
                                        : activeMode === 'erase'
                                            ? 'linear-gradient(90deg, #ffebee, #fce4ec)'
                                            : 'linear-gradient(90deg, #e8f5e8, #f1f8e9)',
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 2
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 'medium',
                                    color: 'text.secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                {activeMode === 'view' && (
                                    <>
                                        <span>👁️</span>
                                        <span>View Mode - Navigate and view PDF</span>
                                    </>
                                )}
                                {activeMode === 'blur' && (
                                    <>
                                        <span>🌀</span>
                                        <span>Blur Mode - Click and drag to blur sensitive areas</span>
                                    </>
                                )}
                                {activeMode === 'erase' && (
                                    <>
                                        <span>🗑️</span>
                                        <span>Erase Mode - Click and drag to remove content</span>
                                    </>
                                )}
                                {activeMode === 'addText' && (
                                    <>
                                        <span>📝</span>
                                        <span>Text Mode - Click "Add Text" button then position text on PDF</span>
                                    </>
                                )}
                            </Typography>

                            {/* Page navigation in status bar */}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 'medium',
                                    color: 'text.primary',
                                    background: 'rgba(255,255,255,0.8)',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 1
                                }}
                            >
                                Page {pageNumber} of {numPages}
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
                                    cursor: 'default',
                                    '& > div:first-of-type': {
                                        position: 'relative',
                                        zIndex: 1,
                                        cursor: 'default !important'
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

                                {/* Canvas Overlay */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: activeMode === 'view' ? 'none' : 'auto',
                                        zIndex: 10,
                                        cursor: 'default'
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

                        {/* Mobile Help */}
                        {isMobile && (
                            <Box
                                mt={3}
                                p={2}
                                sx={{
                                    background: 'rgba(33, 150, 243, 0.05)',
                                    borderRadius: 2,
                                    textAlign: 'center',
                                    border: '1px solid rgba(33, 150, 243, 0.1)'
                                }}
                            >
                                <Typography variant="caption" color="textSecondary">
                                    💡 Mobile Tip: Use two fingers to zoom and pan the PDF
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Enhanced Help Section */}
                {!pdfFile && (
                    <Box
                        mt={4}
                        sx={{
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            borderRadius: 3,
                            p: 4,
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Background decoration */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -50,
                                right: -50,
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                zIndex: 0
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: -30,
                                left: -30,
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.15)',
                                zIndex: 0
                            }}
                        />

                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                                🚀 Ready to Start Editing?
                            </Typography>
                            <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                                Upload a PDF file to begin editing. Our editor automatically adapts to your screen size
                                and maintains overlay positions perfectly across all devices.
                            </Typography>

                            <Box
                                display="grid"
                                gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }}
                                gap={3}
                                mt={3}
                            >
                                <Box
                                    sx={{
                                        p: 3,
                                        background: 'rgba(255,255,255,0.8)',
                                        borderRadius: 2,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        🌀 Blur Effect
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Hide sensitive information with smooth blur effects
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        p: 3,
                                        background: 'rgba(255,255,255,0.8)',
                                        borderRadius: 2,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        🗑️ Erase Content
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Remove unwanted content with precise selection
                                    </Typography>
                                </Box>

                                <Box
                                    sx={{
                                        p: 3,
                                        background: 'rgba(255,255,255,0.8)',
                                        borderRadius: 2,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        📝 Add Text
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Insert custom text with professional fonts
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </Container>
    );
}