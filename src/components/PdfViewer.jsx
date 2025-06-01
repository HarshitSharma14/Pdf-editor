import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Button, Typography } from '@mui/material';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfViewer = ({ file, pageNumber, numPages, onDocumentLoadSuccess, onPageChange }) => {
  return (
    <Box my={2} display="flex" flexDirection="column" alignItems="center">
      <Box
        sx={{
          border: '1px solid #ccc',
          borderRadius: 1,
          overflow: 'hidden',
          maxWidth: '100%',
          '& .react-pdf__Document': {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          },
          '& .react-pdf__Page': {
            maxWidth: '100%',
            height: 'auto'
          },
          '& .react-pdf__Page__canvas': {
            maxWidth: '100%',
            height: 'auto'
          },
          // Hide text layer to prevent text appearing separately
          '& .react-pdf__Page__textContent': {
            display: 'none'
          },
          '& .react-pdf__Page__annotations': {
            display: 'none'
          }
        }}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error('Error loading PDF:', error)}
        >
          <Page
            pageNumber={pageNumber}
            width={800} // Set a fixed width or make it responsive
            renderTextLayer={false} // Disable text layer
            renderAnnotationLayer={false} // Disable annotation layer
          />
        </Document>
      </Box>

      <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
        <Button
          variant="outlined"
          disabled={pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
        >
          Previous
        </Button>
        <Typography variant="body1" mx={2}>
          Page {pageNumber} of {numPages}
        </Typography>
        <Button
          variant="outlined"
          disabled={pageNumber >= numPages}
          onClick={() => onPageChange(pageNumber + 1)}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default PdfViewer;