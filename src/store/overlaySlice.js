import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    overlays: {}, // { [pageNumber]: [ { type, x%, y%, width%, height%, text, ... } ] }
    history: [],
    future: [],
    pdfDimensions: {}, // Store PDF dimensions for coordinate conversion
};

// Helper functions for coordinate conversion with precision
const pixelsToPercentage = (pixelValue, dimension) => {
    return dimension > 0 ? (pixelValue / dimension) : 0;
};

const percentageToPixels = (percentageValue, dimension) => {
    return percentageValue * dimension;
};

// Enhanced coordinate conversion for export (to original PDF coordinates)
const percentageToOriginalPdfPixels = (percentageValue, originalDimension) => {
    return percentageValue * originalDimension;
};

const overlaySlice = createSlice({
    name: 'overlay',
    initialState,
    reducers: {
        setOverlays(state, action) {
            state.overlays = action.payload;
        },

        // Store PDF dimensions for coordinate conversion
        setPdfDimensions(state, action) {
            const { pageNumber, dimensions } = action.payload;
            if (!state.pdfDimensions[pageNumber]) {
                state.pdfDimensions[pageNumber] = {};
            }

            // Store both display and original dimensions
            state.pdfDimensions[pageNumber] = {
                // Current display dimensions
                width: dimensions.width,
                height: dimensions.height,
                // Original PDF dimensions
                originalWidth: dimensions.originalWidth,
                originalHeight: dimensions.originalHeight,
                // Scale factor
                scale: dimensions.scale
            };

            console.log(`Stored PDF dimensions for page ${pageNumber}:`, state.pdfDimensions[pageNumber]);
        },

        addOverlay(state, action) {
            const { pageNumber, overlay, pdfDimensions } = action.payload;
            if (!state.overlays[pageNumber]) state.overlays[pageNumber] = [];

            // Save current state to history
            state.history.push(JSON.parse(JSON.stringify(state.overlays)));
            state.future = [];

            console.log('Adding overlay with dimensions:', pdfDimensions);
            console.log('Overlay pixel coords:', overlay);

            // Convert pixel coordinates to percentages based on DISPLAY dimensions
            const percentageOverlay = {
                ...overlay,
                x: pixelsToPercentage(overlay.x, pdfDimensions.width),
                y: pixelsToPercentage(overlay.y, pdfDimensions.height),
                width: pixelsToPercentage(overlay.width, pdfDimensions.width),
                height: pixelsToPercentage(overlay.height, pdfDimensions.height),
            };

            console.log('Converted to percentage:', percentageOverlay);

            // Add default text properties if it's a text overlay
            if (overlay.type === 'addText') {
                percentageOverlay.fontSize = overlay.fontSize || 16;
                percentageOverlay.fontFamily = overlay.fontFamily || 'Helvetica';
                percentageOverlay.fontWeight = overlay.fontWeight || 'normal';
                percentageOverlay.fontStyle = overlay.fontStyle || 'normal';
                // Store font size as percentage of PDF height for responsiveness
                percentageOverlay.fontSizePercentage = pixelsToPercentage(
                    percentageOverlay.fontSize,
                    pdfDimensions.height
                );
            }

            state.overlays[pageNumber].push(percentageOverlay);
        },

        updateOverlay(state, action) {
            const { pageNumber, index, overlay, pdfDimensions } = action.payload;
            if (state.overlays[pageNumber] && state.overlays[pageNumber][index]) {
                // Save current state to history
                state.history.push(JSON.parse(JSON.stringify(state.overlays)));
                state.future = [];

                // Convert pixel coordinates to percentages
                const percentageOverlay = {
                    ...overlay,
                    x: pixelsToPercentage(overlay.x, pdfDimensions.width),
                    y: pixelsToPercentage(overlay.y, pdfDimensions.height),
                    width: pixelsToPercentage(overlay.width, pdfDimensions.width),
                    height: pixelsToPercentage(overlay.height, pdfDimensions.height),
                };

                // Handle text properties
                if (overlay.type === 'addText') {
                    percentageOverlay.fontSize = overlay.fontSize || 16;
                    percentageOverlay.fontFamily = overlay.fontFamily || 'Helvetica';
                    percentageOverlay.fontWeight = overlay.fontWeight || 'normal';
                    percentageOverlay.fontStyle = overlay.fontStyle || 'normal';
                    percentageOverlay.fontSizePercentage = pixelsToPercentage(
                        percentageOverlay.fontSize,
                        pdfDimensions.height
                    );
                }

                state.overlays[pageNumber][index] = percentageOverlay;
            }
        },

        // Update overlay with percentage coordinates (for direct percentage updates)
        updateOverlayPercentage(state, action) {
            const { pageNumber, index, overlay } = action.payload;
            if (state.overlays[pageNumber] && state.overlays[pageNumber][index]) {
                state.history.push(JSON.parse(JSON.stringify(state.overlays)));
                state.future = [];
                state.overlays[pageNumber][index] = { ...state.overlays[pageNumber][index], ...overlay };
            }
        },

        removeOverlay(state, action) {
            const { pageNumber, index } = action.payload;
            if (state.overlays[pageNumber]) {
                state.history.push(JSON.parse(JSON.stringify(state.overlays)));
                state.future = [];
                state.overlays[pageNumber].splice(index, 1);
            }
        },

        clearOverlays(state) {
            state.history.push(JSON.parse(JSON.stringify(state.overlays)));
            state.future = [];
            state.overlays = {};
        },

        undo(state) {
            if (state.history.length > 0) {
                state.future.push(JSON.parse(JSON.stringify(state.overlays)));
                state.overlays = state.history.pop();
            }
        },

        redo(state) {
            if (state.future.length > 0) {
                state.history.push(JSON.parse(JSON.stringify(state.overlays)));
                state.overlays = state.future.pop();
            }
        },
    },
});

