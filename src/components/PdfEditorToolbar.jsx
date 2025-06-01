import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';

const PdfEditorToolbar = ({ onEditAction, setActiveMode, activeMode }) => {
    const handleToolClick = (tool) => {
        // If the tool is already active, deactivate it
        if (activeMode === tool) {
            setActiveMode('view');
        } else {
            setActiveMode(tool);
        }
    };

    return (
        <Box my={2} display="flex" gap={2} alignItems="center">
            <Tooltip title="View Mode">
                <IconButton
                    color={activeMode === 'view' ? 'secondary' : 'primary'}
                    onClick={() => setActiveMode('view')}
                >
                    <VisibilityIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Blur">
                <IconButton
                    color={activeMode === 'blur' ? 'secondary' : 'primary'}
                    onClick={() => handleToolClick('blur')}
                >
                    <BlurOnIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Erase">
                <IconButton
                    color={activeMode === 'erase' ? 'secondary' : 'primary'}
                    onClick={() => handleToolClick('erase')}
                >
                    <DeleteIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Add Text">
                <IconButton
                    color={activeMode === 'addText' ? 'secondary' : 'primary'}
                    onClick={() => handleToolClick('addText')}
                >
                    <TextFieldsIcon />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default PdfEditorToolbar; 