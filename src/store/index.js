import { configureStore } from '@reduxjs/toolkit';
import overlayReducer from './overlaySlice';

const store = configureStore({
    reducer: {
        overlay: overlayReducer,
    },
});

export default store; 