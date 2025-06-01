import React from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Chip,
    useMediaQuery,
    useTheme
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import MouseIcon from '@mui/icons-material/Mouse';

const ResponsivePdfEditorToolbar = ({ setActiveMode, activeMode }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const tools = [
        {
            value: 'view',
            icon: <VisibilityIcon />,
            label: 'View',
            description: 'Navigate and view PDF',
            color: '#2196F3',
            bgColor: 'rgba(33, 150, 243, 0.1)'
        },
        {
            value: 'blur',
            icon: <BlurOnIcon />,
            label: 'Blur',
            description: 'Blur sensitive areas',
            color: '#FF9800',
            bgColor: 'rgba(255, 152, 0, 0.1)'
        },
        {
            value: 'erase',
            icon: <DeleteIcon />,
            label: 'Erase',
            description: 'Remove content',
            color: '#F44336',
            bgColor: 'rgba(244, 67, 54, 0.1)'
        },
        {
            value: 'addText',
            icon: <TextFieldsIcon />,
            label: 'Text',
            description: 'Add custom text',
            color: '#4CAF50',
            bgColor: 'rgba(76, 175, 80, 0.1)'
        }
    ];

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setActiveMode(newMode);
        }
    };

    if (isMobile) {
        // Mobile layout: Compact toggle buttons
        return (
            <Box sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" color="textSecondary">
                        📝 Editor Tools
                    </Typography>
                    <Chip
                        label={tools.find(t => t.value === activeMode)?.label || 'Unknown'}
                        size="small"
                        sx={{
                            backgroundColor: tools.find(t => t.value === activeMode)?.bgColor,
                            color: tools.find(t => t.value === activeMode)?.color,
                            fontWeight: 'medium'
                        }}
                    />
                </Box>

                <ToggleButtonGroup
                    value={activeMode}
                    exclusive
                    onChange={handleModeChange}
                    size="small"
                    fullWidth
                    sx={{
                        '& .MuiToggleButton-root': {
                            border: '1px solid rgba(0, 0, 0, 0.12)',
                            borderRadius: '8px !important',
                            mx: 0.5,
                            '&.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'primary.dark',
                                }
                            }
                        }
                    }}
                >
                    {tools.map((tool) => (
                        <ToggleButton
                            key={tool.value}
                            value={tool.value}
                            sx={{
                                flexDirection: 'column',
                                py: 1,
                                gap: 0.5
                            }}
                        >
                            {tool.icon}
                            <Typography variant="caption">
                                {tool.label}
                            </Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
        );
    }

    // Desktop layout: Enhanced cards with descriptions
    return (
        <Box sx={{ width: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
                <MouseIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'medium' }}>
                    Editor Tools
                </Typography>
            </Box>

            <Box
                display="grid"
                gridTemplateColumns={{ xs: '1fr 1fr', md: 'repeat(4, 1fr)' }}
                gap={2}
            >
                {tools.map((tool) => {
                    const isActive = activeMode === tool.value;
                    return (
                        <Tooltip
                            key={tool.value}
                            title={tool.description}
                            arrow
                            placement="top"
                        >
                            <Box
                                onClick={() => setActiveMode(tool.value)}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    p: 2,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    border: isActive
                                        ? `2px solid ${tool.color}`
                                        : '2px solid transparent',
                                    backgroundColor: isActive
                                        ? tool.bgColor
                                        : 'rgba(0, 0, 0, 0.02)',
                                    boxShadow: isActive
                                        ? `0 4px 12px ${tool.color}25`
                                        : '0 2px 4px rgba(0, 0, 0, 0.05)',
                                    transform: isActive ? 'translateY(-2px)' : 'none',
                                    '&:hover': {
                                        backgroundColor: tool.bgColor,
                                        boxShadow: `0 4px 12px ${tool.color}20`,
                                        transform: 'translateY(-2px)',
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        backgroundColor: isActive ? tool.color : 'rgba(0, 0, 0, 0.06)',
                                        color: isActive ? 'white' : tool.color,
                                        mb: 1,
                                        transition: 'all 0.2s ease-in-out',
                                    }}
                                >
                                    {React.cloneElement(tool.icon, {
                                        sx: { fontSize: 24 }
                                    })}
                                </Box>

                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: isActive ? 'bold' : 'medium',
                                        color: isActive ? tool.color : 'text.primary',
                                        mb: 0.5
                                    }}
                                >
                                    {tool.label}
                                </Typography>

                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    textAlign="center"
                                    sx={{
                                        opacity: isActive ? 0.8 : 0.6,
                                        lineHeight: 1.2
                                    }}
                                >
                                    {tool.description}
                                </Typography>

                                {isActive && (
                                    <Box
                                        sx={{
                                            width: 20,
                                            height: 3,
                                            backgroundColor: tool.color,
                                            borderRadius: 1.5,
                                            mt: 1,
                                            animation: 'pulse 2s ease-in-out infinite'
                                        }}
                                    />
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>

            {/* Active mode indicator */}
            <Box
                mt={2}
                p={2}
                sx={{
                    backgroundColor: tools.find(t => t.value === activeMode)?.bgColor,
                    borderRadius: 1,
                    border: `1px solid ${tools.find(t => t.value === activeMode)?.color}20`,
                }}
            >
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    <Box component="span" sx={{ fontWeight: 'medium', color: tools.find(t => t.value === activeMode)?.color }}>
                        {tools.find(t => t.value === activeMode)?.label} Mode Active
                    </Box>
                    {' • '}
                    {activeMode === 'view' && 'Click and drag to navigate the PDF'}
                    {activeMode === 'blur' && 'Click and drag to select areas to blur'}
                    {activeMode === 'erase' && 'Click and drag to select areas to erase'}
                    {activeMode === 'addText' && 'Click "Add Text" button then click on PDF to add text'}
                </Typography>
            </Box>
        </Box>
    );
};

export default ResponsivePdfEditorToolbar;