import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, useTheme, useMediaQuery, IconButton, Tooltip, Button, Paper, Chip } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { selectAllOverlaysForExport, undo, redo, clearOverlays } from '../store/overlaySlice';
import { motion, AnimatePresence } from 'framer-motion';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Import your existing components
import PdfUploader from '../components/PdfUploader';
import PdfViewer from '../components/PdfViewer';
import PdfEditorToolbar from '../components/PdfEditorToolbar';
import PdfCanvasOverlay from '../components/PdfCanvasOverlay';
import SavePdfButton from '../components/SavePdfButton';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
    }
};

const floatingVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
        }
    }
};

const headerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.8,
            ease: "easeOut"
        }
    }
};

export default function Home() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
    const dispatch = useDispatch();

    const [pdfFile, setPdfFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [activeMode, setActiveMode] = useState('view');
    const [pdfDimensions, setPdfDimensions] = useState(null);

    // Get export overlays for save button
    const exportOverlays = useSelector(selectAllOverlaysForExport);

    // Get undo/redo state
    const canUndo = useSelector(state => state.overlay.history.length > 0);
    const canRedo = useSelector(state => state.overlay.future.length > 0);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    if (canUndo) dispatch(undo());
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    if (canRedo) dispatch(redo());
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch, canUndo, canRedo]);

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
                py: { xs: 2, sm: 3, md: 4 },
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    zIndex: 0
                }
            }}
        >
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ position: 'relative', zIndex: 1 }}
            >
                {/* Modern Professional Header */}
                <motion.div variants={headerVariants}>
                    <Paper
                        elevation={0}
                        sx={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            mb: { xs: 3, sm: 4, md: 5 },
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            position: 'relative'
                        }}
                    >
                        {/* Header Content */}
                        <Box
                            sx={{
                                p: { xs: 4, sm: 6, md: 8 },
                                textAlign: 'center',
                                position: 'relative',
                                zIndex: 2
                            }}
                        >
                            {/* Animated Logo/Icon */}
                            <motion.div
                                animate={{
                                    rotate: [0, 5, -5, 0],
                                    scale: [1, 1.05, 1]
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: { xs: 60, sm: 80, md: 100 },
                                        height: { xs: 60, sm: 80, md: 100 },
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        mb: 3,
                                        boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                                    }}
                                >
                                    <AutoFixHighIcon
                                        sx={{
                                            fontSize: { xs: 30, sm: 40, md: 50 },
                                            color: 'white'
                                        }}
                                    />
                                </Box>
                            </motion.div>

                            {/* Main Title */}
                            <Typography
                                variant={isMobile ? "h4" : isTablet ? "h3" : "h2"}
                                component="h1"
                                sx={{
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                    mb: 2,
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                PDF Editor Pro
                            </Typography>

                            {/* Subtitle */}
                            <Typography
                                variant={isMobile ? "body1" : "h6"}
                                sx={{
                                    color: 'text.secondary',
                                    maxWidth: '600px',
                                    mx: 'auto',
                                    mb: 4,
                                    lineHeight: 1.6,
                                    fontWeight: 400
                                }}
                            >
                                Professional PDF editing with precision tools. Blur sensitive content,
                                remove unwanted elements, and add custom text with pixel-perfect accuracy.
                            </Typography>

                            {/* Feature Pills */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: 1,
                                    mb: 4
                                }}
                            >
                                {[
                                    { icon: '🌀', label: 'Smart Blur', color: '#FF9800' },
                                    { icon: '✂️', label: 'Precise Erase', color: '#F44336' },
                                    { icon: '📝', label: 'Custom Text', color: '#4CAF50' },
                                    { icon: '📱', label: 'Responsive', color: '#2196F3' }
                                ].map((feature, index) => (
                                    <motion.div
                                        key={feature.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                    >
                                        <Chip
                                            icon={<span style={{ fontSize: '16px' }}>{feature.icon}</span>}
                                            label={feature.label}
                                            variant="outlined"
                                            sx={{
                                                borderColor: feature.color,
                                                color: feature.color,
                                                '&:hover': {
                                                    backgroundColor: `${feature.color}10`,
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 4px 12px ${feature.color}20`
                                                },
                                                transition: 'all 0.2s ease'
                                            }}
                                        />
                                    </motion.div>
                                ))}
                            </Box>

                            {/* Stats when editing */}
                            <AnimatePresence>
                                {pdfFile && totalEdits > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%)',
                                                borderRadius: 3,
                                                px: 4,
                                                py: 2,
                                                border: '1px solid rgba(76, 175, 80, 0.2)'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PictureAsPdfIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                                                    Page {pageNumber} of {numPages}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: '30px', height: 24, background: 'rgba(0,0,0,0.1)' }} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <EditIcon sx={{ color: '#2196F3', fontSize: 20 }} />
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2196F3' }}>
                                                    {totalEdits} edit{totalEdits > 1 ? 's' : ''} ready
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Upload Button below feature pills/stats */}
                            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                                <PdfUploader onFileUpload={handleFileUpload} />
                            </Box>
                        </Box>

                        {/* Decorative elements */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 20,
                                right: 20,
                                width: 100,
                                height: 100,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                                zIndex: 1
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 20,
                                left: 20,
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(118, 75, 162, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%)',
                                zIndex: 1
                            }}
                        />
                    </Paper>
                </motion.div>

                {/* Toolbar and Save Section */}
                {pdfFile && (
                    <motion.div variants={itemVariants}>
                        <Paper
                            elevation={0}
                            sx={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: 3,
                                p: { xs: 2, sm: 3 },
                                mb: 3,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                                }
                            }}
                        >
                            {/* Toolbar at the top */}
                            <Box sx={{ width: '100%' }}>
                                <PdfEditorToolbar
                                    setActiveMode={setActiveMode}
                                    activeMode={activeMode}
                                />
                            </Box>

                            {/* Undo/Redo/Clear controls below toolbar */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: 2,
                                    mt: 3,
                                    mb: 2
                                }}
                            >
                                <Tooltip title="Undo (Ctrl+Z)" arrow>
                                    <span>
                                        <IconButton
                                            onClick={() => dispatch(undo())}
                                            disabled={!canUndo}
                                            size="large"
                                            sx={{
                                                background: canUndo ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                                                color: canUndo ? 'white' : 'text.disabled',
                                                '&:hover': {
                                                    background: canUndo ? 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)' : 'transparent'
                                                },
                                                '&:disabled': {
                                                    opacity: 0.4
                                                }
                                            }}
                                        >
                                            <UndoIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Redo (Ctrl+Y)" arrow>
                                    <span>
                                        <IconButton
                                            onClick={() => dispatch(redo())}
                                            disabled={!canRedo}
                                            size="large"
                                            sx={{
                                                background: canRedo ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                                                color: canRedo ? 'white' : 'text.disabled',
                                                '&:hover': {
                                                    background: canRedo ? 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)' : 'transparent'
                                                },
                                                '&:disabled': {
                                                    opacity: 0.4
                                                }
                                            }}
                                        >
                                            <RedoIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Clear All Edits" arrow>
                                    <span>
                                        <IconButton
                                            onClick={() => {
                                                if (window.confirm('Clear all edits? This cannot be undone.')) {
                                                    dispatch(clearOverlays());
                                                }
                                            }}
                                            disabled={totalEdits === 0}
                                            size="large"
                                            sx={{
                                                background: totalEdits > 0 ? 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' : 'transparent',
                                                color: totalEdits > 0 ? 'white' : 'text.disabled',
                                                '&:hover': {
                                                    background: totalEdits > 0 ? 'linear-gradient(135deg, #d32f2f 0%, #c2185b 100%)' : 'transparent'
                                                },
                                                '&:disabled': {
                                                    opacity: 0.4
                                                }
                                            }}
                                        >
                                            <ClearAllIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>

                            {/* Save PDF button - big and centered */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                                <SavePdfButton
                                    pdfFile={pdfFile}
                                    editActions={exportOverlays}
                                    pdfDimensions={pdfDimensions}
                                    sx={{
                                        minWidth: { xs: '220px', sm: '260px', md: '320px' },
                                        fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.3rem' },
                                        py: 2,
                                        px: 4
                                    }}
                                />
                            </Box>

                            {/* Quick stats if needed */}
                            {totalEdits > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
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
                                </Box>
                            )}
                        </Paper>
                    </motion.div>
                )}

                {/* Main Editor Section */}
                {pdfFile && (
                    <motion.div variants={itemVariants}>
                        <Paper
                            elevation={0}
                            sx={{
                                position: 'relative',
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: 3,
                                p: { xs: 1, sm: 2, md: 3 },
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                minHeight: '600px',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 12px 35px rgba(0,0,0,0.15)'
                                }
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
                                        gap: 1,
                                        flex: 1
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

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        background: 'rgba(255,255,255,0.8)',
                                        borderRadius: 1,
                                        px: 1,
                                        py: 0.5
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 'medium',
                                            color: 'text.primary'
                                        }}
                                    >
                                        Page {pageNumber} of {numPages}
                                    </Typography>
                                </Box>
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

                            {/* Desktop keyboard shortcuts help */}
                            {!isMobile && totalEdits > 0 && (
                                <Box
                                    mt={2}
                                    p={2}
                                    sx={{
                                        background: 'rgba(76, 175, 80, 0.05)',
                                        borderRadius: 1,
                                        textAlign: 'center',
                                        border: '1px solid rgba(76, 175, 80, 0.1)'
                                    }}
                                >
                                    <Typography variant="caption" color="textSecondary">
                                        ⌨️ Keyboard Shortcuts: <strong>Ctrl+Z</strong> Undo • <strong>Ctrl+Y</strong> Redo
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </motion.div>
                )}

                {/* Enhanced Help Section */}
                {!pdfFile && (
                    <motion.div variants={itemVariants}>
                        <Paper
                            elevation={0}
                            sx={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: 4,
                                p: { xs: 3, sm: 4, md: 6 },
                                mt: 4,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 12px 35px rgba(0,0,0,0.15)'
                                }
                            }}
                        >
                            <Box textAlign="center">
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                                    🚀 Ready to Start Editing?
                                </Typography>
                                <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                                    Upload a PDF file to begin editing. Our editor automatically adapts to your screen size
                                    and maintains overlay positions perfectly across all devices. Features full undo/redo support
                                    with keyboard shortcuts.
                                </Typography>

                                <Box
                                    display="grid"
                                    gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }}
                                    gap={3}
                                    mt={3}
                                >
                                    {[
                                        { icon: '🌀', title: 'Blur Effect', desc: 'Hide sensitive information with smooth blur effects' },
                                        { icon: '🗑️', title: 'Erase Content', desc: 'Remove unwanted content with precise selection' },
                                        { icon: '📝', title: 'Add Text', desc: 'Insert custom text with professional fonts' }
                                    ].map((feature, index) => (
                                        <motion.div
                                            key={feature.title}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + index * 0.1 }}
                                        >
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    background: 'rgba(255,255,255,0.8)',
                                                    borderRadius: 2,
                                                    border: '1px solid rgba(0,0,0,0.05)',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                    {feature.icon} {feature.title}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {feature.desc}
                                                </Typography>
                                            </Paper>
                                        </motion.div>
                                    ))}
                                </Box>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </motion.div>
        </Container>
    );
}