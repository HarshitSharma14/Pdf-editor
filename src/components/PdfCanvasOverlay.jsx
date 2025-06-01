import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    addOverlay,
    updateOverlay,
    removeOverlay,
    clearOverlays,
    undo,
    redo,
    setPdfDimensions,
    getOverlaysInPixels
} from '../store/overlaySlice';
import { Rnd } from 'react-rnd';

const ResponsivePdfCanvasOverlay = ({ pageNumber, activeMode, pdfFile, pdfDimensions }) => {
    const canvasRef = useRef(null);
    const blurCanvasRef = useRef(null);
    const containerRef = useRef(null);
    const dispatch = useDispatch();

    // Get overlays in pixel coordinates for rendering
    const overlaysPixels = useSelector(state => getOverlaysInPixels(state, pageNumber));

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0, currentX: 0, currentY: 0 });
    const [showTextBox, setShowTextBox] = useState(false);
    const [textBox, setTextBox] = useState({
        x: 0,
        y: 0,
        width: 200,
        height: 40,
        text: '',
        fontSize: 16,
        fontFamily: 'Roboto',
        color: '#000000'
    });
    const [editingIndex, setEditingIndex] = useState(null);
    const [canvasReady, setCanvasReady] = useState(false);

    // Font configuration
    const FONT_FAMILIES = [
        'Amatic SC', 'Lato', 'Norwester', 'Open Sans', 'Oswald', 'Poppins', 'Roboto', 'Roboto Condensed', 'Source Sans Pro'
    ];
    const FONT_WEIGHTS = [
        'Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'
    ];
    const FONT_STYLES = ['normal', 'italic'];
    const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

    // Store PDF dimensions in Redux when they change
    useEffect(() => {
        if (pdfDimensions && pdfDimensions.width && pdfDimensions.height) {
            dispatch(setPdfDimensions({ pageNumber, dimensions: pdfDimensions }));
        }
    }, [pdfDimensions, pageNumber, dispatch]);

    // Reset all edits when a new PDF is loaded
    useEffect(() => {
        if (pdfFile) {
            dispatch(clearOverlays());
            setShowTextBox(false);
            setEditingIndex(null);
            setIsDrawing(false);
        }
    }, [pdfFile, dispatch]);

    const getCursor = () => {
        switch (activeMode) {
            case 'addText':
                return 'default'; // Normal cursor in text mode
            case 'blur':
                return 'help'; // Blue question mark cursor for blur
            case 'erase':
                return 'not-allowed'; // Red circle with line through for erase
            default:
                return 'default';
        }
    };

    // Simple, reliable canvas positioning
    const updateCanvasPosition = useCallback(() => {
        const canvas = canvasRef.current;
        const blurCanvas = blurCanvasRef.current;
        const container = containerRef.current;

        if (!canvas || !blurCanvas || !container) return false;

        // Find PDF canvas
        const pdfCanvas = document.querySelector('.react-pdf__Page canvas');
        if (!pdfCanvas) return false;

        const pdfRect = pdfCanvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const left = Math.round(pdfRect.left - containerRect.left);
        const top = Math.round(pdfRect.top - containerRect.top);

        // Configure both canvases to exactly match PDF
        [canvas, blurCanvas].forEach((c, index) => {
            c.width = pdfCanvas.width;
            c.height = pdfCanvas.height;
            c.style.width = `${Math.round(pdfRect.width)}px`;
            c.style.height = `${Math.round(pdfRect.height)}px`;
            c.style.position = 'absolute';
            c.style.left = `${left}px`;
            c.style.top = `${top}px`;
            c.style.pointerEvents = index === 0 ? 'auto' : 'none'; // Always allow events on main canvas
            c.style.zIndex = index === 0 ? '20' : '21';
        });

        canvas.style.cursor = getCursor();
        blurCanvas.style.cursor = 'default'; // Blur canvas should not interfere
        setCanvasReady(true);
        return true;
    }, [activeMode]);

    // Setup canvas positioning with minimal updates
    useEffect(() => {
        let mounted = true;
        let timeoutId;

        const setupCanvas = () => {
            if (!mounted) return;

            const success = updateCanvasPosition();
            if (!success) {
                timeoutId = setTimeout(setupCanvas, 100);
            }
        };

        setupCanvas();

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(setupCanvas, 200);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [updateCanvasPosition, pageNumber, pdfFile]);

    // IMMEDIATE canvas drawing - no debouncing for visual feedback
    useEffect(() => {
        if (!canvasReady) return;

        const canvas = canvasRef.current;
        const blurCanvas = blurCanvasRef.current;
        if (!canvas || !blurCanvas) return;

        const ctx = canvas.getContext('2d');
        const blurCtx = blurCanvas.getContext('2d');
        const pdfCanvas = document.querySelector('.react-pdf__Page canvas');

        if (!pdfCanvas) return;

        // Clear and redraw immediately
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);

        // Copy PDF to blur canvas
        try {
            blurCtx.drawImage(pdfCanvas, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            return; // PDF not ready
        }

        // Draw all overlays
        overlaysPixels.forEach((action) => {
            const width = Math.abs(action.width);
            const height = Math.abs(action.height);
            if (width < 2 || height < 2) return;

            try {
                if (action.type === 'blur') {
                    // Create blur effect
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    const tempCtx = tempCanvas.getContext('2d');

                    tempCtx.drawImage(pdfCanvas, action.x, action.y, width, height, 0, 0, width, height);
                    tempCtx.filter = 'blur(12px)';
                    tempCtx.drawImage(tempCanvas, 0, 0);

                    blurCtx.clearRect(action.x, action.y, width, height);
                    blurCtx.drawImage(tempCanvas, action.x, action.y);

                    // Show border only in edit mode
                    if (activeMode === 'blur') {
                        blurCtx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
                        blurCtx.lineWidth = 2;
                        blurCtx.setLineDash([5, 5]);
                        blurCtx.strokeRect(action.x, action.y, width, height);
                        blurCtx.setLineDash([]);
                    }
                } else if (action.type === 'erase') {
                    blurCtx.fillStyle = 'white';
                    blurCtx.fillRect(action.x, action.y, width, height);

                    if (activeMode === 'erase') {
                        blurCtx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
                        blurCtx.lineWidth = 2;
                        blurCtx.setLineDash([5, 5]);
                        blurCtx.strokeRect(action.x, action.y, width, height);
                        blurCtx.setLineDash([]);
                    }
                }
            } catch (e) {
                // Skip on error
            }
        });

        // Draw live preview while drawing
        if (isDrawing && activeMode && activeMode !== 'addText') {
            const width = Math.abs(startPos.currentX - startPos.x);
            const height = Math.abs(startPos.currentY - startPos.y);

            if (width > 5 && height > 5) {
                const previewX = Math.min(startPos.x, startPos.currentX);
                const previewY = Math.min(startPos.y, startPos.currentY);

                if (activeMode === 'blur') {
                    ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
                    ctx.fillRect(previewX, previewY, width, height);
                    ctx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.strokeRect(previewX, previewY, width, height);
                    ctx.setLineDash([]);
                } else if (activeMode === 'erase') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(previewX, previewY, width, height);
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.strokeRect(previewX, previewY, width, height);
                    ctx.setLineDash([]);
                }
            }
        }
    }, [overlaysPixels, isDrawing, activeMode, startPos, canvasReady]);

    // Mouse position helper
    const getMousePosition = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);

    // Drawing event handlers - clean and simple
    const handleMouseDown = useCallback((e) => {
        // Skip entirely if not in drawing mode
        if (!activeMode || activeMode === 'view' || activeMode === 'addText') {
            return;
        }

        setIsDrawing(true);
        const pos = getMousePosition(e);
        setStartPos({ x: pos.x, y: pos.y, currentX: pos.x, currentY: pos.y });
    }, [activeMode, getMousePosition]);

    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !activeMode || activeMode === 'view') return;
        if (activeMode === 'addText') return; // No drawing in text mode

        const currentPos = getMousePosition(e);
        setStartPos(prev => ({ ...prev, currentX: currentPos.x, currentY: currentPos.y }));
    }, [isDrawing, activeMode, getMousePosition]);

    const handleMouseUp = useCallback((e) => {
        if (!isDrawing || !activeMode || activeMode === 'view') return;
        if (activeMode === 'addText') return; // No drawing in text mode

        if (!pdfDimensions) return;

        setIsDrawing(false);
        const endPos = getMousePosition(e);
        const width = endPos.x - startPos.x;
        const height = endPos.y - startPos.y;

        if (Math.abs(width) > 10 && Math.abs(height) > 10) {
            const overlayData = {
                type: activeMode,
                x: width < 0 ? endPos.x : startPos.x,
                y: height < 0 ? endPos.y : startPos.y,
                width: Math.abs(width),
                height: Math.abs(height),
            };

            dispatch(addOverlay({
                pageNumber,
                overlay: overlayData,
                pdfDimensions
            }));
        }
    }, [isDrawing, activeMode, startPos, getMousePosition, pageNumber, pdfDimensions, dispatch]);

    // Simplified canvas click - no longer needed
    const handleCanvasClick = useCallback(() => {
        // Text boxes are created directly via button - no click detection needed
    }, []);

    // Text area change handler - handles placeholder text
    const handleTextareaChange = (e) => {
        const text = e.target.value;
        setTextBox(prev => ({
            ...prev,
            text: text,
            width: Math.max(250, text.length * 8 + 60),
            height: Math.max(60, (text.split('\n').length * 25) + 40)
        }));
    };

    // FIXED: Simplified Add Text Button Handler
    const handleAddTextButton = () => {
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2 - 100;
        const centerY = containerRect.height / 2 - 20;

        setTextBox({
            x: centerX,
            y: centerY,
            width: 200,
            height: 40,
            text: '',
            fontSize: 16,
            fontFamily: 'Roboto',
            color: '#000000'
        });
        setShowTextBox(true);
        setEditingIndex(null);

        // Focus the textarea
        setTimeout(() => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                textarea.focus();
            }
        }, 100);
    };

    const handleEditTextBox = (idx) => {
        if (activeMode === 'addText') {
            setEditingIndex(idx);
            setTextBox(overlaysPixels[idx]);
            setShowTextBox(true);
        }
    };

    const handleDeleteTextBox = (idx) => {
        dispatch(removeOverlay({ pageNumber, index: idx }));
    };

    // FIXED: Simplified Text Box Save Handler
    const handleTextBoxSave = useCallback(() => {
        if (!textBox.text.trim() || !pdfDimensions) {
            setShowTextBox(false);
            return;
        }

        const overlay = {
            ...textBox,
            type: 'addText',
            // Store position and dimensions in PDF coordinates
            x: textBox.x,
            y: textBox.y,
            width: textBox.width,
            height: textBox.height,
            text: textBox.text,
            fontSize: textBox.fontSize,
            fontFamily: textBox.fontFamily,
            color: textBox.color
        };

        if (editingIndex !== null) {
            dispatch(updateOverlay({
                pageNumber,
                index: editingIndex,
                overlay,
                pdfDimensions
            }));
        } else {
            dispatch(addOverlay({
                pageNumber,
                overlay,
                pdfDimensions
            }));
        }

        setShowTextBox(false);
        setTextBox({
            x: 0,
            y: 0,
            width: 200,
            height: 40,
            text: '',
            fontSize: 16,
            fontFamily: 'Roboto',
            color: '#000000'
        });
        setEditingIndex(null);
    }, [textBox, pageNumber, pdfDimensions, dispatch, editingIndex]);

    const handleUpdateTextBox = useCallback((idx) => {
        if (textBox.text.trim() && textBox.text !== 'Type your text here...' && pdfDimensions) {
            dispatch(updateOverlay({
                pageNumber,
                index: idx,
                overlay: { ...textBox, type: 'addText' },
                pdfDimensions
            }));
        }
        setShowTextBox(false);
        setEditingIndex(null);
    }, [textBox, pageNumber, pdfDimensions, dispatch]);

    // Enhanced keyboard handler
    const handleTextareaKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextBoxSave();
        } else if (e.key === 'Escape') {
            setShowTextBox(false);
        }
    };

    // Render text overlays
    const renderTextOverlays = () => {
        return overlaysPixels.map((action, idx) => {
            if (action.type !== 'addText') return null;

            return (
                <Rnd
                    key={idx}
                    size={{ width: action.width, height: action.height }}
                    position={{ x: action.x, y: action.y }}
                    enableResizing={editingIndex !== idx}
                    disableDragging={false}
                    onDragStop={(e, d) => {
                        dispatch(updateOverlay({
                            pageNumber,
                            index: idx,
                            overlay: { ...action, x: d.x, y: d.y },
                            pdfDimensions
                        }));
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                        dispatch(updateOverlay({
                            pageNumber,
                            index: idx,
                            overlay: {
                                ...action,
                                x: position.x,
                                y: position.y,
                                width: parseInt(ref.style.width),
                                height: parseInt(ref.style.height)
                            },
                            pdfDimensions
                        }));
                    }}
                    bounds="parent"
                    style={{
                        zIndex: 1000,
                        background: 'transparent',
                        border: editingIndex === idx ? '2px solid #4CAF50' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'auto',
                    }}
                >
                    {editingIndex === idx ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <textarea
                                value={textBox.text}
                                onChange={(e) => setTextBox({ ...textBox, text: e.target.value })}
                                onKeyDown={handleTextareaKeyDown}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    padding: '4px',
                                    border: 'none',
                                    resize: 'none',
                                    fontSize: `${action.fontSize}px`,
                                    fontFamily: action.fontFamily,
                                    color: action.color,
                                    background: 'transparent',
                                    outline: 'none'
                                }}
                            />
                            <button
                                style={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '4px 8px'
                                }}
                                onClick={() => handleUpdateTextBox(idx)}
                            >
                                ✓
                            </button>
                        </div>
                    ) : (
                        <>
                            <span style={{
                                width: '100%',
                                fontSize: `${action.fontSize}px`,
                                fontFamily: action.fontFamily,
                                color: action.color,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                padding: '4px'
                            }}>
                                {action.text}
                            </span>
                            {activeMode === 'addText' && (
                                <>
                                    <button
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            background: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '10px',
                                            padding: '2px 4px'
                                        }}
                                        onClick={() => handleDeleteTextBox(idx)}
                                    >
                                        ✕
                                    </button>
                                    <button
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 24,
                                            background: '#2196F3',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontSize: '10px',
                                            padding: '2px 4px'
                                        }}
                                        onClick={() => handleEditTextBox(idx)}
                                    >
                                        ✏
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </Rnd>
            );
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: activeMode === 'view' ? 'none' : 'auto'
            }}
        >
            {/* Floating toolbar */}
            {activeMode === 'addText' && (
                <div style={{
                    position: 'absolute',
                    top: -50,
                    left: 0,
                    zIndex: 1000,
                    display: 'flex',
                    gap: '8px',
                    background: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <button
                        onClick={handleAddTextButton}
                        style={{
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        Add Text
                    </button>
                    <select
                        value={textBox.fontSize}
                        onChange={(e) => setTextBox({ ...textBox, fontSize: Number(e.target.value) })}
                        style={{
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        {[12, 14, 16, 18, 20, 24, 28, 32].map(size => (
                            <option key={size} value={size}>{size}px</option>
                        ))}
                    </select>
                    <select
                        value={textBox.fontFamily}
                        onChange={(e) => setTextBox({ ...textBox, fontFamily: e.target.value })}
                        style={{
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        {FONT_FAMILIES.map(font => (
                            <option key={font} value={font}>{font}</option>
                        ))}
                    </select>
                    <input
                        type="color"
                        value={textBox.color}
                        onChange={(e) => setTextBox({ ...textBox, color: e.target.value })}
                        style={{
                            width: '32px',
                            height: '32px',
                            padding: '0',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>
            )}

            {/* Canvas layers */}
            <canvas ref={blurCanvasRef} style={{ cursor: 'default', pointerEvents: 'none' }} />
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleCanvasClick}
                style={{
                    cursor: getCursor(),
                    pointerEvents: 'auto'
                }}
            />

            {/* Render text overlays */}
            {renderTextOverlays()}

            {/* Active text box */}
            {showTextBox && (
                <Rnd
                    size={{ width: textBox.width, height: textBox.height }}
                    position={{ x: textBox.x, y: textBox.y }}
                    onDragStop={(e, d) => setTextBox({ ...textBox, x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) => {
                        setTextBox({
                            ...textBox,
                            x: position.x,
                            y: position.y,
                            width: parseInt(ref.style.width),
                            height: parseInt(ref.style.height)
                        });
                    }}
                    bounds="parent"
                    style={{
                        zIndex: 1000,
                        background: 'white',
                        border: '2px solid #4CAF50',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <textarea
                            value={textBox.text}
                            onChange={(e) => setTextBox({ ...textBox, text: e.target.value })}
                            onKeyDown={handleTextareaKeyDown}
                            style={{
                                width: '100%',
                                height: '100%',
                                padding: '4px',
                                border: 'none',
                                resize: 'none',
                                fontSize: `${textBox.fontSize}px`,
                                fontFamily: textBox.fontFamily,
                                color: textBox.color,
                                outline: 'none',
                                background: 'transparent'
                            }}
                        />
                        <button
                            style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '4px 8px'
                            }}
                            onClick={handleTextBoxSave}
                        >
                            ✓
                        </button>
                    </div>
                </Rnd>
            )}
        </div>
    );
};

export default ResponsivePdfCanvasOverlay;