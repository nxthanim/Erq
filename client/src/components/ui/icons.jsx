// ====== ICON UTILITY ======
// Direct lucide-react icons with semantic names — no string-based lookup that breaks at runtime
// Import icons directly from this file instead of using emojis or the old Iconify wrapper

import {
  // Navigation
  Home, Store, Search, MessageCircle, MessageSquare, User, Settings,
  LogOut, LogIn, LayoutDashboard, Shield, BarChart3,
  // Actions
  Plus, Pencil, Trash2, Save, X, RefreshCw, Download, Upload, Copy,
  Share2, LinkIcon, ArrowLeft, ArrowRight, Menu, MoreVertical,
  // Status
  Check, CheckCircle, XCircle, AlertTriangle, Info, HelpCircle,
  Clock, BadgeCheck, Bell, BellOff, BellRing,
  // Finance
  DollarSign, CreditCard, Wallet, Lock, TrendingUp, TrendingDown,
  // Content
  Star, Briefcase, ClipboardList, Bot, FileText,
  // Misc
  Palette, Laptop, Globe, Flame, Trophy, Phone, Rocket, Sparkles,
  // Extra
  UserPlus, ShoppingBag, Megaphone, Camera, PanelTop, Gavel, Bookmark,
  // Communication
  Mail, Send, Inbox, Reply, Forward,
  // Media
  Play, Image, Video, Music, Film,
  // Devices
  Monitor, Tablet, Smartphone,
  // Shapes
  Circle, Square, Triangle,
  // Arrows
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ChevronsDown, ChevronsUp, ChevronsLeft, ChevronsRight,
  // Weather
  Sun, Moon, Cloud, CloudSun,
  // Social
  Github, Twitter, Linkedin, Instagram,
  // Files
  Folder, FolderOpen, File, FilePlus,
  // UI
  AlertCircle, AlertOctagon, AlertTriangle as AlertTriangleIcon,
  CheckSquare, Info as InfoIcon, HelpCircle as QuestionMarkCircle,
  // Misc
  ExternalLink, Eye, EyeOff, Heart, Share2 as ShareIcon,
  ThumbsUp, ThumbsDown, Zap, Award, Target,
  // Time
  Calendar, Clock as ClockIcon, Timer,
  // Shopping
  ShoppingCart, Tag, Package,
  // Map
  MapPin, Navigation, Compass,
  // Users
  Users, UserCheck, UserX, UserPlus as UserPlusIcon,
  // Building
  Building2, Briefcase as BriefcaseIcon,
  // Emoji replacements
  Lightbulb, BookOpen, Headphones, Sparkles as SparkleIcon,
  BarChart4, PieChart, LineChart,
  // More
  Globe as GlobeIcon, Wifi, Bluetooth, Flag,
} from 'lucide-react';

// ====== NAMED EXPORTS ======
// Use these directly in your components: <IconHome className="..." />

// Navigation
export const IconHome = Home;
export const IconStore = Store;
export const IconMarketplace = Store;
export const IconSearch = Search;
export const IconMessages = MessageCircle;
export const IconChat = MessageSquare;
export const IconUser = User;
export const IconSettings = Settings;
export const IconLogout = LogOut;
export const IconLogin = LogIn;
export const IconSignup = UserPlus;
export const IconDashboard = LayoutDashboard;
export const IconAdmin = Shield;
export const IconAnalytics = BarChart3;
export const IconBack = ArrowLeft;
export const IconNext = ArrowRight;

// Actions
export const IconPlus = Plus;
export const IconEdit = Pencil;
export const IconDelete = Trash2;
export const IconSave = Save;
export const IconCancel = X;
export const IconClose = X;
export const IconRefresh = RefreshCw;
export const IconDownload = Download;
export const IconUpload = Upload;
export const IconCopy = Copy;
export const IconShare = Share2;
export const IconLink = LinkIcon;
export const IconMenu = Menu;
export const IconMore = MoreVertical;

// Status
export const IconCheck = Check;
export const IconCheckCircle = CheckCircle;
export const IconXCircle = XCircle;
export const IconAlert = AlertTriangle;
export const IconWarning = AlertTriangle;
export const IconInfo = Info;
export const IconHelp = HelpCircle;
export const IconQuestion = HelpCircle;
export const IconPending = Clock;
export const IconVerified = BadgeCheck;
export const IconBell = Bell;
export const IconNotification = Bell;
export const IconBellRing = BellRing;
export const IconSuccess = CheckCircle;

