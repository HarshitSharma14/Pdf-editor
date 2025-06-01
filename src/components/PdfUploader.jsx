import React from 'react';
import { Button, Box } from '@mui/material';

const PdfUploader = ({ onFileUpload }) => {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            onFileUpload(file);
        } else {
            alert('Please upload a PDF file.');
        }
    };

    return (
        <Box my={2}>
            <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
            />
            <label htmlFor="raised-button-file">
                <Button variant="contained" component="span">
                    Upload PDF
                </Button>
            </label>
        </Box>
    );
};

export default PdfUploader; 