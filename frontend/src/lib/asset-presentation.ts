export type AssetType = "SERVER" | "STORAGE" | "SWITCH" | "SP" | "NETWORK";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  SERVER: "Server",
  STORAGE: "Storage",
  SWITCH: "Switch",
  SP: "Service Processor",
  NETWORK: "Network",
};

export const ASSET_TYPE_OPTIONS = (
  Object.entries(ASSET_TYPE_LABELS) as Array<[AssetType, string]>
).map(([value, label]) => ({ value, label }));

export function getAssetTypeLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return ASSET_TYPE_LABELS[value as AssetType] ?? "Unknown";
}
