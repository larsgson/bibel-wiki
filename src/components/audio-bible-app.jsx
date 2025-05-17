import * as React from 'react';
import { styled, useTheme, createTheme, ThemeProvider } from '@mui/material/styles'
import LibraryView from './library-view'
import SettingsView from './settings-view'
import BibleView from './bible-view'
import HomeView from './home-view'
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home'
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MenuIcon from '@mui/icons-material/Menu'
import CheckIcon from '@mui/icons-material/Check'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import useMediaPlayer from '../hooks/useMediaPlayer'
import useBrowserData from '../hooks/useBrowserData'
import { isEmptyObj } from '../utils/obj-functions'

const drawerWidth = 240;
const topLevelNavItems = [
  {text: "Home", icon: <HomeIcon/>},
  {text: "Library", icon: <VideoLibraryIcon/>},
  {text: "Bible", icon: <MenuBookIcon/>}
]

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
})

const defaultBackgroundStyle = {
  height: 'auto',
  minHeight: '100vh',
  background: '#181818',
  padding: 0,
  color: 'whitesmoke',
}

const ToggleMiniListItem = (index,isActive,wide,text,icon,onClickMenu) => (
  <ListItem key={text} disablePadding sx={{ display: 'block' }}>
    <ListItemButton
      onClick={()=>onClickMenu(index)}
      sx={[
        {minHeight: 48,px: 2.5},
        wide
          ? {justifyContent: 'initial'}
          : {justifyContent: 'center'},
        isActive && {backgroundColor: '#3e3e3e'}
      ]}
    >
      <ListItemIcon
        sx={[
          {minWidth: 0, justifyContent: 'center'},
          wide
            ? {mr: 3}
            : {mr: 'auto'},
            isActive 
            ? {color: 'white'}
            : {color: 'darkgrey'},
        ]}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={text}
        sx={[wide
            ? {opacity: 1}
            : {opacity: 0},
            isActive 
            ? {color: 'white'}
            : {color: 'lightgrey'},
        ]}
      />
    </ListItemButton>
  </ListItem>
)

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: '#04034f',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': openedMixin(theme),
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': closedMixin(theme),
        },
      },
    ],
  }),
);