// Finance
export const IconCash = DollarSign;
export const IconCurrency = DollarSign;
export const IconCreditCard = CreditCard;
export const IconWallet = Wallet;
export const IconLock = Lock;
export const IconGrowth = TrendingUp;
export const IconTrendingUp = TrendingUp;
export const IconDecline = TrendingDown;
export const IconTrendingDown = TrendingDown;

// Content & Work
export const IconStar = Star;
export const IconBriefcase = Briefcase;
export const IconClipboard = ClipboardList;
export const IconGig = ClipboardList;
export const IconJob = Briefcase;
export const IconPortfolio = Image;
export const IconFile = FileText;

// Categories & Services
export const IconDesign = Palette;
export const IconDev = Laptop;
export const IconWeb = Globe;
export const IconMarketing = Megaphone;
export const IconWriting = FileText;
export const IconVideoCategory = Film;
export const IconMusic = Music;
export const IconPhoto = Camera;
export const IconAI = Bot;
export const IconRobot = Bot;
export const IconConsulting = BriefcaseIcon;
export const IconFinance = DollarSign;
export const IconGrowth2 = TrendingUp;

// Objects & UI
export const IconRocket = Rocket;
export const IconTrophy = Trophy;
export const IconFire = Flame;
export const IconSparkles = Sparkles;
export const IconPalette = Palette;
export const IconGlobe = Globe;
export const IconMail = Mail;
export const IconPhone = Phone;
export const IconMapPin = MapPin;
export const IconCalendar = Calendar;
export const IconClock = ClockIcon;
export const IconTimer = Timer;
export const IconAward = Award;
export const IconTarget = Target;
export const IconHeart = Heart;
export const IconThumbsUp = ThumbsUp;
export const IconThumbsDown = ThumbsDown;
export const IconFlag = Flag;

// Devices
export const IconDesktop = Monitor;
export const IconTablet = Tablet;
export const IconMobile = Smartphone;
export const IconLaptop = Laptop;

// Social
export const IconGithub = Github;
export const IconTwitter = Twitter;
export const IconLinkedin = Linkedin;
export const IconInstagram = Instagram;

// Communication
export const IconSend = Send;
export const IconInbox = Inbox;
export const IconReply = Reply;
export const IconForward = Forward;

// Media
export const IconPlay = Play;
export const IconImage = Image;
export const IconCamera = Camera;
export const IconVideo = Video;
export const IconFilm = Film;

// Misc
export const IconLightbulb = Lightbulb;
export const IconBook = BookOpen;
export const IconHeadphones = Headphones;
export const IconShoppingBag = ShoppingBag;
export const IconBuilding = Building2;
export const IconUsers = Users;
export const IconUserCheck = UserCheck;
export const IconZap = Zap;
export const IconEye = Eye;
export const IconEyeOff = EyeOff;
export const IconExternalLink = ExternalLink;
export const IconPackage = Package;
export const IconTag = Tag;
export const IconShoppingCart = ShoppingCart;
export const IconNavigation = Navigation;
export const IconCompass = Compass;
export const IconWifi = Wifi;
export const IconBluetooth = Bluetooth;

