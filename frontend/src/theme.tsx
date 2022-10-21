import { createTheme, ThemeOptions } from '@mui/material/styles';
import { red } from '@mui/material/colors';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

const themeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
  },
}

// A custom theme for this app
const themeLight = createTheme(themeOptions);
const themeDark = createTheme({
  ...themeOptions,
  palette: {
    ...themeOptions.palette,
    mode: 'dark',
  }
});

export const ThemeProvider = (props: { children?: React.ReactNode; }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(() => {
    if (prefersDarkMode) {
      return themeDark;
    }

    return themeLight;
  }, [prefersDarkMode]);

  return (
    <MuiThemeProvider {...props} theme={theme} />
  );
};