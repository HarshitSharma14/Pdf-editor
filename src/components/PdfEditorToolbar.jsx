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
    useTheme,
    Paper
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import MouseIcon from '@mui/icons-material/Mouse';

const ResponsivePdfEditorToolbar = ({ setActiveMode, activeMode }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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
        // Mobile layout: Compact horizontal toggle buttons
        return (
            <Box sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 'medium' }}>
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
                            py: 1,
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
                                gap: 0.5,
                                minHeight: '60px'
                            }}
                        >
                            {React.cloneElement(tool.icon, { sx: { fontSize: 28 } })}
                            <Typography variant="caption" sx={{ fontSize: '10px' }}>
                                {tool.label}
                            </Typography>
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
        );
    }

    if (isTablet) {
        // Tablet layout: Compact horizontal cards
        return (
            <Box sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center" mb={2}>
                    <MouseIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                    <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 'medium' }}>
                        Editor Tools
                    </Typography>
                </Box>

                <Box
                    display="grid"
                    gridTemplateColumns="repeat(4, 1fr)"
                    gap={1.5}
                    sx={{ width: '100%' }}
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
                                <Paper
                                    onClick={() => setActiveMode(tool.value)}
                                    elevation={isActive ? 2 : 0}
                                    sx={{
                                        width: '100%',
                                        flex: 1,
                                        boxSizing: 'border-box',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        p: 1.5,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: isActive ? `2px solid ${tool.color}` : '2px solid transparent',
                                        backgroundColor: isActive ? tool.bgColor : 'rgba(0, 0, 0, 0.02)',
                                        transform: isActive ? 'translateY(-1px)' : 'none',
                                        '&:hover': {
                                            backgroundColor: tool.bgColor,
                                            transform: 'translateY(-1px)',
                                            boxShadow: `0 4px 12px ${tool.color}20`,
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            backgroundColor: isActive ? tool.color : 'rgba(0, 0, 0, 0.06)',
                                            color: isActive ? 'white' : tool.color,
                                            mb: 1,
                                            transition: 'all 0.2s ease-in-out',
                                        }}
                                    >
                                        {React.cloneElement(tool.icon, {
                                            sx: { fontSize: 28 }
                                        })}
                                    </Box>

                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: isActive ? 'bold' : 'medium',
                                            color: isActive ? tool.color : 'text.primary',
                                            fontSize: '1.2rem',
                                            lineHeight: 1
                                        }}
                                    >
                                        {tool.label}
                                    </Typography>
                                </Paper>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Box>
        );
    }

    // Desktop layout: Horizontal modern buttons
    return (
        <Box sx={{ width: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
                <MouseIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'medium' }}>
                    Editor Tools
                </Typography>
            </Box>

            <Box
                display="flex"
                gap={2}
                sx={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 2,
                    p: 1
                }}
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
                            <Paper
                                onClick={() => setActiveMode(tool.value)}
                                elevation={isActive ? 3 : 0}
                                sx={{
                                    width: '100%',
                                    flex: 1,
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    px: 2,
                                    py: 1.5,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    border: isActive
                                        ? `2px solid ${tool.color}`
                                        : '2px solid transparent',
                                    backgroundColor: isActive
                                        ? tool.bgColor
                                        : 'white',
                                    transform: isActive ? 'translateY(-2px)' : 'none',
                                    '&:hover': {
                                        backgroundColor: tool.bgColor,
                                        transform: 'translateY(-2px)',
                                        boxShadow: `0 4px 12px ${tool.color}20`,
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        backgroundColor: isActive ? tool.color : 'rgba(0, 0, 0, 0.06)',
                                        color: isActive ? 'white' : tool.color,
                                        transition: 'all 0.2s ease-in-out',
                                    }}
                                >
                                    {React.cloneElement(tool.icon, {
                                        sx: { fontSize: 28 }
                                    })}
                                </Box>

                                <Box>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: isActive ? 'bold' : 'medium',
                                            color: isActive ? tool.color : 'text.primary',
                                            fontSize: '1.2rem',
                                            lineHeight: 1
                                        }}
                                    >
                                        {tool.label}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            opacity: isActive ? 0.8 : 0.6,
                                            lineHeight: 1,
                                            fontSize: '1.05rem'
                                        }}
                                    >
                                        {tool.description.split(' ').slice(0, 2).join(' ')}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Tooltip>
                    );
                })}
            </Box>

            {/* Active mode indicator - compact version */}
            <Box
                mt={2}
                p={1.5}
                sx={{
                    backgroundColor: tools.find(t => t.value === activeMode)?.bgColor,
                    borderRadius: 1,
                    border: `1px solid ${tools.find(t => t.value === activeMode)?.color}20`,
                    textAlign: 'center'
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 'medium', color: tools.find(t => t.value === activeMode)?.color }}>
                        {tools.find(t => t.value === activeMode)?.label} Mode Active
                    </Box>
                    {' • '}
                    {activeMode === 'view' && 'Click and drag to navigate'}
                    {activeMode === 'blur' && 'Drag to select blur areas'}
                    {activeMode === 'erase' && 'Drag to select erase areas'}
                    {activeMode === 'addText' && 'Click "Add Text" then position'}
                </Typography>
            </Box>
        </Box>
    );
};

export default ResponsivePdfEditorToolbar;