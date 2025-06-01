import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addOverlay, updateOverlay, removeOverlay, undo, redo } from '../store/overlaySlice';
import { Rnd } from 'react-rnd';

const PdfCanvasOverlay = ({ pageNumber, activeMode, pdfFile, onCanvasSizeChange }) => {
    const canvasRef = useRef(null);
    const blurCanvasRef = useRef(null);
    const dispatch = useDispatch();
    const overlays = useSelector(state => state.overlay.overlays[pageNumber] || []);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0, currentX: 0, currentY: 0 });
    const [showTextBox, setShowTextBox] = useState(false);
    const [textBox, setTextBox] = useState({ x: 0, y: 0, width: 120, height: 30, text: '' });
    const [addMode, setAddMode] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // Set canvas size and position to match the PDF page, using MutationObserver for robustness
    useEffect(() => {
        const canvas = canvasRef.current;
        const blurCanvas = blurCanvasRef.current;
        if (!canvas || !blurCanvas) return;
        let observer;
        const updateCanvasSize = () => {
            const pdfPage = canvas.parentElement.querySelector('.react-pdf__Page canvas');
            if (pdfPage) {
                const rect = pdfPage.getBoundingClientRect();
                canvas.width = pdfPage.width;
                canvas.height = pdfPage.height;
                blurCanvas.width = pdfPage.width;
                blurCanvas.height = pdfPage.height;
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
                blurCanvas.style.width = `${rect.width}px`;
                blurCanvas.style.height = `${rect.height}px`;
                canvas.style.position = 'absolute';
                blurCanvas.style.position = 'absolute';
                canvas.style.top = `${pdfPage.offsetTop}px`;
                blurCanvas.style.top = `${pdfPage.offsetTop}px`;
                canvas.style.left = `${pdfPage.offsetLeft}px`;
                blurCanvas.style.left = `${pdfPage.offsetLeft}px`;
                canvas.style.pointerEvents = activeMode ? 'auto' : 'none';
                blurCanvas.style.pointerEvents = 'none';
                canvas.style.cursor = activeMode === 'addText' ? (addMode ? 'text' : 'pointer') : (activeMode ? 'crosshair' : 'default');
                canvas.style.zIndex = 1;
                blurCanvas.style.zIndex = 2;
                // Notify parent of canvas size in pixels
                if (onCanvasSizeChange) {
                    onCanvasSizeChange({ width: pdfPage.width, height: pdfPage.height });
                }
            }
        };
        observer = new MutationObserver(() => { updateCanvasSize(); });
        if (canvas.parentElement) {
            observer.observe(canvas.parentElement, { childList: true, subtree: true });
        }
        window.addEventListener('resize', updateCanvasSize);
        updateCanvasSize();
        return () => {
            if (observer) observer.disconnect();
            window.removeEventListener('resize', updateCanvasSize);
        };
    }, [activeMode, pageNumber, pdfFile, addMode, onCanvasSizeChange]);

    // Draw overlays except addText (handled as overlays)
    useEffect(() => {
        const canvas = canvasRef.current;
        const blurCanvas = blurCanvasRef.current;
        if (!canvas || !blurCanvas) return;

        const ctx = canvas.getContext('2d');
        const blurCtx = blurCanvas.getContext('2d');

        // Clear both canvases
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);

        // Draw PDF content to blur canvas
        const pdfPage = canvas.parentElement.querySelector('.react-pdf__Page canvas');
        if (pdfPage) {
            blurCtx.drawImage(pdfPage, 0, 0, canvas.width, canvas.height);
        }

        // Apply blur to all blur areas
        overlays.forEach(action => {
            if (action.type === 'blur') {
                const width = Math.abs(action.width);
                const height = Math.abs(action.height);

                // Skip if dimensions are too small
                if (width < 5 || height < 5) return;

                // Create a temporary canvas for this specific blur area
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw the specific area to temp canvas
                tempCtx.drawImage(
                    blurCanvas,
                    action.x, action.y, width, height,
                    0, 0, width, height
                );

                // Apply blur to temp canvas
                tempCtx.filter = 'blur(8px)';
                tempCtx.drawImage(tempCanvas, 0, 0);

                // Draw the blurred area back to blur canvas
                blurCtx.clearRect(action.x, action.y, width, height);
                blurCtx.drawImage(tempCanvas, action.x, action.y);
            }
        });

        // Draw erase areas on blur canvas (so they appear above PDF and blur)
        overlays.forEach(action => {
            if (action.type === 'erase') {
                const width = Math.abs(action.width);
                const height = Math.abs(action.height);

                // Skip if dimensions are too small
                if (width < 5 || height < 5) return;

                blurCtx.fillStyle = 'white';
                blurCtx.fillRect(action.x, action.y, width, height);
            }
        });

        // If drawing, show the current selection
        if (isDrawing && activeMode && activeMode !== 'addText') {
            const width = Math.abs(startPos.currentX - startPos.x);
            const height = Math.abs(startPos.currentY - startPos.y);

            // Skip if dimensions are too small
            if (width < 5 || height < 5) return;

            if (activeMode === 'blur') {
                // Create a temporary canvas for the preview
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw the specific area to temp canvas
                tempCtx.drawImage(
                    blurCanvas,
                    startPos.x, startPos.y, width, height,
                    0, 0, width, height
                );

                // Apply blur to temp canvas
                tempCtx.filter = 'blur(8px)';
                tempCtx.drawImage(tempCanvas, 0, 0);

                // Draw the blurred preview
                blurCtx.clearRect(startPos.x, startPos.y, width, height);
                blurCtx.drawImage(tempCanvas, startPos.x, startPos.y);
            } else if (activeMode === 'erase') {
                // Draw erase preview on main canvas
                ctx.fillStyle = 'white';
                ctx.globalAlpha = 0.5;
                ctx.fillRect(
                    startPos.x,
                    startPos.y,
                    width,
                    height
                );
                ctx.globalAlpha = 1.0;
            }
        }
    }, [overlays, isDrawing, activeMode, startPos]);

    // Add Text: Only allow adding after clicking Add Text button
    const handleCanvasClick = (e) => {
        if (!(activeMode === 'addText' && addMode)) return;
        const pos = getMousePosition(e);
        setTextBox({ x: pos.x, y: pos.y, width: 120, height: 50, text: '' });
        setShowTextBox(true);
        setAddMode(false);
        setEditingIndex(null);
    };

    // Add Text: Button handler
    const handleAddTextButton = () => {
        setAddMode(true);
        setShowTextBox(false);
        setEditingIndex(null);
    };

    // Add Text: Save new textbox
    const handleTextBoxBlur = () => {
        if (textBox.text.trim() !== '') {
            dispatch(addOverlay({
                pageNumber,
                overlay: { ...textBox, type: 'addText' }
            }));
        }
        setShowTextBox(false);
        setAddMode(false);
    };

    // Add Text: Edit existing textbox
    const handleEditTextBox = (idx) => {
        if (activeMode === 'addText') {
            setEditingIndex(idx);
            setTextBox(overlays[idx]);
            setShowTextBox(true);
        }
    };

    // Auto-resize textarea based on content
    const handleTextareaChange = (e, idx) => {
        const textarea = e.target;
        const text = e.target.value;

        // If text contains newlines, expand vertically
        if (text.includes('\n')) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            const newHeight = Math.max(50, textarea.scrollHeight);
            setTextBox(prev => ({
                ...prev,
                text: text,
                height: newHeight
            }));
        } else {
            // Otherwise, expand horizontally
            const newWidth = Math.max(120, text.length * 8); // Approximate width based on character count
            setTextBox(prev => ({
                ...prev,
                text: text,
                width: newWidth
            }));
        }
    };

    // Keyboard save for textarea
    const handleTextBoxKeyDown = (e, idx) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // When Enter is pressed, switch to vertical expansion
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            const newHeight = Math.max(50, textarea.scrollHeight);
            setTextBox(prev => ({
                ...prev,
                height: newHeight
            }));

            if (editingIndex === null) {
                handleTextBoxBlur();
            } else {
                handleEditTextBox(idx);
            }
        }
    };

    // Save textbox with current height
    const handleSaveTextBox = (idx) => {
        if (textBox.text.trim() !== '') {
            dispatch(updateOverlay({
                pageNumber,
                index: idx,
                overlay: { ...textBox, type: 'addText' }
            }));
        }
        setShowTextBox(false);
        setEditingIndex(null);
    };

    // Mouse position helper
    const getMousePosition = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    // Drawing logic for blur/erase
    const handleMouseDown = (e) => {
        if (!activeMode || activeMode === 'addText') return;
        setIsDrawing(true);
        const pos = getMousePosition(e);
        setStartPos({ x: pos.x, y: pos.y, currentX: pos.x, currentY: pos.y });
    };

    const handleCanvasMouseMove = (e) => {
        if (!isDrawing || !activeMode || activeMode === 'addText') return;
        const currentPos = getMousePosition(e);
        setStartPos(prev => ({ ...prev, currentX: currentPos.x, currentY: currentPos.y }));
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || !activeMode || activeMode === 'addText') return;
        setIsDrawing(false);
        const endPos = getMousePosition(e);
        const width = endPos.x - startPos.x;
        const height = endPos.y - startPos.y;

        // Only add overlay if there's actual area selected
        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
            dispatch(addOverlay({
                pageNumber,
                overlay: {
                    type: activeMode,
                    x: width < 0 ? endPos.x : startPos.x,
                    y: height < 0 ? endPos.y : startPos.y,
                    width: Math.abs(width),
                    height: Math.abs(height),
                }
            }));
        }
    };

    // Rnd drag handler
    const handleRndDragStop = (e, d, idx) => {
        if (editingIndex === idx) {
            setTextBox(prev => ({ ...prev, x: d.x, y: d.y }));
        } else {
            dispatch(updateOverlay({
                pageNumber,
                index: idx,
                overlay: { ...overlays[idx], x: d.x, y: d.y }
            }));
        }
    };

    // Rnd resize handler
    const handleRndResizeStop = (e, direction, ref, delta, position, idx) => {
        if (editingIndex === idx) {
            setTextBox(prev => ({
                ...prev,
                width: parseInt(ref.style.width, 10),
                height: parseInt(ref.style.height, 10),
                x: position.x,
                y: position.y
            }));
        } else {
            dispatch(updateOverlay({
                pageNumber,
                index: idx,
                overlay: {
                    ...overlays[idx],
                    width: parseInt(ref.style.width, 10),
                    height: parseInt(ref.style.height, 10),
                    x: position.x,
                    y: position.y
                }
            }));
        }
    };

    // Delete textbox
    const handleDeleteTextBox = (idx) => {
        dispatch(removeOverlay({ pageNumber, index: idx }));
    };

    return (
        <>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, display: 'flex', gap: '10px' }}>
                {activeMode === 'addText' && (
                    <button
                        onClick={handleAddTextButton}
                        style={{
                            background: addMode ? '#4CAF50' : '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {addMode ? 'Click to Add Text' : 'Add Text'}
                    </button>
                )}
                <button
                    onClick={() => dispatch(undo())}
                    style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Back
                </button>
                <button
                    onClick={() => dispatch(redo())}
                    style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Next
                </button>
            </div>
            <canvas ref={blurCanvasRef} />
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleCanvasClick}
            />
            {/* Render all textboxes as overlays, always visible, only interactive in text mode */}
            {overlays.map((action, idx) => (
                action.type === 'addText' && (
                    activeMode === 'addText' ? (
                        <Rnd
                            key={idx}
                            size={{ width: action.width, height: action.height }}
                            position={{ x: action.x, y: action.y }}
                            enableResizing={editingIndex !== idx}
                            disableDragging={false}
                            onDragStop={(e, d) => handleRndDragStop(e, d, idx)}
                            onResizeStop={(e, direction, ref, delta, position) => handleRndResizeStop(e, direction, ref, delta, position, idx)}
                            bounds="parent"
                            style={{
                                zIndex: 10,
                                background: 'rgba(255,255,255,0.8)',
                                border: '1px solid #888',
                                display: 'flex',
                                alignItems: 'center',
                                pointerEvents: 'auto',
                            }}
                        >
                            {editingIndex === idx ? (
                                <div style={{ width: '100%', position: 'relative' }}>
                                    <textarea
                                        style={{
                                            width: '100%',
                                            minHeight: '50px',
                                            border: 'none',
                                            background: 'transparent',
                                            resize: 'none',
                                            outline: 'none',
                                            fontSize: 16,
                                            fontFamily: 'Arial',
                                            padding: '4px 40px 4px 4px',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap'
                                        }}
                                        value={textBox.text}
                                        autoFocus
                                        onChange={e => handleTextareaChange(e, idx)}
                                        onKeyDown={e => handleTextBoxKeyDown(e, idx)}
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                    <button
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            zIndex: 11,
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#28a745',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => handleSaveTextBox(idx)}
                                        title="Save changes"
                                    >
                                        ✓
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span style={{
                                        padding: '4px 40px 4px 4px',
                                        width: '100%',
                                        height: '100%',
                                        wordBreak: 'break-word',
                                        fontSize: 16,
                                        fontFamily: 'Arial',
                                        display: 'block',
                                        minHeight: '50px',
                                        whiteSpace: 'pre-wrap'
                                    }}>{action.text}</span>
                                    <button
                                        style={{ position: 'absolute', top: 4, right: 4, zIndex: 11, background: 'transparent', border: 'none', cursor: 'pointer', color: '#c00', fontWeight: 'bold' }}
                                        onClick={() => handleDeleteTextBox(idx)}
                                        title="Delete textbox"
                                    >
                                        🗑️
                                    </button>
                                    <button
                                        style={{ position: 'absolute', top: 4, right: 34, zIndex: 11, background: 'transparent', border: 'none', cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}
                                        onClick={() => handleEditTextBox(idx)}
                                        title="Edit textbox"
                                    >
                                        ✏️
                                    </button>
                                </>
                            )}
                        </Rnd>
                    ) : (
                        <span
                            key={idx}
                            style={{
                                position: 'absolute',
                                top: action.y,
                                left: action.x,
                                width: action.width,
                                height: action.height,
                                zIndex: 10,
                                fontSize: 16,
                                fontFamily: 'Arial',
                                background: 'transparent',
                                color: '#222',
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                wordBreak: 'break-word',
                            }}
                        >
                            {action.text}
                        </span>
                    )
                )
            ))}
            {/* New textbox overlay */}
            {showTextBox && editingIndex === null && (
                <Rnd
                    size={{ width: textBox.width, height: textBox.height }}
                    position={{ x: textBox.x, y: textBox.y }}
                    enableResizing={false}
                    disableDragging={activeMode !== 'addText'}
                    onDragStop={(e, d) => setTextBox({ ...textBox, x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) => setTextBox({
                        ...textBox,
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        x: position.x,
                        y: position.y
                    })}
                    bounds="parent"
                    style={{
                        zIndex: 10,
                        background: 'rgba(255,255,255,0.8)',
                        border: '1px solid #888',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: activeMode === 'addText' ? 'auto' : 'none',
                    }}
                >
                    <div style={{ width: '100%', position: 'relative' }}>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '50px',
                                border: 'none',
                                background: 'transparent',
                                resize: 'none',
                                outline: 'none',
                                fontSize: 16,
                                fontFamily: 'Arial',
                                padding: '4px 40px 4px 4px',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                            }}
                            value={textBox.text}
                            autoFocus
                            onChange={e => handleTextareaChange(e, null)}
                            onKeyDown={e => handleTextBoxKeyDown(e, null)}
                            onMouseDown={e => e.stopPropagation()}
                        />
                        <button
                            style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                zIndex: 11,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#28a745',
                                fontWeight: 'bold'
                            }}
                            onClick={handleTextBoxBlur}
                            title="Save textbox"
                        >
                            ✓
                        </button>
                    </div>
                </Rnd>
            )}
        </>
    );
};

export default PdfCanvasOverlay; 