export interface HardwareSpecField {
  key: string;
  label: string;
  placeholder: string;
}

export interface HardwareSpecGroup {
  key: string;
  label: string;
  fields: readonly HardwareSpecField[];
}

export type HardwareSpecifications = Record<string, Record<string, string>>;

export const HARDWARE_SPEC_GROUPS: readonly HardwareSpecGroup[] = [
  {
    key: 'cpu',
    label: 'CPU',
    fields: [
      { key: 'totalSockets', label: 'Total Sockets', placeholder: 'e.g. 2' },
      { key: 'socketsUsed', label: 'Sockets Used', placeholder: 'e.g. 2' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 2 × 32-Core CPU' },
      { key: 'totalCores', label: 'Total Cores', placeholder: 'e.g. 64' },
      { key: 'totalThreads', label: 'Total Threads', placeholder: 'e.g. 128' },
    ],
  },
  {
    key: 'ram',
    label: 'RAM',
    fields: [
      { key: 'totalSlots', label: 'Total Slots', placeholder: 'e.g. 24' },
      { key: 'slotsUsed', label: 'Slots Used', placeholder: 'e.g. 8' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 8 × 32 GB' },
      { key: 'installedCapacity', label: 'Installed Capacity (Total)', placeholder: 'e.g. 256 GB' },
      { key: 'maximumCapacity', label: 'Maximum Capacity', placeholder: 'e.g. 1,536 GB' },
    ],
  },
  {
    key: 'disk',
    label: 'Disk',
    fields: [
      { key: 'totalBays', label: 'Total Bays', placeholder: 'e.g. 24' },
      { key: 'baysUsed', label: 'Bays Used', placeholder: 'e.g. 8' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 8 × 1.92 TB SSD' },
      { key: 'rawCapacity', label: 'Raw Capacity (Total)', placeholder: 'e.g. 15.36 TB' },
      { key: 'usableCapacity', label: 'Usable Capacity (Total)', placeholder: 'e.g. 10.8 TB' },
    ],
  },
  {
    key: 'power',
    label: 'Power Supply',
    fields: [
      { key: 'totalSlots', label: 'Total PSU Slots', placeholder: 'e.g. 2' },
      { key: 'installed', label: 'PSUs Installed', placeholder: 'e.g. 2' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 2 × 800W' },
      { key: 'ratedPower', label: 'Rated Power (Total)', placeholder: 'e.g. 1,600W' },
      { key: 'redundancy', label: 'Redundancy', placeholder: 'e.g. N+1' },
    ],
  },
  {
    key: 'networkPorts',
    label: 'Network Ports',
    fields: [
      { key: 'totalPorts', label: 'Total Ports', placeholder: 'e.g. 8' },
      { key: 'portsUsed', label: 'Ports Used', placeholder: 'e.g. 4' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 4 × 10GbE' },
      { key: 'availablePorts', label: 'Available Ports', placeholder: 'e.g. 4' },
      { key: 'totalBandwidth', label: 'Total Bandwidth', placeholder: 'e.g. 40Gbps' },
    ],
  },
  {
    key: 'expansionSlots',
    label: 'Expansion Slots',
    fields: [
      { key: 'totalSlots', label: 'Total Slots', placeholder: 'e.g. 6' },
      { key: 'slotsUsed', label: 'Slots Used', placeholder: 'e.g. 2' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 2 × PCIe Gen4 x16' },
      { key: 'availableSlots', label: 'Available Slots', placeholder: 'e.g. 4' },
      { key: 'slotType', label: 'Slot Type', placeholder: 'e.g. PCIe Gen4' },
    ],
  },
  {
    key: 'quantity',
    label: 'Quantity',
    fields: [
      { key: 'totalUnits', label: 'Total Units', placeholder: 'e.g. 1' },
      { key: 'unitsInstalled', label: 'Units Installed', placeholder: 'e.g. 1' },
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 1 chassis' },
      { key: 'spareUnits', label: 'Spare Units', placeholder: 'e.g. 0' },
      { key: 'notes', label: 'Notes', placeholder: 'e.g. Production unit' },
    ],
  },
  {
    key: 'formFactor',
    label: 'Form Factor',
    fields: [
      { key: 'configuration', label: 'Configuration', placeholder: 'e.g. 2U Rack' },
      { key: 'rackUnits', label: 'Rack Units', placeholder: 'e.g. 2U' },
      { key: 'dimensions', label: 'Dimensions', placeholder: 'e.g. 482 × 800 × 87 mm' },
      { key: 'weight', label: 'Weight', placeholder: 'e.g. 28 kg' },
      { key: 'mounting', label: 'Mounting', placeholder: 'e.g. Sliding Rails' },
    ],
  },
  {
    key: 'raid',
    label: 'RAID',
    fields: [
      { key: 'level', label: 'RAID Level', placeholder: 'e.g. RAID 10' },
      { key: 'driveLayout', label: 'Drive Layout', placeholder: 'e.g. 8 × 1.92 TB SSD' },
      { key: 'controller', label: 'Controller', placeholder: 'e.g. Smart Array P816i-a' },
      { key: 'cache', label: 'Cache', placeholder: 'e.g. 4 GB' },
      { key: 'status', label: 'Status', placeholder: 'e.g. Healthy' },
    ],
  },
] as const;

export function createEmptyHardwareSpecifications(): HardwareSpecifications {
  return Object.fromEntries(
    HARDWARE_SPEC_GROUPS.map((group) => [
      group.key,
      Object.fromEntries(group.fields.map(({ key }) => [key, ''])),
    ]),
  );
}

export function hasHardwareSpecifications(specifications: HardwareSpecifications) {
  return HARDWARE_SPEC_GROUPS.some((group) =>
    group.fields.some(({ key }) => specifications[group.key]?.[key]?.trim()),
  );
}

export function normalizeSpecKey(key: string) {
  return key
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}
