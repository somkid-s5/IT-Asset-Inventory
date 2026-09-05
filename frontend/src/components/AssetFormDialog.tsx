"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Database,
  Eye,
  EyeOff,
  FolderTree,
  HardDrive,
  Plus,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  createEmptyHardwareSpecifications,
  HARDWARE_SPEC_GROUPS,
  hasHardwareSpecifications,
  normalizeSpecKey,
  type HardwareSpecifications,
} from "@/lib/asset-specs";

type AssetType = "SERVER" | "STORAGE" | "SWITCH" | "SP" | "NETWORK";

interface FormErrors {
  name?: string;
  assetId?: string;
  rack?: string;
  location?: string;
  brandModel?: string;
  sn?: string;
  accessPoints?: Record<
    number,
    {
      type?: string;
      manageType?: string;
      address?: string;
      version?: string;
      users?: Record<
        number,
        {
          username?: string;
          password?: string;
        }
      >;
    }
  >;
}

interface AccessUserFormValue {
  id?: string;
  username: string;
  password: string;
}

interface AccessPointFormValue {
  nodeLabel: string;
  type: string;
  manageType: string;
  version: string;
  address: string;
  credentialId?: string;
  users: AccessUserFormValue[];
}

interface AssetCredential {
  id?: string;
  username: string;
  password?: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
}

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
  credentialId?: string | null;
}

interface AssetFormAsset {
  id: string;
  name: string;
  assetId?: string | null;
  type: AssetType;
  rack?: string | null;
  location?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  manageType?: string | null;
  parentId?: string | null;
  status?: string | null;
  owner?: string | null;
  department?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyExpiration?: string | null;
  environment?: string | null;
  dependencies?: string | null;
  osVersion?: string | null;
  customMetadata?: Record<string, unknown> | null;
  ipAllocations?: AssetIpAllocation[];
  credentials?: AssetCredential[];
  componentLinks?: Array<{ componentId: string }>;
}

interface ParentAssetOption {
  id: string;
  name: string;
  type: string;
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetToEdit?: AssetFormAsset;
  onSuccess: () => void;
  availableParents: ParentAssetOption[];
}

function createEmptyUser(): AccessUserFormValue {
  return { username: "", password: "" };
}

function createEmptyAccessPoint(): AccessPointFormValue {
  return {
    nodeLabel: "",
    type: "",
    manageType: "",
    version: "",
    address: "",
    users: [createEmptyUser()],
  };
}

const DEFAULT_FORM_STATE = {
  name: "",
  assetId: "",
  type: "SERVER" as AssetType,
  rack: "",
  location: "",
  brandModel: "",
  sn: "",
  parentId: "",
  status: "ACTIVE",
  owner: "",
  department: "",
  vendor: "",
  purchaseDate: "",
  warrantyExpiration: "",
  environment: "DEV",
  dependencies: "",
  osVersion: "",
};

const typeOptions: { value: AssetType; label: string }[] = [
  { value: "SERVER", label: "Server" },
  { value: "STORAGE", label: "Storage" },
  { value: "SWITCH", label: "Switch" },
  { value: "SP", label: "Service Processor" },
  { value: "NETWORK", label: "Network" },
];

const accessTypeOptions = ["Host", "Management"];

const manageTypeOptions = ["WEB", "SSH"];