// Selectors for getting overlays in pixel coordinates (for display)
export const getOverlaysInPixels = (state, pageNumber) => {
    const overlays = state.overlay.overlays[pageNumber] || [];
    const pdfDimensions = state.overlay.pdfDimensions[pageNumber];

    if (!pdfDimensions) return overlays;

    const pixelOverlays = overlays.map(overlay => {
        const pixelOverlay = {
            ...overlay,
            // Convert from percentage back to display pixels
            x: percentageToPixels(overlay.x, pdfDimensions.width),
            y: percentageToPixels(overlay.y, pdfDimensions.height),
            width: percentageToPixels(overlay.width, pdfDimensions.width),
            height: percentageToPixels(overlay.height, pdfDimensions.height),
            fontSize: overlay.fontSizePercentage
                ? percentageToPixels(overlay.fontSizePercentage, pdfDimensions.height)
                : overlay.fontSize || 16,
        };

        console.log(`Display overlay (page ${pageNumber}):`, pixelOverlay);
        return pixelOverlay;
    });

    return pixelOverlays;
};

// Selector for getting overlays for PDF export (in original PDF coordinates)
export const getOverlaysForExport = (state, pageNumber) => {
    const overlays = state.overlay.overlays[pageNumber] || [];
    const pdfDimensions = state.overlay.pdfDimensions[pageNumber];

    if (!pdfDimensions) return overlays;

    const exportOverlays = overlays.map(overlay => {
        const exportOverlay = {
            ...overlay,
            // Convert from percentage to ORIGINAL PDF coordinates
            x: percentageToOriginalPdfPixels(overlay.x, pdfDimensions.originalWidth),
            y: percentageToOriginalPdfPixels(overlay.y, pdfDimensions.originalHeight),
            width: percentageToOriginalPdfPixels(overlay.width, pdfDimensions.originalWidth),
            height: percentageToOriginalPdfPixels(overlay.height, pdfDimensions.originalHeight),
            fontSize: overlay.fontSizePercentage
                ? percentageToOriginalPdfPixels(overlay.fontSizePercentage, pdfDimensions.originalHeight)
                : overlay.fontSize || 16,
        };

        console.log(`Export overlay (page ${pageNumber}):`, exportOverlay);
        return exportOverlay;
    });

    return exportOverlays;
};

// Selector for getting all overlays for export across all pages
export const selectAllOverlaysForExport = (state) => {
    const allOverlays = {};
    Object.keys(state.overlay.overlays).forEach(pageNumber => {
        const pageOverlays = state.overlay.overlays[pageNumber] || [];
        const pdfDimensions = state.overlay.pdfDimensions[pageNumber];

        if (pdfDimensions && pageOverlays.length > 0) {
            allOverlays[pageNumber] = pageOverlays.map(overlay => {
                const exportOverlay = {
                    ...overlay,
                    // Convert from percentage to ORIGINAL PDF coordinates
                    x: percentageToOriginalPdfPixels(overlay.x, pdfDimensions.originalWidth),
                    y: percentageToOriginalPdfPixels(overlay.y, pdfDimensions.originalHeight),
                    width: percentageToOriginalPdfPixels(overlay.width, pdfDimensions.originalWidth),
                    height: percentageToOriginalPdfPixels(overlay.height, pdfDimensions.originalHeight),
                    fontSize: overlay.fontSizePercentage
                        ? percentageToOriginalPdfPixels(overlay.fontSizePercentage, pdfDimensions.originalHeight)
                        : overlay.fontSize || 16,
                    text: overlay.text || '', // Ensure text is included
                    type: overlay.type, // Ensure type is included
                    fontFamily: overlay.fontFamily || 'Helvetica',
                    fontWeight: overlay.fontWeight || 'Regular',
                    fontStyle: overlay.fontStyle || 'normal'
                };

                console.log(`Export overlay for page ${pageNumber}:`, exportOverlay);
                return exportOverlay;
            });
        }
    });

    console.log('All export overlays:', allOverlays);
    return allOverlays;
};

export const {
    setOverlays,
    addOverlay,
    updateOverlay,
    updateOverlayPercentage,
    removeOverlay,
    clearOverlays,
    undo,
    redo,
    setPdfDimensions
} = overlaySlice.actions;

export default overlaySlice.reducer;