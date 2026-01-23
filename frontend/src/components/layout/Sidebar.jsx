import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  FileHeart,
  ClipboardList,
  Stethoscope,
  CalendarDays,
  Ambulance,
  BriefcaseMedical,
  Receipt,
  UserCog,
  Globe,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  HeartPulse,
  Activity,
  BarChart3,
  Truck
} from 'lucide-react';

// Navigation structure with role-based access
const getNavigationItems = (language) => [
  {
    groupLabel: language === 'sr' ? 'OPERACIJE' : 'OPERATIONS',
    items: [
      { 
        id: 'dashboard',
        label: language === 'sr' ? 'Kontrolna tabla' : 'Dashboard', 
        icon: LayoutDashboard, 
        href: '/dashboard',
        roles: ['superadmin', 'admin', 'doctor', 'nurse']
      },
      { 
        id: 'bookings',
        label: language === 'sr' ? 'Rezervacije' : 'Bookings', 
        icon: CalendarClock, 
        href: '/dashboard?tab=bookings',
        roles: ['superadmin', 'admin', 'doctor', 'nurse']
      },
      { 
        id: 'calendar',
        label: language === 'sr' ? 'Kalendar' : 'Calendar', 
        icon: CalendarDays, 
        href: '/dashboard?tab=calendar',
        roles: ['superadmin', 'admin', 'doctor', 'nurse'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      }
    ]
  },
  {
    groupLabel: language === 'sr' ? 'MEDICINSKI CENTAR' : 'MEDICAL CENTER',
    items: [
      { 
        id: 'patients',
        label: language === 'sr' ? 'Pacijenti' : 'Patients', 
        icon: Users, 
        href: '/dashboard?tab=patients',
        roles: ['superadmin', 'admin', 'doctor', 'nurse'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      },
      { 
        id: 'records',
        label: language === 'sr' ? 'Medicinska dok.' : 'Medical Records', 
        icon: FileHeart, 
        href: '/dashboard?tab=records',
        roles: ['superadmin', 'admin', 'doctor', 'nurse'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      },
      { 
        id: 'reports',
        label: language === 'sr' ? 'Transportni izveštaji' : 'Transport Reports', 
        icon: ClipboardList, 
        href: '/dashboard?tab=reports',
        roles: ['superadmin', 'admin', 'doctor'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      },
      { 
        id: 'statistics',
        label: language === 'sr' ? 'Statistika' : 'Statistics', 
        icon: BarChart3, 
        href: '/dashboard?tab=statistics',
        roles: ['superadmin', 'admin'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      }
    ]
  },
  {
    groupLabel: language === 'sr' ? 'TIM' : 'TEAM',
    items: [
      { 
        id: 'team',
        label: language === 'sr' ? 'Pregled tima' : 'Team Overview', 
        icon: Stethoscope, 
        href: '/dashboard?tab=team',
        roles: ['superadmin', 'admin'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      },
      { 
        id: 'drivers',
        label: language === 'sr' ? 'Vozači' : 'Drivers', 
        icon: Truck, 
        href: '/dashboard?tab=drivers',
        roles: ['superadmin', 'admin']
      },
      { 
        id: 'availability',
        label: language === 'sr' ? 'Dostupnost' : 'Availability', 
        icon: CalendarDays, 
        href: '/dashboard?tab=availability',
        roles: ['superadmin', 'admin', 'doctor', 'nurse', 'driver'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      }
    ]
  },
  {
    groupLabel: language === 'sr' ? 'FLOTA' : 'FLEET',
    items: [
      { 
        id: 'vehicles',
        label: language === 'sr' ? 'Vozila' : 'Vehicles', 
        icon: Ambulance, 
        href: '/dashboard?tab=vehicles',
        roles: ['superadmin', 'admin'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      },
      { 
        id: 'equipment',
        label: language === 'sr' ? 'Oprema' : 'Equipment', 
        icon: BriefcaseMedical, 
        href: '/dashboard?tab=equipment',
        roles: ['superadmin', 'admin', 'nurse'],
        badge: language === 'sr' ? 'Uskoro' : 'Soon'
      }
    ]
  },
  {
    groupLabel: language === 'sr' ? 'FINANSIJE' : 'FINANCE',
    items: [
      { 
        id: 'invoices',
        label: language === 'sr' ? 'Fakture' : 'Invoices', 
        icon: Receipt, 
        href: '/dashboard?tab=invoices',
        roles: ['superadmin', 'admin']
      }
    ]
  },
  {
    groupLabel: language === 'sr' ? 'PODEŠAVANJA' : 'SETTINGS',
    items: [
      { 
        id: 'users',
        label: language === 'sr' ? 'Korisnici' : 'Users', 
        icon: UserCog, 
        href: '/dashboard?tab=users',
        roles: ['superadmin', 'admin']
      },
      { 
        id: 'cms',
        label: language === 'sr' ? 'Web stranica' : 'Website CMS', 
        icon: Globe, 
        href: '/dashboard?tab=cms',
        roles: ['superadmin', 'admin']
      },
      { 
        id: 'messages',
        label: language === 'sr' ? 'Poruke' : 'Messages', 
        icon: MessageSquare, 
        href: '/dashboard?tab=contacts',
        roles: ['superadmin', 'admin']
      }
    ]
  }
];

// Sidebar Item Component
const SidebarItem = ({ item, isActive, isCollapsed, onClick }) => {
  const Icon = item.icon;
  
  const content = (
    <button
      onClick={onClick}
      data-testid={`sidebar-${item.id}`}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-white/5",
        isActive 
          ? "bg-white/10 text-white font-semibold" 
          : "text-slate-400 hover:text-slate-200",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left text-sm">{item.label}</span>
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-500/20 text-sky-400">
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-500/20 text-sky-400">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

// Main Sidebar Component
const Sidebar = ({ activeTab, onTabChange, isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigationItems = getNavigationItems(language);

  // Filter items based on user role
  const filterByRole = (items) => {
    if (!user) return [];
    return items.filter(item => 
      item.roles.includes(user.role) || item.roles.includes('all')
    );
  };

  const handleItemClick = (item) => {
    if (item.href.includes('?tab=')) {
      const tab = item.href.split('?tab=')[1];
      onTabChange(tab);
    } else {
      onTabChange('dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-slate-800",
        isCollapsed && "justify-center px-2"
      )}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Paramedic Care
            </h1>
            <p className="text-xs text-slate-500">018</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navigationItems.map((group, groupIndex) => {
            const filteredItems = filterByRole(group.items);
            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIndex}>
                {!isCollapsed && (
                  <h2 
                    className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {group.groupLabel}
                  </h2>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      isActive={activeTab === item.id || (item.id === 'dashboard' && activeTab === 'overview')}
                      isCollapsed={isCollapsed}
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        "border-t border-slate-800 p-4",
        isCollapsed && "px-2"
      )}>
        {/* User Info */}
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        
        {/* Collapse Toggle & Logout */}
        <div className={cn(
          "flex gap-2",
          isCollapsed ? "flex-col" : "flex-row"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "text-slate-400 hover:text-white hover:bg-slate-800",
              isCollapsed ? "w-full justify-center" : "flex-1"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                {language === 'sr' ? 'Skupi' : 'Collapse'}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              "text-slate-400 hover:text-red-400 hover:bg-red-500/10",
              isCollapsed ? "w-full justify-center" : ""
            )}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">{language === 'sr' ? 'Odjava' : 'Logout'}</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col h-screen transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-72"
        )}
        style={{ backgroundColor: '#0f172a' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};

export default Sidebar;
