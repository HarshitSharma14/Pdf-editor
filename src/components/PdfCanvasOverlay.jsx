import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addOverlay, updateOverlay, removeOverlay, undo, redo } from '../store/overlaySlice';
import { Rnd } from 'react-rnd';

const PdfCanvasOverlay = ({ pageNumber, activeMode, pdfFile }) => {
    const canvasRef = useRef(null);
    const dispatch = useDispatch();
    const overlays = useSelector(state => state.overlay.overlays[pageNumber] || []);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [showTextBox, setShowTextBox] = useState(false);
    const [textBox, setTextBox] = useState({ x: 0, y: 0, width: 120, height: 30, text: '' });
    const [addMode, setAddMode] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // Set canvas size and position to match the PDF page, using MutationObserver for robustness
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let observer;
        const updateCanvasSize = () => {
            const pdfPage = canvas.parentElement.querySelector('.react-pdf__Page canvas');
            if (pdfPage) {
                const rect = pdfPage.getBoundingClientRect();
                canvas.width = pdfPage.width;
                canvas.height = pdfPage.height;
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
                canvas.style.position = 'absolute';
                canvas.style.top = `${pdfPage.offsetTop}px`;
                canvas.style.left = `${pdfPage.offsetLeft}px`;
                canvas.style.pointerEvents = activeMode ? 'auto' : 'none';
                canvas.style.cursor = activeMode === 'addText' ? (addMode ? 'text' : 'pointer') : (activeMode ? 'crosshair' : 'default');
                canvas.style.zIndex = 1;
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
    }, [activeMode, pageNumber, pdfFile, addMode]);

    // Draw overlays except addText (handled as overlays)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        overlays.forEach(action => {
            if (action.type === 'addText') return;
            switch (action.type) {
                case 'blur':
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(action.x, action.y, action.width, action.height);
                    break;
                case 'erase':
                    ctx.fillStyle = 'white';
                    ctx.fillRect(action.x, action.y, action.width, action.height);
                    break;
                default:
                    break;
            }
        });
    }, [overlays]);

    // Add Text: Only allow adding after clicking Add Text button
    const handleCanvasClick = (e) => {
        if (!(activeMode === 'addText' && addMode)) return;
        const pos = getMousePosition(e);
        setTextBox({ x: pos.x, y: pos.y, width: 120, height: 50, text: '' });
        setShowTextBox(true);
        setAddMode(false);
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
    };

    // Add Text: Edit existing textbox
    const handleEditTextBoxBlur = (idx) => {
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
                handleEditTextBoxBlur(idx);
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
        setStartPos(pos);
    };
    const handleCanvasMouseMove = (e) => {
        if (!isDrawing || !activeMode || activeMode === 'addText') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const currentPos = getMousePosition(e);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        overlays.forEach(action => {
            if (action.type === 'addText') return;
            switch (action.type) {
                case 'blur':
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(action.x, action.y, action.width, action.height);
                    break;
                case 'erase':
                    ctx.fillStyle = 'white';
                    ctx.fillRect(action.x, action.y, action.width, action.height);
                    break;
                default:
                    break;
            }
        });
        ctx.fillStyle = activeMode === 'blur' ? 'rgba(0, 0, 0, 0.5)' : 'white';
        ctx.fillRect(
            startPos.x,
            startPos.y,
            currentPos.x - startPos.x,
            currentPos.y - startPos.y
        );
    };
    const handleMouseUp = (e) => {
        if (!isDrawing || !activeMode || activeMode === 'addText') return;
        setIsDrawing(false);
        const endPos = getMousePosition(e);
        dispatch(addOverlay({
            pageNumber,
            overlay: {
                type: activeMode,
                x: startPos.x,
                y: startPos.y,
                width: endPos.x - startPos.x,
                height: endPos.y - startPos.y,
            }
        }));
    };

    // Add Text: Button handler
    const handleAddTextButton = () => {
        setAddMode(true);
        setShowTextBox(false);
        setEditingIndex(null);
    };

    // Add Text: Edit existing textbox
    const handleEditTextBox = (idx) => {
        if (activeMode === 'addText') {
            setEditingIndex(idx);
            setTextBox({ ...overlays[idx], height: 50 });
            setShowTextBox(true);
        }
    };

    // Rnd drag handler (no resize)
    const handleRndDragStop = (e, d, idx) => {
        dispatch(updateOverlay({
            pageNumber,
            index: idx,
            overlay: { ...overlays[idx], x: d.x, y: d.y }
        }));
    };

    // Rnd resize handler
    const handleRndResizeStop = (e, direction, ref, delta, position, idx) => {
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
    };

    // Delete textbox
    const handleDeleteTextBox = (idx) => {
        dispatch(removeOverlay({ pageNumber, index: idx }));
    };

    return (
        <>
            {activeMode === 'addText' && (
                <>
                    <button
                        style={{ position: 'absolute', top: 10, left: 10, zIndex: 20 }}
                        onClick={handleAddTextButton}
                    >
                        Add Text
                    </button>
                    <button
                        style={{ position: 'absolute', top: 10, left: 100, zIndex: 20 }}
                        onClick={() => dispatch(undo())}
                    >
                        Back
                    </button>
                    <button
                        style={{ position: 'absolute', top: 10, left: 170, zIndex: 20 }}
                        onClick={() => dispatch(redo())}
                    >
                        Next
                    </button>
                </>
            )}
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
                            enableResizing={true}
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
                            {editingIndex === idx && showTextBox ? (
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
            {showTextBox && (
                <Rnd
                    size={{ width: textBox.width, height: textBox.height }}
                    position={{ x: textBox.x, y: textBox.y }}
                    enableResizing={true}
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