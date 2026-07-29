import { Avatar } from '@heroui/react';

/**
 * AppAvatar — Wraps HeroUI Avatar with a clean fallback for missing profile pictures.
 *
 * Usage:
 *   <AppAvatar src={user.profile_picture} name={user.full_name} size="md" />
 *
 * Props:
 *   src     — image URL (null/undefined shows fallback initials)
 *   name    — full name used for initials fallback (e.g. "John Doe" → "JD")
 *   size    — 'sm' (32px), 'md' (40px), 'lg' (56px), 'xl' (72px)
 *   className — additional Tailwind classes
 *   showStatus — if true, shows a green online dot (requires isOnline prop)
 *   isOnline   — boolean for online status indicator
 *   squared   — if true, uses rounded-lg shape instead of full circle
 */
export default function AppAvatar({
  src,
  name,
  size = 'md',
  className = '',
  showStatus = false,
  isOnline = false,
  squared = false,
  ...props
}) {
  const sizeMap = {
    sm: { avatar: 'size-8 text-[10px]', img: '' },
    md: { avatar: 'size-10 text-sm', img: '' },
    lg: { avatar: 'size-14 text-lg', img: '' },
    xl: { avatar: 'size-16 text-xl', img: '' },
  };

  const sz = sizeMap[size] || sizeMap.md;
  const initials = name
    ? name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '?';

  const avatar = (
    <Avatar
      className={`${sz.avatar} ${squared ? 'rounded-lg' : ''} ${className}`}
      {...props}
    >
      <Avatar.Image
        alt={name || 'User avatar'}
        src={src || ''}
        className={sz.img}
      />
      <Avatar.Fallback className={`${squared ? 'rounded-lg' : ''}`}>
        {initials}
      </Avatar.Fallback>
    </Avatar>
  );

  if (showStatus) {
    return (
      <div className="relative inline-flex shrink-0">
        {avatar}
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
      </div>
    );
  }

  return avatar;
}
