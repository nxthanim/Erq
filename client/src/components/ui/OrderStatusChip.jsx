import { Chip } from '@heroui/react';
import { CircleDashed } from '@gravity-ui/icons';

/**
 * OrderStatusChip — HeroUI Chip-based order/job status indicator.
 *
 * Maps internal status strings to HeroUI Chip color/variant combos.
 *
 * Usage:
 *   <OrderStatusChip status="pending" />
 *   <OrderStatusChip status="delivered" size="sm" />
 */
const statusColorMap = {
  // Orders
  pending:         { color: 'warning', variant: 'soft',   label: 'Pending' },
  pending_payment: { color: 'warning', variant: 'primary', label: 'Pending Payment' },
  accepted:        { color: 'success', variant: 'soft',   label: 'Accepted' },
  in_progress:     { color: 'primary', variant: 'soft',   label: 'In Progress' },
  delivered:       { color: 'warning', variant: 'primary', label: 'Delivered' },
  completed:       { color: 'success', variant: 'primary', label: 'Completed' },
  cancelled:       { color: 'danger',  variant: 'soft',   label: 'Cancelled' },
  disputed:        { color: 'danger',  variant: 'primary', label: 'Disputed' },
  // Jobs
  open:            { color: 'warning', variant: 'soft',   label: 'Open' },
};

export default function OrderStatusChip({ status, size = 'sm', className = '' }) {
  const cfg = statusColorMap[status] || { color: 'default', variant: 'soft', label: status || 'Unknown' };

  return (
    <Chip
      color={cfg.color}
      size={size}
      variant={cfg.variant}
      className={className}
    >
      <CircleDashed style={{ width: 12, height: 12 }} />
      <Chip.Label>{cfg.label}</Chip.Label>
    </Chip>
  );
}