// ====== ICON NAME MAP (for dynamic lookups) ======
// This is used by the Icon component below for dynamic icon resolution
const ICON_MAP = {
  // Navigation
  home: Home, store: Store, marketplace: Store, search: Search,
  messages: MessageCircle, 'message-text': MessageSquare, chat: MessageSquare,
  account: User, user: User, profile: User,
  cog: Settings, settings: Settings,
  logout: LogOut, login: LogIn, signup: UserPlus,
  dashboard: LayoutDashboard, admin: Shield, 'shield-account': Shield,
  analytics: BarChart3, 'chart-bar': BarChart3,
  back: ArrowLeft, next: ArrowRight,

  // Actions
  plus: Plus, pencil: Pencil, edit: Pencil, delete: Trash2,
  save: Save, cancel: X, close: X,
  refresh: RefreshCw, download: Download, upload: Upload,
  copy: Copy, share: Share2, link: LinkIcon,
  menu: Menu, 'dots-vertical': MoreVertical,

  // Status
  check: Check, 'check-circle': CheckCircle, 'close-circle': XCircle,
  alert: AlertTriangle, 'alert-circle': AlertTriangle, warning: AlertTriangle,
  information: Info, info: Info, question: HelpCircle, 'help-circle': HelpCircle,
  pending: Clock, 'clock-outline': Clock, verified: BadgeCheck,
  bell: Bell, notification: Bell, 'bell-ring': BellRing,

  // Finance
  cash: DollarSign, 'currency-usd': DollarSign, 'credit-card': CreditCard,
  wallet: Wallet, lock: Lock, growth: TrendingUp, 'trending-up': TrendingUp,
  decline: TrendingDown, 'trending-down': TrendingDown,

  // Content
  star: Star, briefcase: Briefcase, 'clipboard-text': ClipboardList,
  clipboard: ClipboardList, gig: ClipboardList, job: Briefcase,
  portfolio: Image, file: FileText, document: FileText,

  // Categories
  design: Palette, dev: Laptop, web: Globe, marketing: Megaphone,
  writing: FileText, video: Film, music: Music, photo: Camera,
  ai: Bot, robot: Bot, consulting: BriefcaseIcon, finance: DollarSign,
  data: BarChart3, photography: Camera,

  // Misc
  rocket: Rocket, trophy: Trophy, fire: Flame, sparkles: Sparkles,
  palette: Palette, globe: Globe, mail: Mail, phone: Phone,
  'map-pin': MapPin, calendar: Calendar, clock: ClockIcon,
  timer: Timer, award: Award, target: Target, heart: Heart,
  'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, flag: Flag,

  // Devices
  desktop: Monitor, tablet: Tablet, mobile: Smartphone, laptop: Laptop,

  // Social
  github: Github, twitter: Twitter, linkedin: Linkedin, instagram: Instagram,

  // Communication
  send: Send, inbox: Inbox, reply: Reply, forward: Forward,

  // Media
  play: Play, image: Image, camera: Camera, film: Film,

  // UI
  'alert-triangle': AlertTriangle, 'check-square': CheckSquare,
  'question-mark-circle': QuestionMarkCircle,
  'external-link': ExternalLink, eye: Eye, 'eye-off': EyeOff,
  zap: Zap, 'shopping-bag': ShoppingBag, 'shopping-cart': ShoppingCart,
  tag: Tag, package: Package, building: Building2, users: Users,
  'user-check': UserCheck, 'user-x': UserX,
  navigation: Navigation, compass: Compass,
  lightbulb: Lightbulb, book: BookOpen, headphones: Headphones,

  // Charts
  'bar-chart': BarChart4, 'pie-chart': PieChart, 'line-chart': LineChart,
};

// ====== ICON COMPONENT ======
// For dynamic icon lookups by name string
// Usage: <Icon name="home" className="..." size={20} />
export function Icon({ name, className = '', size = 20, style = {} }) {
  if (!name) return null;
  const cleanName = name.includes(':') ? name.split(':')[1] : name;
  const IconComponent = ICON_MAP[cleanName];
  if (!IconComponent) {
    // Fallback: render a placeholder so the UI doesn't break
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}
      >
        ?
      </span>
    );
  }
  return <IconComponent className={className} size={size} style={{ display: 'inline-flex', verticalAlign: 'middle', ...style }} />;
}

// ====== OLD ICON NAMES (backward compatibility) ======
export const ICONS = {
  home: 'home', store: 'store', marketplace: 'marketplace', search: 'search',
  messages: 'messages', chat: 'chat', profile: 'user', settings: 'settings',
  logout: 'logout', login: 'login', signup: 'signup', dashboard: 'dashboard',
  admin: 'admin', analytics: 'analytics',
  plus: 'plus', edit: 'edit', delete: 'delete', save: 'save',
  cancel: 'close', refresh: 'refresh', download: 'download', upload: 'upload',
  copy: 'copy', share: 'share', link: 'link', close: 'close',
  back: 'back', next: 'next', menu: 'menu',
  check: 'check', checkCircle: 'check-circle', closeCircle: 'close-circle',
  alert: 'alert', warning: 'warning', info: 'info', question: 'question',
  pending: 'pending', verified: 'verified',
  cash: 'cash', currencyUsd: 'currency-usd', creditCard: 'credit-card',
  wallet: 'wallet', lock: 'lock', growth: 'growth', decline: 'decline',
  briefcase: 'briefcase', clipboard: 'clipboard', gig: 'gig', job: 'job',
  star: 'star', robot: 'robot', palette: 'palette', laptop: 'laptop',
  web: 'web', fire: 'fire', trophy: 'trophy', notification: 'notification',
  phone: 'phone', rocket: 'rocket', sparkles: 'sparkles',
};

// Export a default Icon component that works with legacy 'lucide:name' format
export default function Iconify({ icon, className = '', size = '1em', style = {} }) {
  if (!icon) return null;
  const iconName = icon.includes(':') ? icon.split(':')[1] : icon;
  const IconComponent = ICON_MAP[iconName];
  if (!IconComponent) {
    // Fallback to prevent UI breakage
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}
      >
        ?
      </span>
    );
  }
  return <IconComponent className={className} size={size} style={{ display: 'inline-flex', verticalAlign: 'middle', ...style }} />;
}