function getSelectOptions(baseOptions: string[], currentValue: string) {
  if (currentValue && !baseOptions.includes(currentValue)) {
    return [currentValue, ...baseOptions];
  }

  return baseOptions;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  assetToEdit,
  onSuccess,
  availableParents,
}: AssetFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [accessPoints, setAccessPoints] = useState<AccessPointFormValue[]>([
    createEmptyAccessPoint(),
  ]);
  const [hardwareSpecs, setHardwareSpecs] = useState<HardwareSpecifications>(
    () => createEmptyHardwareSpecifications(),
  );
  const [metadataExtras, setMetadataExtras] = useState<Record<string, unknown>>(
    {},
  );
  const [assetMode, setAssetMode] = useState<"single" | "multi">("single");
  const [nodeLabels, setNodeLabels] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );
  const [componentIds, setComponentIds] = useState<string[]>([]);
  const [availableComponents, setAvailableComponents] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const { confirmDiscard } = useUnsavedChanges(open, {
    formData,
    accessPoints,
    hardwareSpecs,
    metadataExtras,
    assetMode,
    componentIds,
  });
  const requestClose = () => {
    if (loading || !confirmDiscard()) return;
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!assetToEdit) {
      setFormData(DEFAULT_FORM_STATE);
      setAccessPoints([createEmptyAccessPoint()]);
      setHardwareSpecs(createEmptyHardwareSpecifications());
      setMetadataExtras({});
      setAssetMode("single");
      setNodeLabels([]);
      setFormErrors({});
      setTouchedFields({});
      setComponentIds([]);
      return;
    }

    const groupedMap = new Map<string, AccessPointFormValue>();
    const makeAccessKey = (
      nodeLabel?: string | null,
      type?: string | null,
      manageType?: string | null,
      version?: string | null,
      address?: string | null,
    ) =>
      [
        nodeLabel?.trim().toLowerCase() || "primary",
        type?.trim().toLowerCase() || "general",
        manageType?.trim().toLowerCase() || "direct",
        version?.trim().toLowerCase() || "no-version",
        address?.trim().toLowerCase() || "no-address",
      ].join("::");

    (assetToEdit.ipAllocations ?? []).forEach((ip, index) => {
      const key =
        makeAccessKey(
          ip.nodeLabel,
          ip.type,
          ip.manageType,
          ip.version,
          ip.address,
        ) || `${ip.type ?? "general"}-${ip.address}-${index}`;
      groupedMap.set(key, {
        nodeLabel: ip.nodeLabel ?? "",
        type: ip.type ?? "",
        manageType: ip.manageType ?? assetToEdit.manageType ?? "",
        version: ip.version ?? "",
        address: ip.address,
        credentialId: ip.credentialId ?? undefined,
        users: [],
      });
    });

    (assetToEdit.credentials ?? []).forEach((credential, index) => {
      const key = makeAccessKey(
        credential.nodeLabel,
        credential.type,
        credential.manageType,
        credential.version,
        null,
      );
      const matchedEntry =
        Array.from(groupedMap.values()).find(
          (value) => value.credentialId === credential.id,
        ) ??
        groupedMap.get(key) ??
        Array.from(groupedMap.values()).find(
          (value) =>
            (value.nodeLabel || "").toLowerCase() ===
              (credential.nodeLabel || "").toLowerCase() &&
            (value.type || "").toLowerCase() ===
              (credential.type || "").toLowerCase() &&
            (value.manageType || "").toLowerCase() ===
              (credential.manageType || "").toLowerCase() &&
            (value.version || "").toLowerCase() ===
              (credential.version || "").toLowerCase(),
        );

      if (matchedEntry) {
        matchedEntry.manageType =
          matchedEntry.manageType || credential.manageType || "";
        matchedEntry.version = matchedEntry.version || credential.version || "";
        matchedEntry.users.push({
          id: credential.id,
          username: credential.username,
          password: credential.password ?? "",
        });
        if (!matchedEntry.credentialId)
          matchedEntry.credentialId = credential.id;
        return;
      }

      groupedMap.set(
        key || `credential-${credential.type ?? "general"}-${index}`,
        {
          nodeLabel: credential.nodeLabel ?? "",
          type: credential.type ?? "",
          manageType: credential.manageType ?? assetToEdit.manageType ?? "",
          version: credential.version ?? "",
          address: "",
          credentialId: credential.id,
          users: [
            {
              id: credential.id,
              username: credential.username,
              password: credential.password ?? "",
            },
          ],
        },
      );
    });

    setFormData({
      name: assetToEdit.name || "",
      assetId: assetToEdit.assetId || "",
      type: assetToEdit.type || "SERVER",
      rack: assetToEdit.rack || "",
      location: assetToEdit.location || "",
      brandModel: assetToEdit.brandModel || "",
      sn: assetToEdit.sn || "",
      parentId: assetToEdit.parentId || "",
      status: assetToEdit.status || "ACTIVE",
      owner: assetToEdit.owner || "",
      department: assetToEdit.department || "",
      vendor: assetToEdit.vendor || "",
      purchaseDate: assetToEdit.purchaseDate
        ? new Date(assetToEdit.purchaseDate).toISOString().split("T")[0]
        : "",
      warrantyExpiration: assetToEdit.warrantyExpiration
        ? new Date(assetToEdit.warrantyExpiration).toISOString().split("T")[0]
        : "",
      environment: assetToEdit.environment || "DEV",
      dependencies: assetToEdit.dependencies || "",
      osVersion: assetToEdit.osVersion || "",
    });

    setAccessPoints(
      groupedMap.size > 0
        ? Array.from(groupedMap.values()).map((item) => ({
            ...item,
            users: item.users.length > 0 ? item.users : [createEmptyUser()],
          }))
        : [createEmptyAccessPoint()],
    );

    const existingNodeLabels = Array.from(
      new Set([
        ...(assetToEdit.ipAllocations ?? [])
          .map((item) => item.nodeLabel?.trim())
          .filter(Boolean),
        ...(assetToEdit.credentials ?? [])
          .map((item) => item.nodeLabel?.trim())
          .filter(Boolean),
      ] as string[]),
    );
    setAssetMode(existingNodeLabels.length > 0 ? "multi" : "single");
    setNodeLabels(existingNodeLabels);

    const nextHardwareSpecs = createEmptyHardwareSpecifications();
    const nextMetadataExtras: Record<string, unknown> = {};
    const metadata = assetToEdit.customMetadata ?? {};
    const storedSpecifications = metadata.hardwareSpecifications;
    if (
      storedSpecifications &&
      typeof storedSpecifications === "object" &&
      !Array.isArray(storedSpecifications)
    ) {
      HARDWARE_SPEC_GROUPS.forEach((group) => {
        const storedGroup = (storedSpecifications as Record<string, unknown>)[
          group.key
        ];
        if (
          !storedGroup ||
          typeof storedGroup !== "object" ||
          Array.isArray(storedGroup)
        )
          return;
        group.fields.forEach(({ key }) => {
          const value = (storedGroup as Record<string, unknown>)[key];
          if (value !== null && value !== undefined)
            nextHardwareSpecs[group.key][key] = String(value);
        });
      });
    }
    Object.entries(metadata).forEach(([key, value]) => {
      if (key === "hardwareSpecifications") return;
      const normalizedKey = normalizeSpecKey(key);
      const legacyGroup = HARDWARE_SPEC_GROUPS.find(
        (group) => normalizeSpecKey(group.key) === normalizedKey,
      );
      if (
        legacyGroup &&
        (typeof value === "string" || typeof value === "number")
      ) {
        nextHardwareSpecs[legacyGroup.key].configuration = String(value);
      } else if (
        normalizedKey === "total_capacity" &&
        (typeof value === "string" || typeof value === "number")
      ) {
        nextHardwareSpecs.disk.rawCapacity = String(value);
      } else {
        nextMetadataExtras[key] = value;
      }
    });
    setHardwareSpecs(nextHardwareSpecs);
    setMetadataExtras(nextMetadataExtras);
    setComponentIds(
      assetToEdit.componentLinks?.map((link) => link.componentId) ?? [],
    );
  }, [assetToEdit, open]);

  useEffect(() => {
    if (!open) return;
    api
      .get<
        Array<{
          id: string;
          name: string;
          environments: Array<{
            name: string;
            components: Array<{ id: string; name: string }>;
          }>;
        }>
      >("/applications")
      .then(({ data }) =>
        setAvailableComponents(
          data.flatMap((app) =>
            app.environments.flatMap((env) =>
              env.components.map((component) => ({
                id: component.id,
                label: `${app.name} · ${env.name} · ${component.name}`,
              })),
            ),
          ),
        ),
      )
      .catch(() => setAvailableComponents([]));
  }, [open]);

  useEffect(() => {
    if (assetMode === "single") {
      setAccessPoints((current) =>
        current.map((item) => ({ ...item, nodeLabel: "" })),
      );
    } else if (assetMode === "multi" && nodeLabels.length === 0) {
      setNodeLabels(["Node A"]);
      setAccessPoints((current) =>
        current.map((item, index) => ({
          ...item,
          nodeLabel: item.nodeLabel || (index === 0 ? "Node A" : ""),
        })),
      );
    }
  }, [assetMode, nodeLabels.length]);

  const updateAccessPoint = (
    index: number,
    field: keyof Omit<AccessPointFormValue, "users">,
    value: string,
  ) => {
    setAccessPoints((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateAccessUser = (
    accessIndex: number,
    userIndex: number,
    field: keyof AccessUserFormValue,
    value: string,
  ) => {
    setAccessPoints((current) =>
      current.map((item, itemIndex) =>
        itemIndex === accessIndex
          ? {
              ...item,
              users: item.users.map((user, currentUserIndex) =>
                currentUserIndex === userIndex
                  ? { ...user, [field]: value }
                  : user,
              ),
            }
          : item,
      ),
    );
  };

  const updateHardwareSpec = (
    groupKey: string,
    fieldKey: string,
    value: string,
  ) => {
    setHardwareSpecs((current) => ({
      ...current,
      [groupKey]: { ...current[groupKey], [fieldKey]: value },
    }));
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  const validateField = (fieldName: string) => {
    setFormErrors((prev) => {
      const newErrors = { ...prev };

      if (fieldName === "name") {
        if (!formData.name.trim()) {
          newErrors.name = "Asset name is required";
        } else if (formData.name.length < 3) {
          newErrors.name = "Asset name must be at least 3 characters";
        } else {
          delete newErrors.name;
        }
      }

      if (fieldName === "assetId") {
        if (formData.assetId && !/^[A-Z0-9_-]+$/i.test(formData.assetId)) {
          newErrors.assetId =
            "Asset ID must be alphanumeric (letters, numbers, hyphens, underscores)";
        } else {
          delete newErrors.assetId;
        }
      }

      if (fieldName === "sn") {
        if (formData.sn && formData.sn.length > 50) {
          newErrors.sn = "Serial number must be less than 50 characters";
        } else {
          delete newErrors.sn;
        }
      }

      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Validate required fields
    if (!formData.name.trim()) {
      errors.name = "Asset name is required";
    } else if (formData.name.length < 3) {
      errors.name = "Asset name must be at least 3 characters";
    }

    // Validate Asset ID format
    if (formData.assetId && !/^[A-Z0-9_-]+$/i.test(formData.assetId)) {
      errors.assetId = "Asset ID must be alphanumeric";
    }

    // Validate Serial Number length
    if (formData.sn && formData.sn.length > 50) {
      errors.sn = "Serial number must be less than 50 characters";
    }

    // Validate IP addresses format
    const ipErrors: Record<number, { address?: string }> = {};
    accessPoints.forEach((point, index) => {
      if (point.address.trim()) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(point.address.trim())) {
          ipErrors[index] = { address: "Invalid IP address format" };
        } else {
          // Validate each octet is 0-255
          const octets = point.address.trim().split(".").map(Number);
          if (octets.some((octet) => octet < 0 || octet > 255)) {
            ipErrors[index] = {
              address: "Each octet must be between 0 and 255",
            };
          }
        }
      }
    });

    if (Object.keys(ipErrors).length > 0) {
      errors.accessPoints = ipErrors as Record<number, { address?: string }>;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Validate all fields
    setTouchedFields({
      name: true,
      assetId: true,
      rack: true,
      location: true,
      brandModel: true,
      sn: true,
    });

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const customMetadata: Record<string, unknown> = { ...metadataExtras };
      if (hasHardwareSpecifications(hardwareSpecs)) {
        customMetadata.hardwareSpecifications = hardwareSpecs;
      } else {
        delete customMetadata.hardwareSpecifications;
      }

      const credentialIds = new Set(
        accessPoints.flatMap((item) =>
          item.users
            .filter((user) => user.username.trim())
            .map((user) => user.id)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      const finalIps = accessPoints
        .filter((item) => item.address.trim())
        .map((item) => ({
          address: item.address.trim(),
          type: item.type.trim() || undefined,
          nodeLabel:
            assetMode === "multi"
              ? item.nodeLabel.trim() || undefined
              : undefined,
          manageType: item.manageType.trim() || undefined,
          version: item.version.trim() || undefined,
          credentialId:
            item.credentialId && credentialIds.has(item.credentialId)
              ? item.credentialId
              : undefined,
        }));

      const finalCredentials = accessPoints.flatMap((item) =>
        item.users
          .filter((user) => user.username.trim())
          .map((user) => ({
            id: user.id,
            username: user.username.trim(),
            password: user.password,
            type: item.type.trim() || undefined,
            nodeLabel:
              assetMode === "multi"
                ? item.nodeLabel.trim() || undefined
                : undefined,
            manageType: item.manageType.trim() || undefined,
            version: item.version.trim() || undefined,
          })),
      );

      const { environment: _env, ...cleanedFormData } = formData;
      const payload = {
        ...cleanedFormData,
        assetId: formData.assetId.trim() || undefined,
        rack: formData.rack.trim() || undefined,
        location: formData.location.trim() || undefined,
        brandModel: formData.brandModel.trim() || undefined,
        sn: formData.sn.trim() || undefined,
        parentId: formData.parentId ? formData.parentId : null,
        status: formData.status || undefined,
        environment: formData.environment || undefined,
        owner: formData.owner?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        vendor: formData.vendor?.trim() || undefined,
        purchaseDate: formData.purchaseDate
          ? new Date(formData.purchaseDate)
          : undefined,
        warrantyExpiration: formData.warrantyExpiration
          ? new Date(formData.warrantyExpiration)
          : undefined,
        dependencies: formData.dependencies?.trim() || undefined,
        osVersion: formData.osVersion?.trim() || undefined,
        ips: finalIps,
        credentials: finalCredentials,
        customMetadata:
          Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
        componentIds,
      };

      if (assetToEdit) {
        await api.patch(`/assets/${assetToEdit.id}`, payload);
        toast.success("Asset updated successfully");
      } else {
        await api.post("/assets", payload);
        toast.success("Asset created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      // Silent error handler
      const errRes = error?.response?.data;
      let message = "Failed to save asset";
      if (errRes?.message) {
        message = Array.isArray(errRes.message)
          ? errRes.message.join(", ")
          : errRes.message;
      } else if (errRes?.error) {
        message = errRes.error;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const addNodeLabel = () => {
    const nextLabel = `Node ${String.fromCharCode(65 + nodeLabels.length)}`;
    setNodeLabels((current) => [...current, nextLabel]);
  };

  const removeNodeLabel = (indexToRemove: number) => {
    const labelToRemove = nodeLabels[indexToRemove];
    if (!labelToRemove) {
      return;
    }

    setNodeLabels((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
    setAccessPoints((current) => {
      const remaining = current.filter(
        (item) => item.nodeLabel !== labelToRemove,
      );
      return remaining.length > 0 ? remaining : [createEmptyAccessPoint()];
    });
  };

  const renameNodeLabel = (indexToRename: number, nextLabel: string) => {
    const previousLabel = nodeLabels[indexToRename];
    if (!previousLabel) {
      return;
    }

    const sanitized = nextLabel.replace(/^\s+/, "");
    const duplicateIndex = nodeLabels.findIndex(
      (label, index) =>
        index !== indexToRename &&
        label.toLowerCase() === sanitized.trim().toLowerCase(),
    );

    if (!sanitized || duplicateIndex !== -1) {
      return;
    }

    setNodeLabels((current) =>
      current.map((label, index) =>
        index === indexToRename ? sanitized : label,
      ),
    );
    setAccessPoints((current) =>
      current.map((item) =>
        item.nodeLabel === previousLabel
          ? { ...item, nodeLabel: sanitized }
          : item,
      ),
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : requestClose()
      }
    >
      <DialogContent
        key={assetToEdit?.id ?? "new-asset"}
        className="max-h-[92vh] overflow-y-auto bg-card border-border p-0 sm:max-w-4xl rounded-xl shadow-2xl"
      >
        <DialogHeader className="border-b border-border px-6 py-5 bg-muted">
          <DialogTitle className="flex items-center gap-3 text-lg font-display">
            <span className="icon-chip flex items-center justify-center h-8 w-8 p-0 text-muted-foreground">
              <HardDrive className="h-4 w-4" />
            </span>
            <span>
              {assetToEdit ? "Edit Asset Information" : "Add New Asset"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {assetToEdit
              ? "Update the details and specifications for this hardware asset."
              : "Register a new hardware or infrastructure component in the inventory."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="space-y-5 px-5 py-5 pt-0"
        >
          <section className="muted-panel p-4">
            <div className="flex items-center gap-2 border-b border-border/70 pb-3 mb-4">
              <p className="workspace-subtle">Asset Properties</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="asset-name" required>
                  Asset Name / Hostname
                </Label>
                <Input
                  id="asset-name"
                  required
                  autoComplete="off"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  onBlur={() => handleFieldBlur("name")}
                  placeholder="Enter asset or host name"
                  className={
                    formErrors.name && touchedFields.name
                      ? "border-destructive focus-visible:ring-destructive"
                      : undefined
                  }
                />
                {formErrors.name && touchedFields.name && (
                  <p className="text-[11px] text-destructive">
                    {formErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-type" required>
                  Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as AssetType })
                  }
                >
                  <SelectTrigger id="asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asset-id" optional>
                  Asset ID
                </Label>
                <Input
                  id="asset-id"
                  autoComplete="off"
                  value={formData.assetId}
                  onChange={(event) =>
                    setFormData({ ...formData, assetId: event.target.value })
                  }
                  onBlur={() => handleFieldBlur("assetId")}
                  placeholder="Ref ID"
                  className={
                    formErrors.assetId && touchedFields.assetId
                      ? "border-destructive focus-visible:ring-destructive"
                      : undefined
                  }
                />
                {formErrors.assetId && touchedFields.assetId && (
                  <p className="text-[11px] text-destructive">
                    {formErrors.assetId}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 ">
                <Label htmlFor="asset-brand" optional>
                  Brand / Model
                </Label>
                <Input
                  id="asset-brand"
                  autoComplete="off"
                  value={formData.brandModel}
                  onChange={(event) =>
                    setFormData({ ...formData, brandModel: event.target.value })
                  }
                  placeholder="e.g. Dell PowerEdge R740"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-sn" optional>
                  Serial Number
                </Label>
                <Input
                  id="asset-sn"
                  autoComplete="off"
                  value={formData.sn}
                  onChange={(event) =>
                    setFormData({ ...formData, sn: event.target.value })
                  }
                  onBlur={() => handleFieldBlur("sn")}
                  placeholder="S/N Number"
                  className={
                    formErrors.sn && touchedFields.sn
                      ? "border-destructive focus-visible:ring-destructive"
                      : undefined
                  }
                />
                {formErrors.sn && touchedFields.sn && (
                  <p className="text-[11px] text-destructive">
                    {formErrors.sn}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asset-location" optional>
                  Location
                </Label>
                <Input
                  id="asset-location"
                  autoComplete="off"
                  value={formData.location}
                  onChange={(event) =>
                    setFormData({ ...formData, location: event.target.value })
                  }
                  placeholder="e.g. Data Center 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-rack" optional>
                  Rack
                </Label>
                <Input
                  id="asset-rack"
                  autoComplete="off"
                  value={formData.rack}
                  onChange={(event) =>
                    setFormData({ ...formData, rack: event.target.value })
                  }
                  placeholder="e.g. Rack A1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-status">Status</Label>
                <Select
                  value={formData.status || "ACTIVE"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="asset-status" className="bg-card/50">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">
                      Under MA (อยู่ในสัญญา MA)
                    </SelectItem>
                    <SelectItem value="INACTIVE">
                      MA Expired (หมดสัญญา MA)
                    </SelectItem>
                    <SelectItem value="MAINTENANCE">
                      Under Maintenance (อยู่ระหว่างซ่อมบำรุง)
                    </SelectItem>
                    <SelectItem value="DECOMMISSIONED">
                      Decommissioned (จำหน่ายออก/เลิกใช้งาน)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-environment">Environment (Env)</Label>
                <Select
                  value={formData.environment || "DEV"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, environment: value })
                  }
                >
                  <SelectTrigger id="asset-environment" className="bg-card/50">
                    <SelectValue placeholder="Select env" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROD">PROD</SelectItem>
                    <SelectItem value="UAT">UAT</SelectItem>
                    <SelectItem value="DEV">DEV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-parent" optional>
                  Parent Asset
                </Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      parentId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger id="asset-parent" className="bg-card/50">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Select parent" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Standalone)</SelectItem>
                    {availableParents
                      .filter((p) => p.id !== assetToEdit?.id)
                      .map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold">
                              {parent.type}
                            </span>
                            <span>{parent.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asset-purchase-date" optional>
                  Purchase Date
                </Label>
                <Input
                  id="asset-purchase-date"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      purchaseDate: event.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asset-warranty" optional>
                  Warranty Expiration
                </Label>
                <Input
                  id="asset-warranty"
                  type="date"
                  value={formData.warrantyExpiration}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      warrantyExpiration: event.target.value,
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="muted-panel space-y-3 p-4">
            <div>
              <p className="workspace-subtle">Application Components</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Link this asset to the applications it supports.
              </p>
            </div>
            <select
              aria-label="Application components"
              multiple
              value={componentIds}
              onChange={(event) =>
                setComponentIds(
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
              className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {availableComponents.map((component) => (
                <option key={component.id} value={component.id}>
                  {component.label}
                </option>
              ))}
            </select>
          </section>

          <section className="muted-panel p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <p className="workspace-subtle">Access Points</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define IP addresses and credentials for each component
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={assetMode}
                  onValueChange={(value) =>
                    setAssetMode(value as "single" | "multi")
                  }
                >
                  <SelectTrigger className="h-8 w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Asset</SelectItem>
                    <SelectItem value="multi">Multi-Node Asset</SelectItem>
                  </SelectContent>
                </Select>
                {assetMode === "multi" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNodeLabel}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Node
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setAccessPoints((current) => [
                      ...current,
                      {
                        ...createEmptyAccessPoint(),
                        nodeLabel:
                          assetMode === "multi"
                            ? nodeLabels[0] || "Node A"
                            : "",
                      },
                    ])
                  }
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Row
                </Button>
              </div>
            </div>

            {assetMode === "multi" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {nodeLabels.map((label, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-card/70 px-2 py-1.5"
                  >
                    <Input
                      value={label}
                      onChange={(event) =>
                        renameNodeLabel(index, event.target.value)
                      }
                      className="h-6 min-w-[88px] border-0 bg-transparent px-1 text-[11px] font-medium text-foreground shadow-none focus-visible:ring-0"
                      aria-label="Node name"
                    />
                    {nodeLabels.length > 1 && (
                      <button
                        type="button"
                        className="rounded-xl p-1 text-muted-foreground transition hover:bg-background hover:text-foreground"
                        onClick={() => removeNodeLabel(index)}
                        aria-label={`Remove ${label}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {accessPoints.map((point, index) => (
                <div
                  key={`${point.type}-${index}`}
                  className="rounded-[24px] border border-border/70 bg-card/72 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Entry {index + 1}
                    </div>
                    {accessPoints.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setAccessPoints((current) =>
                            current.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div
                    className={`grid gap-2 items-start ${assetMode === "multi" ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-4"}`}
                  >
                    {assetMode === "multi" && (
                      <div className="space-y-1.5">
                        <Label optional className="whitespace-nowrap">
                          Node
                        </Label>
                        <Select
                          value={point.nodeLabel || undefined}
                          onValueChange={(value) =>
                            updateAccessPoint(index, "nodeLabel", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a node" />
                          </SelectTrigger>
                          <SelectContent>
                            {nodeLabels.map((label) => (
                              <SelectItem key={label} value={label}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label optional className="whitespace-nowrap">
                        Type
                      </Label>
                      <Select
                        value={point.type || undefined}
                        onValueChange={(value) =>
                          updateAccessPoint(index, "type", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(accessTypeOptions, point.type).map(
                            (option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label optional className="whitespace-nowrap">
                        Method
                      </Label>
                      <Select
                        value={point.manageType || undefined}
                        onValueChange={(value) =>
                          updateAccessPoint(index, "manageType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(
                            manageTypeOptions,
                            point.manageType,
                          ).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label optional className="whitespace-nowrap">
                        IP Address
                      </Label>
                      <Input
                        autoComplete="off"
                        value={point.address}
                        onChange={(event) =>
                          updateAccessPoint(
                            index,
                            "address",
                            event.target.value,
                          )
                        }
                        placeholder="IP address"
                        className={
                          formErrors.accessPoints?.[index]?.address
                            ? "border-destructive focus-visible:ring-destructive"
                            : undefined
                        }
                      />
                      {formErrors.accessPoints?.[index]?.address && (
                        <p className="text-[11px] text-destructive">
                          {formErrors.accessPoints[index].address}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label optional className="whitespace-nowrap">
                        Version
                      </Label>
                      <Input
                        autoComplete="off"
                        value={point.version}
                        onChange={(event) =>
                          updateAccessPoint(
                            index,
                            "version",
                            event.target.value,
                          )
                        }
                        placeholder="Version or firmware"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-[22px] border border-border/70 bg-background/60 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        User accounts
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() =>
                          setAccessPoints((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    users: [...item.users, createEmptyUser()],
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add User
                      </Button>
                    </div>

                    <div className="mb-3 max-w-md space-y-1.5">
                      <Label optional>Credential linked to this IP</Label>
                      <Select
                        value={point.credentialId ?? "none"}
                        onValueChange={(value) =>
                          setAccessPoints((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    credentialId:
                                      value === "none" ? undefined : value,
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a linked account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No linked credential
                          </SelectItem>
                          {point.users
                            .filter((user) => user.id && user.username.trim())
                            .map((user) => (
                              <SelectItem
                                key={user.id}
                                value={user.id as string}
                              >
                                {user.username}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Link one account to this address. Other accounts remain
                        available on the access point.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {point.users.map((user, userIndex) => (
                        <div
                          key={`${index}-${userIndex}`}
                          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                        >
                          <Input
                            autoComplete="off"
                            value={user.username}
                            onChange={(event) =>
                              updateAccessUser(
                                index,
                                userIndex,
                                "username",
                                event.target.value,
                              )
                            }
                            placeholder="Username"
                          />
                          <div className="relative">
                            <Input
                              type={
                                showPasswords[`${index}-${userIndex}`]
                                  ? "text"
                                  : "password"
                              }
                              autoComplete="new-password"
                              value={user.password}
                              onChange={(event) =>
                                updateAccessUser(
                                  index,
                                  userIndex,
                                  "password",
                                  event.target.value,
                                )
                              }
                              placeholder="Password"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowPasswords((prev) => ({
                                  ...prev,
                                  [`${index}-${userIndex}`]:
                                    !prev[`${index}-${userIndex}`],
                                }))
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPasswords[`${index}-${userIndex}`] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              setAccessPoints((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        users:
                                          item.users.length > 1
                                            ? item.users.filter(
                                                (_, currentUserIndex) =>
                                                  currentUserIndex !==
                                                  userIndex,
                                              )
                                            : [createEmptyUser()],
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="muted-panel p-4">
            <div className="border-b border-border/70 pb-3">
              <div className="mb-3">
                <p className="workspace-subtle">Hardware Specifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter hardware details using the standard fields below.
                </p>
              </div>
              <div className="hidden">
                <p className="workspace-subtle">Hardware Specifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  กรอกข้อมูลสเปคโดยตรง ไม่ต้องสร้างชื่อรายการเอง
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {HARDWARE_SPEC_GROUPS.map((group) => (
                <fieldset
                  key={group.key}
                  className="rounded-xl border border-border/70 bg-card/70 p-3"
                >
                  <legend className="px-1 text-xs font-bold text-foreground">
                    {group.label}
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.fields.map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1.5">
                        <Label
                          htmlFor={`asset-spec-${group.key}-${key}`}
                          className="text-xs font-semibold"
                        >
                          {label}
                        </Label>
                        <Input
                          id={`asset-spec-${group.key}-${key}`}
                          autoComplete="off"
                          value={hardwareSpecs[group.key]?.[key] ?? ""}
                          onChange={(event) =>
                            updateHardwareSpec(
                              group.key,
                              key,
                              event.target.value,
                            )
                          }
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : assetToEdit ? (
                "Save Changes"
              ) : (
                "Create Asset"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
