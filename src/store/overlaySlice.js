import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    overlays: {}, // { [pageNumber]: [ { type, x%, y%, width%, height%, text, ... } ] }
    history: [],
    future: [],
    pdfDimensions: {}, // Store PDF dimensions for coordinate conversion
};

// Helper functions for coordinate conversion
const pixelsToPercentage = (pixelValue, dimension) => {
    return dimension > 0 ? pixelValue / dimension : 0;
};

const percentageToPixels = (percentageValue, dimension) => {
    return percentageValue * dimension;
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
            state.pdfDimensions[pageNumber] = {
                width: dimensions.width,
                height: dimensions.height,
                originalWidth: dimensions.originalWidth,
                originalHeight: dimensions.originalHeight,
                scale: dimensions.scale
            };
        },

        addOverlay(state, action) {
            const { pageNumber, overlay, pdfDimensions } = action.payload;
            if (!state.overlays[pageNumber]) state.overlays[pageNumber] = [];

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

            // Add default text properties if it's a text overlay
            if (overlay.type === 'addText') {
                percentageOverlay.fontSize = overlay.fontSize || 16;
                percentageOverlay.fontFamily = overlay.fontFamily || 'Arial';
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
                    percentageOverlay.fontFamily = overlay.fontFamily || 'Arial';
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

// Selectors for getting overlays in pixel coordinates
export const getOverlaysInPixels = (state, pageNumber) => {
    const overlays = state.overlay.overlays[pageNumber] || [];
    const pdfDimensions = state.overlay.pdfDimensions[pageNumber];

    if (!pdfDimensions) return overlays;

    return overlays.map(overlay => ({
        ...overlay,
        x: percentageToPixels(overlay.x, pdfDimensions.width),
        y: percentageToPixels(overlay.y, pdfDimensions.height),
        width: percentageToPixels(overlay.width, pdfDimensions.width),
        height: percentageToPixels(overlay.height, pdfDimensions.height),
        fontSize: overlay.fontSizePercentage
            ? percentageToPixels(overlay.fontSizePercentage, pdfDimensions.height)
            : overlay.fontSize || 16,
    }));
};

// Selector for getting overlays for PDF export (in original PDF coordinates)
export const getOverlaysForExport = (state, pageNumber) => {
    const overlays = state.overlay.overlays[pageNumber] || [];
    const pdfDimensions = state.overlay.pdfDimensions[pageNumber];

    if (!pdfDimensions) return overlays;

    return overlays.map(overlay => ({
        ...overlay,
        x: percentageToPixels(overlay.x, pdfDimensions.originalWidth),
        y: percentageToPixels(overlay.y, pdfDimensions.originalHeight),
        width: percentageToPixels(overlay.width, pdfDimensions.originalWidth),
        height: percentageToPixels(overlay.height, pdfDimensions.originalHeight),
        fontSize: overlay.fontSizePercentage
            ? percentageToPixels(overlay.fontSizePercentage, pdfDimensions.originalHeight)
            : overlay.fontSize || 16,
    }));
};

// Selector for getting all overlays for export across all pages
export const selectAllOverlaysForExport = (state) => {
    const allOverlays = {};
    Object.keys(state.overlay.overlays).forEach(pageNumber => {
        const pageOverlays = state.overlay.overlays[pageNumber] || [];
        const pdfDimensions = state.overlay.pdfDimensions[pageNumber];

        if (pdfDimensions) {
            allOverlays[pageNumber] = pageOverlays.map(overlay => ({
                ...overlay,
                x: percentageToPixels(overlay.x, pdfDimensions.originalWidth),
                y: percentageToPixels(overlay.y, pdfDimensions.originalHeight),
                width: percentageToPixels(overlay.width, pdfDimensions.originalWidth),
                height: percentageToPixels(overlay.height, pdfDimensions.originalHeight),
                fontSize: overlay.fontSizePercentage
                    ? percentageToPixels(overlay.fontSizePercentage, pdfDimensions.originalHeight)
                    : overlay.fontSize || 16,
                text: overlay.text || '', // Ensure text is included
                type: overlay.type, // Ensure type is included
                fontFamily: overlay.fontFamily || 'Roboto',
                fontWeight: overlay.fontWeight || 'Regular',
                fontStyle: overlay.fontStyle || 'normal'
            }));
        }
    });
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