import { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Typography,
  ListItemIcon,
  useMediaQuery,
  Tooltip,
  Badge,
} from '@mui/material';
import { NavLink, Outlet, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Home,
  Search,
  Bookmark,
  BellRing,
  SlidersHorizontal,
  Clock,
  Menu as MenuIcon,
  GitCompareArrows,
  UserRound,
} from 'lucide-react';
import { Logo, BuyWiseMark } from '@/brand/Logo';
import { useCompareStore } from '@/store/compare';
import { palette, radius, zIndex } from '@/theme/tokens';

const NAV = [
  { to: '/app', label: 'Home', icon: Home, end: true },
  { to: '/app/research', label: 'Research', icon: Search },
  { to: '/app/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/app/saved', label: 'Saved', icon: Bookmark },
  { to: '/app/watch', label: 'Price Watch', icon: BellRing },
  { to: '/app/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { to: '/app/history', label: 'History', icon: Clock },
];

const SIDEBAR_WIDTH = 248;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const compareCount = useCompareStore((s) => s.ids.length);
  return (
    <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1.5 }}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          style={{ textDecoration: 'none' }}
          aria-label={item.label}
        >
          {({ isActive }) => (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1.1,
                borderRadius: radius.sm,
                color: isActive ? palette.ink : palette.inkSecondary,
                background: isActive ? palette.surface : 'transparent',
                border: `1px solid ${isActive ? palette.hairline : 'transparent'}`,
                fontWeight: isActive ? 580 : 500,
                fontSize: '0.925rem',
                transition: 'background .18s, color .18s',
                '&:hover': { background: isActive ? palette.surface : palette.paperSunken, color: palette.ink },
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.label === 'Compare' && compareCount > 0 && (
                <Badge
                  badgeContent={compareCount}
                  sx={{ ml: 'auto', '& .MuiBadge-badge': { background: palette.brand, color: '#fff' } }}
                />
              )}
            </Box>
          )}
        </NavLink>
      ))}
    </Box>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width:960px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    setAnchor(null);
    navigate('/');
  };

  const sidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', py: 2.5 }}>
      <Box sx={{ px: 3, mb: 3 }}>
        <RouterLink to="/app" aria-label="BuyWise">
          <Logo />
        </RouterLink>
      </Box>
      <NavItems onNavigate={() => setMobileOpen(false)} />
      <Box sx={{ mt: 'auto', px: 3, pt: 2 }}>
        <Typography variant="caption" sx={{ color: palette.inkTertiary }}>
          BuyWise
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100dvh', background: palette.paper }}>
      {/* Desktop sidebar */}
      {isDesktop && (
        <Box
          component="aside"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: SIDEBAR_WIDTH,
            borderRight: `1px solid ${palette.hairline}`,
            background: palette.paper,
            zIndex: zIndex.header,
          }}
        >
          {sidebar}
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH } }}>
        {sidebar}
      </Drawer>

      {/* Main */}
      <Box sx={{ ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` }, overflowX: 'hidden' }}>
        {/* Top bar */}
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: zIndex.header - 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, md: 4 },
            height: 64,
            background: 'rgba(246,244,239,0.82)',
            backdropFilter: 'saturate(180%) blur(14px)',
            borderBottom: `1px solid ${palette.hairline}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {!isDesktop && (
              <>
                <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation" edge="start">
                  <MenuIcon size={20} />
                </IconButton>
                <BuyWiseMark size={26} />
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Settings">
              <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small" aria-label="Account menu">
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: palette.brand, fontSize: '0.85rem', fontWeight: 600, borderRadius: 0 }}
                >
                  BW
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: radius.md, border: `1px solid ${palette.hairline}` } } }}
            >
              <MenuItem onClick={() => { setAnchor(null); navigate('/app/preferences'); }}>
                <ListItemIcon><UserRound size={17} /></ListItemIcon>
                Preferences
              </MenuItem>
              <MenuItem onClick={() => { setAnchor(null); navigate('/app/history'); }}>
                <ListItemIcon><Clock size={17} /></ListItemIcon>
                History
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                Back to home
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, maxWidth: 1180, mx: 'auto', width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
