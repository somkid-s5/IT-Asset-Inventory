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
import { MultiCheckbox } from "@/components/ui/multi-checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronsUpDown,
  Database,
  Eye,
  EyeOff,
  FolderTree,
  HardDrive,
  LoaderCircle,
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
  /** @deprecated legacy compatibility */
  credentialId?: string | null;
  credentialIds?: string[];
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
  responsibleParty?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyExpiration?: string | null;
  environment?: string | null;
  dependencies?: string | null;
  osVersion?: string | null;
  customMetadata?: Record<string, unknown> | null;
  ipAllocations?: AssetIpAllocation[];
  credentials?: AssetCredential[];
  componentLinks?: Array<{
    componentId: string;
    relationType?: string | null;
    responsibleParty?: string | null;
  }>;
  parent?: ParentAssetOption | null;
}

interface ParentAssetOption {
  id: string;
  assetId?: string | null;
  name: string;
  type: string;
  location?: string | null;
  parentId?: string | null;
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetToEdit?: AssetFormAsset;
  onSuccess: () => void;
}

function createEmptyUser(): AccessUserFormValue {
  return { id: crypto.randomUUID(), username: "", password: "" };
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
  responsibleParty: "",
  vendor: "",
  purchaseDate: "",
  warrantyExpiration: "",
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
}: AssetFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [accessPoints, setAccessPoints] = useState<AccessPointFormValue[]>([
    createEmptyAccessPoint(),
  ]);
  const [detachedCredentials, setDetachedCredentials] = useState<
    AssetCredential[]
  >([]);
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
  const [primaryComponentId, setPrimaryComponentId] = useState("");
  const [sharedComponentIds, setSharedComponentIds] = useState<string[]>([]);
  const [availableComponents, setAvailableComponents] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<ParentAssetOption[]>([]);
  const [parentLookupLoading, setParentLookupLoading] = useState(false);
  const [parentLookupError, setParentLookupError] = useState<string | null>(
    null,
  );
  const [parentLookupRevision, setParentLookupRevision] = useState(0);
  const { confirmDiscard } = useUnsavedChanges(open, {
    formData,
    accessPoints,
    hardwareSpecs,
    metadataExtras,
    assetMode,
    primaryComponentId,
    sharedComponentIds,
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
      setDetachedCredentials([]);
      setHardwareSpecs(createEmptyHardwareSpecifications());
      setMetadataExtras({});
      setAssetMode("single");
      setNodeLabels([]);
      setFormErrors({});
      setTouchedFields({});
      setPrimaryComponentId("");
      setSharedComponentIds([]);
      return;
    }

    const groupedMap = new Map<string, AccessPointFormValue>();
    const credentialById = new Map(
      (assetToEdit.credentials ?? [])
        .filter((credential): credential is AssetCredential & { id: string } =>
          Boolean(credential.id),
        )
        .map((credential) => [credential.id, credential]),
    );
    const linkedCredentialIds = new Set<string>();
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
      const explicitCredentialIds = [
        ...(ip.credentialIds ?? []),
        ...(ip.credentialId ? [ip.credentialId] : []),
      ].filter(
        (id, credentialIndex, ids) => ids.indexOf(id) === credentialIndex,
      );
      const users = explicitCredentialIds.flatMap((credentialId) => {
        linkedCredentialIds.add(credentialId);
        const credential = credentialById.get(credentialId);
        return credential
          ? [
              {
                id: credential.id,
                username: credential.username,
                password: credential.password ?? "",
              },
            ]
          : [];
      });

      groupedMap.set(key, {
        nodeLabel: ip.nodeLabel ?? "",
        type: ip.type ?? "",
        manageType: ip.manageType ?? assetToEdit.manageType ?? "",
        version: ip.version ?? "",
        address: ip.address,
        users: users.length > 0 ? users : [createEmptyUser()],
      });
    });

    setDetachedCredentials(
      (assetToEdit.credentials ?? []).filter(
        (credential) =>
          !credential.id || !linkedCredentialIds.has(credential.id),
      ),
    );

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
      responsibleParty: assetToEdit.responsibleParty || "",
      vendor: assetToEdit.vendor || "",
      purchaseDate: assetToEdit.purchaseDate
        ? new Date(assetToEdit.purchaseDate).toISOString().split("T")[0]
        : "",
      warrantyExpiration: assetToEdit.warrantyExpiration
        ? new Date(assetToEdit.warrantyExpiration).toISOString().split("T")[0]
        : "",
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
      new Set(
        (assetToEdit.ipAllocations ?? [])
          .map((item) => item.nodeLabel?.trim())
          .filter(Boolean) as string[],
      ),
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
    const existingPrimaryLink = assetToEdit.componentLinks?.find(
      (link) => (link.relationType || "PRIMARY").toUpperCase() === "PRIMARY",
    );
    setPrimaryComponentId(existingPrimaryLink?.componentId ?? "");
    setSharedComponentIds(
      assetToEdit.componentLinks
        ?.filter(
          (link) => link.componentId !== existingPrimaryLink?.componentId,
        )
        .map((link) => link.componentId) ?? [],
    );
  }, [assetToEdit, open]);

  useEffect(() => {
    if (!open) return;
    setParentSearch("");
    setParentPickerOpen(false);
    setParentLookupError(null);
  }, [assetToEdit?.id, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setParentLookupLoading(true);
      setParentLookupError(null);
      try {
        const response = await api.get<ParentAssetOption[]>("/assets/lookup", {
          params: {
            q: parentSearch.trim() || undefined,
            limit: 25,
            excludeId: assetToEdit?.id || undefined,
          },
        });
        if (!cancelled) setParentOptions(response.data);
      } catch (error: unknown) {
        if (!cancelled) {
          setParentOptions([]);
          setParentLookupError(
            error instanceof Error
              ? error.message
              : "Unable to load parent assets",
          );
        }
      } finally {
        if (!cancelled) setParentLookupLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [assetToEdit?.id, open, parentLookupRevision, parentSearch]);

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
          credentialIds: item.users
            .filter((user) => user.username.trim() && user.id)
            .map((user) => user.id as string),
        }));

      const credentialMap = new Map<
        string,
        {
          id: string;
          username: string;
          password: string;
          type?: string;
          nodeLabel?: string;
          manageType?: string;
          version?: string;
        }
      >();
      accessPoints.forEach((item) => {
        item.users
          .filter((user) => user.username.trim() && user.id)
          .forEach((user) => {
            const id = user.id as string;
            if (credentialMap.has(id)) return;
            credentialMap.set(id, {
              id,
              username: user.username.trim(),
              password: user.password,
              type: item.type.trim() || undefined,
              nodeLabel:
                assetMode === "multi"
                  ? item.nodeLabel.trim() || undefined
                  : undefined,
              manageType: item.manageType.trim() || undefined,
              version: item.version.trim() || undefined,
            });
          });
      });
      detachedCredentials.forEach((credential) => {
        if (
          !credential.id ||
          !credential.username.trim() ||
          credentialMap.has(credential.id)
        ) {
          return;
        }
        credentialMap.set(credential.id, {
          id: credential.id,
          username: credential.username.trim(),
          password: credential.password ?? "",
          type: credential.type ?? undefined,
          nodeLabel: credential.nodeLabel ?? undefined,
          manageType: credential.manageType ?? undefined,
          version: credential.version ?? undefined,
        });
      });
      const finalCredentials = [...credentialMap.values()];

      const payload = {
        ...formData,
        assetId: formData.assetId.trim() || undefined,
        rack: formData.rack.trim() || undefined,
        location: formData.location.trim() || undefined,
        brandModel: formData.brandModel.trim() || undefined,
        sn: formData.sn.trim() || undefined,
        parentId: formData.parentId ? formData.parentId : null,
        status: formData.status || undefined,
        owner: formData.owner?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        responsibleParty: formData.responsibleParty?.trim() || undefined,
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
        componentLinks: [
          ...(primaryComponentId
            ? [{ componentId: primaryComponentId, relationType: "PRIMARY" }]
            : []),
          ...sharedComponentIds
            .filter((componentId) => componentId !== primaryComponentId)
            .map((componentId) => ({
              componentId,
              relationType: "SHARED",
            })),
        ],
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

  const selectedParent = formData.parentId
    ? (parentOptions.find((parent) => parent.id === formData.parentId) ??
      (assetToEdit?.parent?.id === formData.parentId
        ? assetToEdit.parent
        : undefined))
    : undefined;

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
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="DECOMMISSIONED">
                      Decommissioned
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label optional>Parent Asset</Label>
                <Popover
                  open={parentPickerOpen}
                  onOpenChange={setParentPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-label="Parent Asset"
                      aria-expanded={parentPickerOpen}
                      className="w-full justify-between bg-card/50 font-normal"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FolderTree className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {selectedParent
                            ? `${selectedParent.name}${selectedParent.assetId ? ` · ${selectedParent.assetId}` : ""}`
                            : "No Parent (Standalone)"}
                        </span>
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        aria-label="Search parent assets"
                        placeholder="Search name or Asset ID..."
                        value={parentSearch}
                        onValueChange={setParentSearch}
                      />
                      <CommandList>
                        <CommandItem
                          value="standalone"
                          onSelect={() => {
                            setFormData({ ...formData, parentId: "" });
                            setParentPickerOpen(false);
                          }}
                        >
                          <Check
                            className={`h-4 w-4 ${formData.parentId ? "opacity-0" : "opacity-100"}`}
                          />
                          <span>No Parent (Standalone)</span>
                        </CommandItem>

                        {parentLookupLoading ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Searching parent assets...
                          </div>
                        ) : parentLookupError ? (
                          <div className="space-y-2 px-3 py-4 text-xs">
                            <p className="text-destructive">
                              Unable to load parent assets.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                setParentLookupRevision((value) => value + 1)
                              }
                            >
                              Retry
                            </Button>
                          </div>
                        ) : parentOptions.length === 0 ? (
                          <CommandEmpty>
                            No matching parent assets.
                          </CommandEmpty>
                        ) : (
                          parentOptions.map((parent) => (
                            <CommandItem
                              key={parent.id}
                              value={`${parent.name} ${parent.assetId ?? ""}`}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  parentId: parent.id,
                                });
                                setParentPickerOpen(false);
                              }}
                            >
                              <Check
                                className={`h-4 w-4 ${formData.parentId === parent.id ? "opacity-100" : "opacity-0"}`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-medium">
                                    {parent.name}
                                  </span>
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                                    {parent.type}
                                  </span>
                                </div>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {[parent.assetId, parent.location]
                                    .filter(Boolean)
                                    .join(" · ") || "No additional identifier"}
                                </p>
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

          <section className="muted-panel p-4">
            <div className="flex items-center gap-2 border-b border-border/70 pb-3 mb-4">
              <p className="workspace-subtle">Governance Context</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="asset-owner" optional>
                  Owner
                </Label>
                <Input
                  id="asset-owner"
                  autoComplete="off"
                  value={formData.owner}
                  onChange={(event) =>
                    setFormData({ ...formData, owner: event.target.value })
                  }
                  placeholder="Person or team owning this asset"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-department" optional>
                  Department
                </Label>
                <Input
                  id="asset-department"
                  autoComplete="off"
                  value={formData.department}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      department: event.target.value,
                    })
                  }
                  placeholder="Owning department"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-responsible-party" optional>
                  Responsible Party
                </Label>
                <Input
                  id="asset-responsible-party"
                  autoComplete="off"
                  value={formData.responsibleParty}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      responsibleParty: event.target.value,
                    })
                  }
                  placeholder="Operationally responsible person or team"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-vendor" optional>
                  Vendor
                </Label>
                <Input
                  id="asset-vendor"
                  autoComplete="off"
                  value={formData.vendor}
                  onChange={(event) =>
                    setFormData({ ...formData, vendor: event.target.value })
                  }
                  placeholder="Supplier or vendor"
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="asset-primary-component" optional>
                  Primary Application Component
                </Label>
                <Select
                  value={primaryComponentId || "none"}
                  onValueChange={(value) => {
                    const nextPrimary = value === "none" ? "" : value;
                    setPrimaryComponentId(nextPrimary);
                    if (nextPrimary) {
                      setSharedComponentIds((current) =>
                        current.filter(
                          (componentId) => componentId !== nextPrimary,
                        ),
                      );
                    }
                  }}
                >
                  <SelectTrigger id="asset-primary-component">
                    <SelectValue placeholder="Select primary component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No primary component</SelectItem>
                    {availableComponents.map((component) => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  The main Application/Environment/Component this asset serves.
                </p>
              </div>

              <MultiCheckbox
                label="Shared application components"
                options={availableComponents.filter(
                  (component) => component.id !== primaryComponentId,
                )}
                value={sharedComponentIds}
                onChange={setSharedComponentIds}
              />
            </div>
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
                  data-testid={`asset-access-point-${index + 1}`}
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
                        <SelectTrigger
                          aria-label={`Access point ${index + 1} type`}
                        >
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
                        <SelectTrigger
                          aria-label={`Access point ${index + 1} method`}
                        >
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
                        aria-label={`Access point ${index + 1} IP address`}
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
                        aria-label={`Access point ${index + 1} version`}
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
                        aria-label={`Add user to access point ${index + 1}`}
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

                    <div className="mb-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                      Every account listed below is explicitly linked to this
                      Access Point.
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
                            aria-label={`Access point ${index + 1} username ${userIndex + 1}`}
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
                              aria-label={`Access point ${index + 1} password ${userIndex + 1}`}
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
