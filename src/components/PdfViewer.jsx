import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Button, Typography } from '@mui/material';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const ResponsivePdfViewer = ({ file, pageNumber, numPages, onDocumentLoadSuccess, onPageChange, onPdfSizeChange }) => {
  const [containerWidth, setContainerWidth] = useState(window.innerWidth - 100); // Better initial value
  const [pdfDimensions, setPdfDimensions] = useState({ width: 800, height: 1000 });
  const [pdfDoc, setPdfDoc] = useState(null);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.pdf-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const availableWidth = containerRect.width - 40; // 20px padding on each side
        setContainerWidth(availableWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive PDF width - Much larger sizes for better readability
  const getResponsivePdfWidth = () => {
    const screenWidth = window.innerWidth;

    if (screenWidth < 768) {
      // Mobile: Use most of the screen width, minimum 350px
      return Math.max(screenWidth * 0.9, 350);
    } else if (screenWidth < 1024) {
      // Tablet: Use a good portion of available width, minimum 600px
      return Math.max(Math.min(containerWidth * 0.85, 800), 600);
    } else {
      // Desktop: Larger size for better readability, minimum 700px
      return Math.max(Math.min(containerWidth * 0.8, 1000), 700);
    }
  };

  const responsiveWidth = getResponsivePdfWidth();

  // Handle document load and get dimensions
  const handleDocumentLoadSuccess = async (pdf) => {
    setPdfDoc(pdf);
    onDocumentLoadSuccess(pdf);

    // Get first page to determine dimensions
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const originalWidth = viewport.width;
      const originalHeight = viewport.height;

      const aspectRatio = originalHeight / originalWidth;
      const renderHeight = responsiveWidth * aspectRatio;

      const newDimensions = {
        width: responsiveWidth,
        height: renderHeight,
        originalWidth: originalWidth,
        originalHeight: originalHeight,
        scale: responsiveWidth / originalWidth
      };

      setPdfDimensions(newDimensions);

      // Notify parent component of PDF size changes
      if (onPdfSizeChange) {
        onPdfSizeChange(newDimensions);
      }
    } catch (error) {
      console.warn('Could not get PDF dimensions:', error);
      // Fallback dimensions
      const fallbackDimensions = {
        width: responsiveWidth,
        height: responsiveWidth * 1.414, // A4 aspect ratio
        originalWidth: 612,
        originalHeight: 792,
        scale: responsiveWidth / 612
      };
      setPdfDimensions(fallbackDimensions);
      if (onPdfSizeChange) {
        onPdfSizeChange(fallbackDimensions);
      }
    }
  };

  // Update dimensions when responsive width changes
  useEffect(() => {
    if (pdfDoc && pdfDimensions.originalWidth) {
      const aspectRatio = pdfDimensions.originalHeight / pdfDimensions.originalWidth;
      const renderHeight = responsiveWidth * aspectRatio;

      const newDimensions = {
        width: responsiveWidth,
        height: renderHeight,
        originalWidth: pdfDimensions.originalWidth,
        originalHeight: pdfDimensions.originalHeight,
        scale: responsiveWidth / pdfDimensions.originalWidth
      };

      setPdfDimensions(newDimensions);

      if (onPdfSizeChange) {
        onPdfSizeChange(newDimensions);
      }
    }
  }, [responsiveWidth, pdfDoc, onPdfSizeChange]);

  return (
    <Box
      className="pdf-container"
      my={2}
      display="flex"
      flexDirection="column"
      alignItems="center"
      sx={{
        width: '100%',
        maxWidth: '100vw',
        overflow: 'visible' // Changed from hidden to allow proper sizing
      }}
    >
      <Box
        sx={{
          border: '1px solid #ccc',
          borderRadius: 1,
          overflow: 'hidden',
          maxWidth: '100%',
          width: 'fit-content',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          minWidth: { xs: '350px', sm: '600px', md: '700px' }, // Ensure minimum sizes
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
            height: 'auto',
            display: 'block'
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
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={(error) => console.error('Error loading PDF:', error)}
        >
          <Page
            pageNumber={pageNumber}
            width={responsiveWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </Box>

      {/* Responsive Navigation */}
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        mt={2}
        flexWrap="wrap"
        gap={1}
      >
        <Button
          variant="outlined"
          disabled={pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
          size="small"
        >
          Previous
        </Button>
        <Typography
          variant="body2"
          mx={2}
          sx={{
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            textAlign: 'center',
            minWidth: 'fit-content'
          }}
        >
          Page {pageNumber} of {numPages}
        </Typography>
        <Button
          variant="outlined"
          disabled={pageNumber >= numPages}
          onClick={() => onPageChange(pageNumber + 1)}
          size="small"
        >
          Next
        </Button>
      </Box>

      {/* Debug info (remove in production) */}
      <Typography variant="caption" color="textSecondary" mt={1}>
        PDF: {Math.round(pdfDimensions.width)}×{Math.round(pdfDimensions.height)}px
        (Scale: {(pdfDimensions.scale || 1).toFixed(2)})
      </Typography>
    </Box>
  );
};

export default ResponsivePdfViewer;