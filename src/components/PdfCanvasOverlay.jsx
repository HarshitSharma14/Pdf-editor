import React, { useRef, useEffect, useState } from 'react';

const PdfCanvasOverlay = ({ editActions, pageNumber, onEditAction, activeMode }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    // Set canvas size and position to match PDF page
    useEffect(() => {
        const updateCanvasSize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                // Find the PDF page's canvas
                const pdfPage = canvas.parentElement.querySelector('.react-pdf__Page canvas');
                if (pdfPage) {
                    const rect = pdfPage.getBoundingClientRect();
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    canvas.style.width = `${rect.width}px`;
                    canvas.style.height = `${rect.height}px`;
                    // Position overlay exactly over the PDF page
                    canvas.style.position = 'absolute';
                    canvas.style.top = `${pdfPage.offsetTop}px`;
                    canvas.style.left = `${pdfPage.offsetLeft}px`;
                }
            }
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // Draw existing actions
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        editActions.forEach(action => {
            if (action.pageNumber === pageNumber) {
                switch (action.type) {
                    case 'blur':
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.fillRect(action.x, action.y, action.width, action.height);
                        break;
                    case 'erase':
                        ctx.fillStyle = 'white';
                        ctx.fillRect(action.x, action.y, action.width, action.height);
                        break;
                    case 'addText':
                        ctx.font = '16px Arial';
                        ctx.fillStyle = 'black';
                        ctx.fillText(action.text, action.x, action.y);
                        break;
                    default:
                        break;
                }
            }
        });
    }, [editActions, pageNumber]);

    const getMousePosition = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e) => {
        if (!activeMode) return;
        setIsDrawing(true);
        const pos = getMousePosition(e);
        setStartPos(pos);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !activeMode) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const currentPos = getMousePosition(e);
        // Clear the canvas and redraw all existing actions
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        editActions.forEach(action => {
            if (action.pageNumber === pageNumber) {
                switch (action.type) {
                    case 'blur':
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.fillRect(action.x, action.y, action.width, action.height);
                        break;
                    case 'erase':
                        ctx.fillStyle = 'white';
                        ctx.fillRect(action.x, action.y, action.width, action.height);
                        break;
                    case 'addText':
                        ctx.font = '16px Arial';
                        ctx.fillStyle = 'black';
                        ctx.fillText(action.text, action.x, action.y);
                        break;
                    default:
                        break;
                }
            }
        });
        // Draw the current selection
        ctx.fillStyle = activeMode === 'blur' ? 'rgba(0, 0, 0, 0.5)' : 'white';
        ctx.fillRect(
            startPos.x,
            startPos.y,
            currentPos.x - startPos.x,
            currentPos.y - startPos.y
        );
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || !activeMode) return;
        setIsDrawing(false);
        const endPos = getMousePosition(e);
        onEditAction({
            type: activeMode,
            x: startPos.x,
            y: startPos.y,
            width: endPos.x - startPos.x,
            height: endPos.y - startPos.y,
            pageNumber
        });
    };

    return (
        <canvas
            ref={canvasRef}
            style={{
                pointerEvents: activeMode ? 'auto' : 'none',
                cursor: activeMode ? 'crosshair' : 'default',
                zIndex: 1
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        />
    );
};

export default PdfCanvasOverlay; 