import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    addOverlay,
    updateOverlay,
    removeOverlay,
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
    const [textBox, setTextBox] = useState({ x: 0, y: 0, width: 120, height: 30, text: '' });
    const [addMode, setAddMode] = useState(false);
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

    const getCursor = () => {
        switch (activeMode) {
            case 'addText':
                return addMode ? 'text' : 'pointer';
            case 'blur':
            case 'erase':
                return 'crosshair';
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
            c.style.pointerEvents = index === 0 && activeMode !== 'view' ? 'auto' : 'none';
            c.style.zIndex = index === 0 ? '20' : '21';
        });

        canvas.style.cursor = getCursor();
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

    // Drawing event handlers
    const handleMouseDown = useCallback((e) => {
        if (!activeMode || activeMode === 'addText' || activeMode === 'view') return;

        setIsDrawing(true);
        const pos = getMousePosition(e);
        setStartPos({ x: pos.x, y: pos.y, currentX: pos.x, currentY: pos.y });
    }, [activeMode, getMousePosition]);

    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !activeMode || activeMode === 'addText') return;

        const currentPos = getMousePosition(e);
        setStartPos(prev => ({ ...prev, currentX: currentPos.x, currentY: currentPos.y }));
    }, [isDrawing, activeMode, getMousePosition]);

    const handleMouseUp = useCallback((e) => {
        if (!isDrawing || !activeMode || activeMode === 'addText' || !pdfDimensions) return;

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

    // Text handling
    const handleCanvasClick = useCallback((e) => {
        if (activeMode !== 'addText' || !addMode) return;

        const pos = getMousePosition(e);
        setTextBox({
            x: pos.x,
            y: pos.y,
            width: 150,
            height: 40,
            text: '',
            fontSize: 16,
            fontFamily: 'Roboto',
            fontWeight: 'Regular',
            fontStyle: 'normal'
        });
        setShowTextBox(true);
        setAddMode(false);
        setEditingIndex(null);
    }, [activeMode, addMode, getMousePosition]);

    // Text area change handler - FIXED!
    const handleTextareaChange = (e) => {
        const text = e.target.value;
        setTextBox(prev => ({
            ...prev,
            text: text,
            width: Math.max(150, text.length * 8 + 40),
            height: Math.max(40, (text.split('\n').length * 20) + 20)
        }));
    };

    const handleAddTextButton = () => {
        setAddMode(true);
        setShowTextBox(false);
        setEditingIndex(null);
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

    const handleTextBoxSave = useCallback(() => {
        if (textBox.text.trim() && pdfDimensions) {
            dispatch(addOverlay({
                pageNumber,
                overlay: { ...textBox, type: 'addText' },
                pdfDimensions
            }));
        }
        setShowTextBox(false);
        setAddMode(false);
    }, [textBox, pageNumber, pdfDimensions, dispatch]);

    const handleUpdateTextBox = useCallback((idx) => {
        if (textBox.text.trim() && pdfDimensions) {
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

    const handleRndDragStop = (e, d, idx) => {
        if (!pdfDimensions) return;

        const updatedOverlay = { ...overlaysPixels[idx], x: d.x, y: d.y };
        dispatch(updateOverlay({
            pageNumber,
            index: idx,
            overlay: updatedOverlay,
            pdfDimensions
        }));
    };

    const handleRndResizeStop = (e, direction, ref, delta, position, idx) => {
        if (!pdfDimensions) return;

        const updatedOverlay = {
            ...overlaysPixels[idx],
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
            x: position.x,
            y: position.y
        };

        dispatch(updateOverlay({
            pageNumber,
            index: idx,
            overlay: updatedOverlay,
            pdfDimensions
        }));
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
            {/* Clean toolbar */}
            <div style={{
                position: 'absolute',
                top: -50,
                left: 0,
                zIndex: 20,
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
            }}>
                {activeMode === 'addText' && (
                    <button
                        onClick={handleAddTextButton}
                        style={{
                            background: addMode ? '#4CAF50' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        {addMode ? '📝 Click to Add Text' : '➕ Add Text'}
                    </button>
                )}

                <button
                    onClick={() => dispatch(undo())}
                    style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    ↶ Undo
                </button>
                <button
                    onClick={() => dispatch(redo())}
                    style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    ↷ Redo
                </button>
            </div>

            {/* Canvas layers */}
            <canvas ref={blurCanvasRef} />
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleCanvasClick}
            />

            {/* Text overlays */}
            {overlaysPixels.map((action, idx) => (
                action.type === 'addText' && (
                    <div key={idx}>
                        {activeMode === 'addText' ? (
                            <Rnd
                                size={{ width: action.width, height: action.height }}
                                position={{ x: action.x, y: action.y }}
                                enableResizing={editingIndex !== idx}
                                disableDragging={false}
                                onDragStop={(e, d) => handleRndDragStop(e, d, idx)}
                                onResizeStop={(e, direction, ref, delta, position) =>
                                    handleRndResizeStop(e, direction, ref, delta, position, idx)
                                }
                                bounds="parent"
                                style={{
                                    zIndex: 15,
                                    background: 'rgba(255,255,255,0.9)',
                                    border: '2px solid #2196F3',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    pointerEvents: 'auto',
                                }}
                            >
                                {editingIndex === idx ? (
                                    <div style={{ width: '100%', position: 'relative', padding: '4px' }}>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <select
                                                value={textBox.fontFamily || 'Roboto'}
                                                onChange={e => setTextBox(prev => ({ ...prev, fontFamily: e.target.value }))}
                                                style={{ fontSize: '10px', padding: '2px' }}
                                            >
                                                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            <select
                                                value={textBox.fontSize || 16}
                                                onChange={e => setTextBox(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                                                style={{ fontSize: '10px', padding: '2px' }}
                                            >
                                                {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                                            </select>
                                        </div>
                                        <textarea
                                            style={{
                                                width: '100%',
                                                minHeight: '30px',
                                                border: 'none',
                                                background: 'transparent',
                                                resize: 'none',
                                                outline: 'none',
                                                fontSize: textBox.fontSize || 16,
                                                fontFamily: textBox.fontFamily || 'Roboto',
                                                padding: '2px',
                                            }}
                                            value={textBox.text}
                                            autoFocus
                                            onChange={handleTextareaChange}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleUpdateTextBox(idx);
                                                }
                                            }}
                                        />
                                        <button
                                            style={{
                                                position: 'absolute',
                                                top: 2,
                                                right: 2,
                                                background: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                padding: '2px 4px'
                                            }}
                                            onClick={() => handleUpdateTextBox(idx)}
                                        >
                                            ✓
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span style={{
                                            padding: '4px 30px 4px 4px',
                                            width: '100%',
                                            fontSize: action.fontSize || 16,
                                            fontFamily: action.fontFamily || 'Roboto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {action.text}
                                        </span>
                                        <button
                                            style={{
                                                position: 'absolute',
                                                top: 2,
                                                right: 2,
                                                background: '#f44336',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                padding: '1px 3px'
                                            }}
                                            onClick={() => handleDeleteTextBox(idx)}
                                        >
                                            ✕
                                        </button>
                                        <button
                                            style={{
                                                position: 'absolute',
                                                top: 2,
                                                right: 22,
                                                background: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                padding: '1px 3px'
                                            }}
                                            onClick={() => handleEditTextBox(idx)}
                                        >
                                            ✏
                                        </button>
                                    </>
                                )}
                            </Rnd>
                        ) : (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: action.y,
                                    left: action.x,
                                    width: action.width,
                                    height: action.height,
                                    fontSize: action.fontSize || 16,
                                    fontFamily: action.fontFamily || 'Roboto',
                                    color: '#000',
                                    pointerEvents: 'none',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    zIndex: 12,
                                    padding: '2px'
                                }}
                            >
                                {action.text}
                            </div>
                        )}
                    </div>
                )
            ))}

            {/* New text box */}
            {showTextBox && editingIndex === null && (
                <Rnd
                    size={{ width: textBox.width, height: textBox.height }}
                    position={{ x: textBox.x, y: textBox.y }}
                    enableResizing={true}
                    onDragStop={(e, d) => setTextBox(prev => ({ ...prev, x: d.x, y: d.y }))}
                    onResizeStop={(e, direction, ref, delta, position) =>
                        setTextBox(prev => ({
                            ...prev,
                            width: parseInt(ref.style.width, 10),
                            height: parseInt(ref.style.height, 10),
                            x: position.x,
                            y: position.y
                        }))
                    }
                    bounds="parent"
                    style={{
                        zIndex: 15,
                        background: 'rgba(255,255,255,0.95)',
                        border: '2px solid #4CAF50',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        pointerEvents: 'auto',
                    }}
                >
                    <div style={{ width: '100%', position: 'relative', padding: '4px' }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                            <select
                                value={textBox.fontFamily || 'Roboto'}
                                onChange={e => setTextBox(prev => ({ ...prev, fontFamily: e.target.value }))}
                                style={{ fontSize: '10px', padding: '2px' }}
                            >
                                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select
                                value={textBox.fontSize || 16}
                                onChange={e => setTextBox(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                                style={{ fontSize: '10px', padding: '2px' }}
                            >
                                {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                            </select>
                        </div>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '30px',
                                border: 'none',
                                background: 'transparent',
                                resize: 'none',
                                outline: 'none',
                                fontSize: textBox.fontSize || 16,
                                fontFamily: textBox.fontFamily || 'Roboto',
                                padding: '2px',
                            }}
                            value={textBox.text}
                            autoFocus
                            onChange={handleTextareaChange}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleTextBoxSave();
                                }
                            }}
                            placeholder="Enter text..."
                        />
                        <button
                            style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '2px 4px'
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