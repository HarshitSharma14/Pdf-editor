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
        setTextBox({ x: pos.x, y: pos.y, width: 120, height: 30, text: '' });
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

    // Keyboard save for textarea
    const handleTextBoxKeyDown = (e, idx) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (editingIndex === null) {
                handleTextBoxBlur();
            } else {
                handleEditTextBoxBlur(idx);
            }
        }
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
            setTextBox(overlays[idx]);
            setShowTextBox(true);
        }
    };

    // Rnd drag/resize handlers
    const handleRndDragStop = (e, d, idx) => {
        dispatch(updateOverlay({
            pageNumber,
            index: idx,
            overlay: { ...overlays[idx], x: d.x, y: d.y }
        }));
    };
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
                            onDoubleClick={() => handleEditTextBox(idx)}
                        >
                            {editingIndex === idx && showTextBox ? (
                                <textarea
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                        background: 'transparent',
                                        resize: 'none',
                                        outline: 'none',
                                        fontSize: 16,
                                        fontFamily: 'Arial',
                                    }}
                                    value={textBox.text}
                                    autoFocus
                                    onChange={e => setTextBox({ ...textBox, text: e.target.value })}
                                    onBlur={() => handleEditTextBoxBlur(idx)}
                                    onKeyDown={e => handleTextBoxKeyDown(e, idx)}
                                    onMouseDown={e => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <span style={{ padding: 4, width: '100%', height: '100%', wordBreak: 'break-word', fontSize: 16, fontFamily: 'Arial' }}>{action.text}</span>
                                    <button
                                        style={{ position: 'absolute', top: 0, right: 0, zIndex: 11, background: 'transparent', border: 'none', cursor: 'pointer', color: '#c00', fontWeight: 'bold' }}
                                        onClick={() => handleDeleteTextBox(idx)}
                                        title="Delete textbox"
                                    >
                                        🗑️
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
                    enableResizing={activeMode === 'addText'}
                    disableDragging={activeMode !== 'addText'}
                    onDragStop={(e, d) => setTextBox({ ...textBox, x: d.x, y: d.y })}
                    onResizeStop={(e, direction, ref, delta, position) => setTextBox({ ...textBox, width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10), x: position.x, y: position.y })}
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
                    <textarea
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            resize: 'none',
                            outline: 'none',
                            fontSize: 16,
                            fontFamily: 'Arial',
                        }}
                        value={textBox.text}
                        autoFocus
                        onChange={e => setTextBox({ ...textBox, text: e.target.value })}
                        onBlur={handleTextBoxBlur}
                        onKeyDown={e => handleTextBoxKeyDown(e, null)}
                        onMouseDown={e => e.stopPropagation()}
                    />
                </Rnd>
            )}
        </>
    );
};

export default PdfCanvasOverlay; 