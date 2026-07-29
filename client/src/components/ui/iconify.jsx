// ====== ICONIFY - Backward Compatibility ======
// Re-exports from the new icons utility
// Import from './icons' for new code with direct lucide-react icon components

import IconifyComponent from './icons';
export { ICONS, Icon } from './icons';

// Re-export the default Iconify component (handles 'icon' prop for legacy code)
export default IconifyComponent;
