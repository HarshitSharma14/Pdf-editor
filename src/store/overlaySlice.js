import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    overlays: {}, // { [pageNumber]: [ { type, x, y, width, height, text, ... } ] }
    history: [],
    future: [],
};

const overlaySlice = createSlice({
    name: 'overlay',
    initialState,
    reducers: {
        setOverlays(state, action) {
            state.overlays = action.payload;
        },
        addOverlay(state, action) {
            const { pageNumber, overlay } = action.payload;
            if (!state.overlays[pageNumber]) state.overlays[pageNumber] = [];
            state.history.push(JSON.parse(JSON.stringify(state.overlays)));
            state.future = [];
            state.overlays[pageNumber].push(overlay);
        },
        updateOverlay(state, action) {
            const { pageNumber, index, overlay } = action.payload;
            if (state.overlays[pageNumber] && state.overlays[pageNumber][index]) {
                state.history.push(JSON.parse(JSON.stringify(state.overlays)));
                state.future = [];
                state.overlays[pageNumber][index] = overlay;
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

export const { setOverlays, addOverlay, updateOverlay, removeOverlay, clearOverlays, undo, redo } = overlaySlice.actions;
export default overlaySlice.reducer; 