export default function AudioBibleNavigationApp() {
  const theme = useTheme();
  const { navHist, startPlay, curPlay, selectedCountry, selectedLang } = useMediaPlayer()
  const isPlaying = !isEmptyObj(curPlay)
  const { size, width } = useBrowserData()
  const isMobileSize = (size === "sm" || size === "xs")
  const [menuValue, setMenuValue] = React.useState(2);
  const [emptyList, setEmptyList] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const ref = React.useRef(null);

  React.useEffect(() => {
    if ((emptyList) && (navHist)) {
      setEmptyList(false)
      console.log("no longer empty list")
      setMenuValue(0)
    }
  },[navHist,emptyList,setEmptyList,setMenuValue])

  React.useEffect(() => {
    if ((isMobileSize) && (ref.current)) {
      (ref.current).ownerDocument.body.scrollTop = 0;
    // setMessages(refreshMessages());
    }
  }, [menuValue,isMobileSize]);

  const handleStartBiblePlay = (topIdStr,curSerie,bookObj,id) => {
    const {bk} = bookObj
    const curEp = {bibleType: true,bk,bookObj,id}
    startPlay(topIdStr,id,curSerie,curEp)
  }
  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);
  const handleClickMenu = (inx) => setMenuValue(inx)

  const settingsMenuIndex = topLevelNavItems.length
  return (
    <div style={defaultBackgroundStyle}>
      <ThemeProvider theme={theme}>
        {!isPlaying && isMobileSize && selectedCountry && (
          <Box sx={{ pb: 7 }} ref={ref}>
            <CssBaseline />
            {(menuValue===settingsMenuIndex) && (<SettingsView
                onExitNavigation={() => console.log("onExitNavigation - SettingsView")}
                onStartPlay={handleStartBiblePlay}
            />)}
            {(menuValue===2) && (<BibleView
                onExitNavigation={() => console.log("onExitNavigation - BibleView")}
                onStartPlay={handleStartBiblePlay}
            />)}
            {(menuValue===1) && (<LibraryView
              onExitNavigation={() => console.log("onExitNavigation - LibraryView")}
              onStartPlay={handleStartBiblePlay}
            />)}
            {(menuValue===0) && (<HomeView
              onExitNavigation={() => console.log("onExitNavigation - Top")}
              onAddNavigation={()=>setMenuValue(1)}
              onStartPlay={handleStartBiblePlay}
            />)}
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
              <BottomNavigation
                showLabels
                value={menuValue}
                sx={{ color: 'white', backgroundColor: '#1e1e1e'}}
                onChange={(event, newValue) => {
                  setMenuValue(newValue);
                }}
              >
                {topLevelNavItems.map(item => {
                  return <BottomNavigationAction sx={{ color: 'darkgrey'}} key={item.text} label={item.text} icon={item.icon}/>
                })}
                <BottomNavigationAction sx={{ color: 'darkgrey'}} key={"Menu"} label={""} icon={<MenuIcon/>}/>
              </BottomNavigation>
            </Paper>
          </Box>
        )}
        {!isPlaying && !isMobileSize && !selectedLang && (
          <Box sx={{ display: 'flex' }}>
          <CssBaseline />
          <AppBar position="fixed" open={open}>
            <Toolbar>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                Bible Wiki
              </Typography>
              <Button
                variant="contained"
                color="success"
                aria-label="confirm settings"
                onClick={handleDrawerOpen}
                sx={[
                  open && { display: 'none' },
                ]}
                startIcon={<CheckIcon />}
              >Confirm Languages
              </Button>
            </Toolbar>
          </AppBar>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <DrawerHeader />
              <SettingsView
                onExitNavigation={() => console.log("onExitNavigation - SettingsView")}
              />
            </Box>
          </Box>
        )}
        {!isPlaying && !isMobileSize && selectedLang && (
          <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar position="fixed" open={open}>
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  onClick={handleDrawerOpen}
                  edge="start"
                  sx={[
                    {
                      marginRight: 5,
                    },
                    open && { display: 'none' },
                  ]}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div">
                  Bible Wiki
                </Typography>
              </Toolbar>
            </AppBar>
            <Drawer variant="permanent" open={open} PaperProps={{ sx: { backgroundColor: "#282828" } }}>
              <DrawerHeader>
                <IconButton 
                  onClick={handleDrawerClose} 
                  sx={{color:'whitesmoke', backgroundColor:'#3e3e3e'}}
                >
                  {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
              </DrawerHeader>
              <Divider />
              <List >
                {topLevelNavItems.map((item,inx) => ToggleMiniListItem(
                  inx,
                  (inx===menuValue),
                  open,
                  item.text,
                  item.icon,
                  handleClickMenu
                ))}
                {ToggleMiniListItem( 
                  settingsMenuIndex,
                  (menuValue===settingsMenuIndex),
                  open,
                  "Settings",
                  <MenuIcon/>,
                  handleClickMenu
                )}
              </List>
              <Divider />
              <List>
              </List>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <DrawerHeader />
              {(menuValue===settingsMenuIndex) && (<SettingsView
                onExitNavigation={() => console.log("onExitNavigation - SettingsView")}
              />)}
              {(menuValue===2) && (<BibleView
                onExitNavigation={() => console.log("onExitNavigation - BibleView")}
                onStartPlay={handleStartBiblePlay}
              />)}
              {(menuValue===1) && (<LibraryView
                onExitNavigation={() => console.log("onExitNavigation - LibraryView")}
                onStartPlay={handleStartBiblePlay}
              />)}
              {(menuValue===0) && (<HomeView
                onExitNavigation={() => console.log("onExitNavigation - Top")}
                onAddNavigation={()=>setMenuValue(1)}
                onStartPlay={handleStartBiblePlay}
              />)}
            </Box>
          </Box>
        )}
        {isPlaying && (menuValue===3) && (<SettingsView
            onExitNavigation={() => console.log("onExitNavigation - SettingsView")}
        />)}
        {isPlaying && (menuValue===2) && (<BibleView
            onExitNavigation={() => console.log("onExitNavigation - BibleView")}
            onStartPlay={handleStartBiblePlay}
        />)}
        {isPlaying && (menuValue===1) && (<LibraryView
          onExitNavigation={() => console.log("onExitNavigation - LibraryView")}
          onStartPlay={handleStartBiblePlay}
        />)}
        {isPlaying && (menuValue===0) && (<HomeView
          onExitNavigation={() => console.log("onExitNavigation - Top")}
          onAddNavigation={()=>setMenuValue(1)}
          onStartPlay={handleStartBiblePlay}
        />)}
      </ThemeProvider>
    </div>
);
}
