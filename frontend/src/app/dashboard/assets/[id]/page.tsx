"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "@/services/api";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Eye,
  EyeOff,
  FolderTree,
  Globe,
  HardDrive,
  ImageIcon,
  LaptopMinimal,
  LoaderCircle,
  MapPin,
  Network,
  Paperclip,
  PenLine,
  Pin,
  PinOff,
  Plus,
  Shield,
  StickyNote,
  Trash2,
  Waypoints,
  Hash,
  Upload,
  Download,
  X,
  Building2,
  History,
  Info,
  Maximize2,
  Type,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type AssetType = "SERVER" | "STORAGE" | "SWITCH" | "SP" | "NETWORK";
type AssetStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED";

interface AssetCredential {
  id: string;
  username: string;
  password?: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
  lastChangedDate?: string | null;
}

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
}

interface NoteAuthor {
  id: string;
  displayName: string;
  avatarSeed: string;
}

interface AssetNote {
  id: string;
  content: string;
  isPinned: boolean;
  createdByUser: NoteAuthor;
  createdAt: string;
  updatedAt: string;
}

interface AssetAttachment {
  id: string;
  filename: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  createdByUser: NoteAuthor;
  createdAt: string;
}

interface Asset {
  id: string;
  assetId?: string | null;
  name: string;
  type: AssetType;
  status?: AssetStatus | null;
  updatedAt?: string;
  ipAllocations?: AssetIpAllocation[];
  rack?: string | null;
  location?: string | null;
  manageType?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  environment?: string | null;
  department?: string | null;
  owner?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyExpiration?: string | null;
  osVersion?: string | null;
  dependencies?: string | null;
  credentials?: AssetCredential[];
  customMetadata?: Record<string, unknown> | null;
  parentId?: string | null;
  parent?: { id: string; name: string; type: AssetType } | null;
  children?: { id: string; name: string; type: AssetType }[];
  notes?: AssetNote[];
  attachments?: AssetAttachment[];
  tickets?: any[];
}

interface AccessRow {
  key: string;
  nodeLabel: string;
  label: string;
  addresses: string[];
  methods: string[];
  version?: string;
  credentials: AssetCredential[];
}

function getAssetStyle(type: AssetType) {
  switch (type) {
    case "SERVER":
      return {
        icon: <HardDrive className="h-6 w-6" />,
        bg: "bg-gradient-to-br from-indigo-500 to-purple-600",
        label: "Server",
      };
    case "STORAGE":
      return {
        icon: <Database className="h-6 w-6" />,
        bg: "bg-gradient-to-br from-cyan-500 to-blue-600",
        label: "Storage",
      };
    case "SWITCH":
      return {
        icon: <Shield className="h-6 w-6" />,
        bg: "bg-gradient-to-br from-amber-500 to-orange-600",
        label: "Switch",
      };
    case "SP":
      return {
        icon: <LaptopMinimal className="h-6 w-6" />,
        bg: "bg-gradient-to-br from-slate-600 to-slate-800",
        label: "Service Processor",
      };
    case "NETWORK":
      return {
        icon: <Network className="h-6 w-6" />,
        bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
        label: "Network",
      };
    default:
      return {
        icon: <Boxes className="h-6 w-6" />,
        bg: "bg-gradient-to-br from-slate-500 to-zinc-600",
        label: "Asset",
      };
  }
}

function extractMethods(...values: Array<string | null | undefined>) {
  const tokens = new Set<string>();
  const sources = values
    .filter(Boolean)
    .join(",")
    .split(/[,\s/|]+/)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  sources.forEach((token) => {
    if (
      ["WEB", "HTTPS", "HTTP", "SSH", "API", "CLI", "SNMP", "CONSOLE"].includes(
        token,
      )
    ) {
      tokens.add(token === "HTTPS" || token === "HTTP" ? "WEB" : token);
    }
  });
  return Array.from(tokens);
}

function getStatusBadge(status?: AssetStatus | null) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Under MA",
        class: "border-success/30 bg-success/10 text-success",
      };
    case "INACTIVE":
      return {
        label: "MA Expired",
        class: "border-destructive/30 bg-destructive/10 text-destructive",
      };
    case "MAINTENANCE":
      return {
        label: "Maintenance",
        class: "border-warning/30 bg-warning/10 text-warning",
      };
    case "RETIRED":
    case "DECOMMISSIONED" as any:
      return {
        label: "Decommissioned",
        class: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
      };
    default:
      return {
        label: "Under MA",
        class: "border-success/30 bg-success/10 text-success",
      };
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getApiBase() {
  if (typeof window !== "undefined") {
    if (process.env.NODE_ENV === "production") {
      return "/api";
    }
    return `${window.location.protocol}//${window.location.hostname}:3001/api`;
  }
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return "http://backend:3001/api";
}

// ─── Attachments & Gallery Section ──────────────────────────────────────────
function AttachmentsSection({
  assetId,
  initialAttachments,
}: {
  assetId: string;
  initialAttachments: AssetAttachment[];
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAlbumAndName = (filename: string) => {
    const match = filename.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return { album: match[1].trim(), displayName: match[2].trim() };
    }
    return { album: "General", displayName: filename };
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");
  const photos = initialAttachments.filter((a) => isImage(a.mimeType));
  const documents = initialAttachments.filter((a) => !isImage(a.mimeType));

  const parsedPhotos = useMemo(() => {
    return photos.map((photo) => {
      const { album, displayName } = parseAlbumAndName(photo.filename);
      return {
        ...photo,
        album,
        displayName,
      };
    });
  }, [photos]);

  const albums = useMemo(() => {
    const set = new Set<string>();
    parsedPhotos.forEach((p) => set.add(p.album));
    return Array.from(set);
  }, [parsedPhotos]);

  const activePhotos = useMemo(() => {
    if (!selectedAlbum) return [];
    return parsedPhotos.filter((p) => p.album === selectedAlbum);
  }, [parsedPhotos, selectedAlbum]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        let finalFile = file;
        const isImg = file.type.startsWith("image/");

        if (isImg) {
          if (showCreateForm && newAlbumName.trim()) {
            const albumPrefix = `[${newAlbumName.trim()}] `;
            finalFile = new File([file], `${albumPrefix}${file.name}`, {
              type: file.type,
            });
          } else if (selectedAlbum) {
            const albumPrefix = `[${selectedAlbum}] `;
            finalFile = new File([file], `${albumPrefix}${file.name}`, {
              type: file.type,
            });
          }
        }

        const formData = new FormData();
        formData.append("file", finalFile);

        return api.post(`/assets/${assetId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      });

      await Promise.all(uploadPromises);
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      toast.success("Files uploaded successfully");

      if (showCreateForm && newAlbumName.trim()) {
        setSelectedAlbum(newAlbumName.trim());
      }
      setNewAlbumName("");
      setShowCreateForm(false);
    } catch {
      toast.error("Failed to upload one or more files");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment?"))
      return;
    try {
      await api.delete(`/assets/${assetId}/attachments/${id}`);
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      toast.success("Attachment deleted");
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  const getUrl = (storedPath: string) =>
    `${getApiBase()}/assets/uploads/${storedPath.split("/").pop()}`;

  const handleDownload = async (attachmentId: string, filename: string) => {
    const downloadPromise = (async () => {
      const response = await api.get(
        `/assets/${assetId}/attachments/${attachmentId}/download`,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    })();

    toast.promise(downloadPromise, {
      loading: `Preparing ${filename}...`,
      success: `Download started for ${filename}!`,
      error: `Failed to download ${filename}`,
    });
  };

  return (
    <div className="space-y-8">
      {/* ── Photos Gallery (LINE Album Style) ── */}
      <section className="space-y-4">
        {selectedAlbum === null ? (
          // MAIN ALBUM GRID VIEW
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight text-foreground text-opacity-90">
                  Hardware Photos
                </h2>
                {photos.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {photos.length}
                  </span>
                )}
              </div>

              {albums.length > 0 &&
                (!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Album
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Album Name"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      className="rounded-xl border border-border/80 bg-background/50 px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary/45 focus:outline-none max-w-[160px] sm:max-w-[200px]"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !newAlbumName.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/95 disabled:opacity-50"
                    >
                      {uploading ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Select Photo
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewAlbumName("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
            </div>

            {albums.length === 0 ? (
              // EMPTY STATE
              <div className="glass-card flex min-h-[220px] flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="rounded-full bg-muted p-4">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                </div>
                {!showCreateForm ? (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">
                        No albums created yet
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-[280px]">
                        Create an album to organize hardware photos by chassis
                        parts or components.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Create Album
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">
                        Create New Album
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Enter a name for the new album and select the first
                        photo.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
                      <input
                        type="text"
                        placeholder="Album Name (e.g. Chassis Front)"
                        value={newAlbumName}
                        onChange={(e) => setNewAlbumName(e.target.value)}
                        className="rounded-xl border border-border/80 bg-background/50 px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary/45 focus:outline-none w-full sm:max-w-[200px]"
                      />
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading || !newAlbumName.trim()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/95 disabled:opacity-50 shrink-0"
                        >
                          {uploading ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Select Photo
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateForm(false);
                            setNewAlbumName("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // ALBUM GRID
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {albums.map((albumName) => {
                  const albumPhotos = parsedPhotos.filter(
                    (p) => p.album === albumName,
                  );
                  const coverPhoto = albumPhotos[0];
                  return (
                    <motion.div
                      key={albumName}
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedAlbum(albumName)}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-sm transition-all hover:border-primary/45 hover:shadow-md"
                    >
                      {coverPhoto ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getUrl(coverPhoto.storedPath)}
                          alt={albumName}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/40">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/45" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity group-hover:from-black/90"></div>

                      <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white">
                        <h3 className="truncate text-xs font-bold tracking-tight text-white/95">
                          {albumName}
                        </h3>
                        <p className="text-[10px] font-medium text-white/70 mt-0.5">
                          {albumPhotos.length}{" "}
                          {albumPhotos.length === 1 ? "photo" : "photos"}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // INNER ALBUM GRID VIEW
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 px-1">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  &lt; Back to Albums
                </button>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-foreground">
                    {selectedAlbum}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {activePhotos.length}
                  </span>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {uploading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add Photo
              </button>
            </div>

            <div
              className={cn(
                "glass-card p-4",
                activePhotos.length === 0 &&
                  "flex min-h-[140px] items-center justify-center",
              )}
            >
              {activePhotos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 text-center text-muted-foreground opacity-60">
                  <div className="rounded-full bg-muted p-3">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-medium">
                    No photos in this album yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {activePhotos.map((photo, idx) => (
                    <motion.div
                      key={photo.id}
                      whileHover={{ y: -2 }}
                      className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getUrl(photo.storedPath)}
                        alt={photo.displayName}
                        onClick={() => setLightboxIndex(idx)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <div className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-medium text-white">
                          {photo.displayName}
                        </div>
                      </div>
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownload(
                              photo.id,
                              photo.displayName || photo.filename,
                            );
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/85"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(photo.id);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-destructive/80 text-white backdrop-blur-sm transition-all hover:bg-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Documents Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold tracking-tight text-foreground text-opacity-90">
              Documents & Files
            </h2>
            {documents.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                {documents.length}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload File
          </button>
        </div>

        <div className="glass-card p-2">
          {documents.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground opacity-60 font-medium italic">
              No additional documents linked
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between p-3 transition-colors hover:bg-muted/30 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Paperclip className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <a
                        href={getUrl(doc.storedPath)}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {doc.filename}
                      </a>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                        <span>{formatFileSize(doc.sizeBytes)}</span>
                        <span>•</span>
                        <span>
                          {doc.mimeType.split("/").pop()?.toUpperCase()}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => void handleDownload(doc.id, doc.filename)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Upload className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      onClick={() => void handleDelete(doc.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && activePhotos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8"
          >
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent text-white z-10">
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight">
                  {activePhotos[lightboxIndex].displayName ||
                    activePhotos[lightboxIndex].filename}
                </span>
                <span className="text-[10px] opacity-70">
                  {formatFileSize(activePhotos[lightboxIndex].sizeBytes)} •{" "}
                  {formatRelativeTime(activePhotos[lightboxIndex].createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    void handleDownload(
                      activePhotos[lightboxIndex].id,
                      activePhotos[lightboxIndex].displayName ||
                        activePhotos[lightboxIndex].filename,
                    )
                  }
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-h-[80vh] w-full flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getUrl(activePhotos[lightboxIndex].storedPath)}
                alt="Full preview"
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl shadow-primary/20 border border-white/10"
              />

              {activePhotos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex - 1 + activePhotos.length) %
                          activePhotos.length,
                      )
                    }
                    className="absolute left-0 sm:-left-12 h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
                  >
                    <ChevronRight className="h-6 w-6 rotate-180" />
                  </button>
                  <button
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex + 1) % activePhotos.length,
                      )
                    }
                    className="absolute right-0 sm:-right-12 h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </motion.div>

            <div className="absolute bottom-8 flex items-center gap-4">
              <a
                href={getUrl(activePhotos[lightboxIndex].storedPath)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
              >
                <Eye className="h-4 w-4" /> Open Original
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
        aria-hidden="true"
        multiple
      />
    </div>
  );
}

// Remove duplicate MarkdownRenderer

// ─── Notes Section ─────────────────────────────────────────────────────────
function NotesSection({
  assetId,
  initialNotes,
}: {
  assetId: string;
  initialNotes: AssetNote[];
}) {
  const queryClient = useQueryClient();
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [fullScreenMode, setFullScreenMode] = useState<"view" | "edit" | null>(
    null,
  );
  const [activeNote, setActiveNote] = useState<AssetNote | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const sortedNotes = useMemo(
    () =>
      [...initialNotes].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }),
    [initialNotes],
  );

  const handleAdd = useCallback(
    async (content?: string) => {
      const finalContent = content || newContent;
      if (!finalContent.trim()) return;
      setSubmitting(true);
      try {
        await api.post(`/assets/${assetId}/notes`, {
          content: finalContent.trim(),
        });
        queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
        setNewContent("");
        toast.success("Note added");
        return true;
      } catch {
        toast.error("Failed to add note");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [assetId, newContent, queryClient],
  );

  const handleEditSave = async (noteId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await api.patch(`/assets/${assetId}/notes/${noteId}`, {
        content: content.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      setEditingId(null);
      toast.success("Note updated");
      return true;
    } catch {
      toast.error("Failed to update note");
      return false;
    }
  };

  const handleTogglePin = async (note: AssetNote) => {
    try {
      await api.patch(`/assets/${assetId}/notes/${note.id}`, {
        isPinned: !note.isPinned,
      });
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await api.delete(`/assets/${assetId}/notes/${noteId}`);
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const insertMarkdown = (
    tag: string,
    textareaId: string,
    isEdit: boolean = false,
  ) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = isEdit ? editContent : newContent;
    const selectedText = text.substring(start, end);

    let replacement = "";
    switch (tag) {
      case "bold":
        replacement = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        replacement = `*${selectedText || "italic text"}*`;
        break;
      case "h2":
        replacement = `\n## ${selectedText || "Heading"}\n`;
        break;
      case "ul":
        replacement = `\n- ${selectedText || "item"}\n`;
        break;
      case "ol":
        replacement = `\n1. ${selectedText || "item"}\n`;
        break;
      case "link":
        replacement = `[${selectedText || "link text"}](url)`;
        break;
      case "quote":
        replacement = `\n> ${selectedText || "quote"}\n`;
        break;
    }

    const newText =
      text.substring(0, start) + replacement + text.substring(end);
    if (isEdit) setEditContent(newText);
    else setNewContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + replacement.length,
        start + replacement.length,
      );
    }, 10);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Notes & Logs
          </h2>
          {initialNotes.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {initialNotes.length}
            </span>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" /> New Log
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-primary" />
                New Operational Log
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex flex-col px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => insertMarkdown("bold", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown("italic", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown("h2", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Type className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-px h-4 bg-border/50 mx-1" />
                  <button
                    onClick={() => insertMarkdown("ul", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown("ol", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown("quote", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown("link", "full-note-input")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex bg-muted/50 p-0.5 rounded-lg">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                      !previewMode
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Write
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={cn(
                      "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                      previewMode
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Preview
                  </button>
                </div>
              </div>
              {previewMode ? (
                <div className="flex-1 overflow-y-auto bg-muted/20 rounded-2xl p-6 border border-border/40">
                  {newContent ? (
                    <MarkdownRenderer
                      content={newContent}
                      className="prose-sm"
                    />
                  ) : (
                    <span className="text-muted-foreground italic text-sm">
                      Nothing to preview...
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  id="full-note-input"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Type your notes here using Markdown..."
                  className="flex-1 w-full resize-none bg-transparent text-sm focus:outline-none leading-relaxed"
                />
              )}
            </div>
            <DialogFooter className="p-4 bg-muted/30 border-t border-border/40 flex items-center justify-between sm:justify-between">
              <span className="text-[10px] text-muted-foreground px-2">
                Supports Markdown (GitHub Flavored)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewContent("")}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={async () => {
                    if (await handleAdd())
                      (
                        document.querySelector(
                          '[data-slot="dialog-close"]',
                        ) as HTMLElement
                      )?.click();
                  }}
                  disabled={!newContent.trim() || submitting}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  {submitting && (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Submit Entry
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => insertMarkdown("bold", "mini-note-input")}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
          >
            <Bold className="h-3 w-3" />
          </button>
          <button
            onClick={() => insertMarkdown("italic", "mini-note-input")}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
          >
            <Italic className="h-3 w-3" />
          </button>
          <button
            onClick={() => insertMarkdown("h2", "mini-note-input")}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
          >
            <Type className="h-3 w-3" />
          </button>
          <button
            onClick={() => insertMarkdown("ul", "mini-note-input")}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
          >
            <List className="h-3 w-3" />
          </button>
        </div>
        <textarea
          id="mini-note-input"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="Add operational notes... (Markdown supported)"
          rows={3}
          className="w-full resize-none rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground italic ml-1">
            Ctrl+Enter to submit
          </span>
          <button
            onClick={() => void handleAdd()}
            disabled={submitting || !newContent.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
          >
            {submitting ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add Note
          </button>
        </div>
      </div>

      {sortedNotes.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/30 px-6 py-10 text-center text-sm text-muted-foreground">
          No records yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note) => (
            <motion.div
              key={note.id}
              layout
              className={cn(
                "group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all",
                note.isPinned
                  ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
                  : "border-border/60 hover:border-border",
              )}
            >
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  {note.isPinned && <Pin className="h-3 w-3 text-primary" />}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-primary text-[10px] font-bold text-primary-foreground uppercase">
                    {note.createdByUser.displayName.charAt(0)}
                  </div>
                  <span className="text-[10px] font-semibold text-foreground/80">
                    {note.createdByUser.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(note.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setActiveNote(note);
                      setFullScreenMode("view");
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => void handleTogglePin(note)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {note.isPinned ? (
                      <PinOff className="h-3 w-3" />
                    ) : (
                      <Pin className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(note.id);
                      setEditContent(note.content);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <PenLine className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => void handleDelete(note.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="px-4 py-3">
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 mb-1">
                      <button
                        onClick={() =>
                          insertMarkdown("bold", `edit-input-${note.id}`, true)
                        }
                        className="p-1 hover:bg-muted rounded text-muted-foreground"
                      >
                        <Bold className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          insertMarkdown(
                            "italic",
                            `edit-input-${note.id}`,
                            true,
                          )
                        }
                        className="p-1 hover:bg-muted rounded text-muted-foreground"
                      >
                        <Italic className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          insertMarkdown("h2", `edit-input-${note.id}`, true)
                        }
                        className="p-1 hover:bg-muted rounded text-muted-foreground"
                      >
                        <Type className="h-3 w-3" />
                      </button>
                    </div>
                    <textarea
                      id={`edit-input-${note.id}`}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={5}
                      autoFocus
                      className="w-full resize-none rounded-xl border border-primary/40 bg-background/80 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          void handleEditSave(note.id, editContent)
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden max-h-[200px] group/note">
                    <MarkdownRenderer
                      content={note.content}
                      className="prose-sm text-xs prose-headings:text-sm prose-headings:font-bold prose-p:my-1 prose-ul:my-0.5 prose-li:my-0.5"
                    />
                    {note.content.split("\n").length > 6 && (
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent flex items-end justify-center pb-2 opacity-0 group-hover/note:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setActiveNote(note);
                            setFullScreenMode("view");
                          }}
                          className="text-[10px] font-bold text-primary hover:underline bg-card/80 px-3 py-1 rounded-full border border-border shadow-sm"
                        >
                          Read Full Note
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Screen Note Viewer/Editor */}
      <Dialog
        open={!!fullScreenMode}
        onOpenChange={(open) => !open && setFullScreenMode(null)}
      >
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground uppercase">
                  {activeNote?.createdByUser.displayName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold">
                    {activeNote?.createdByUser.displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {activeNote && formatRelativeTime(activeNote.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mr-8">
                {fullScreenMode === "view" ? (
                  <button
                    onClick={() => {
                      setFullScreenMode("edit");
                      setEditContent(activeNote?.content || "");
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
                  >
                    <PenLine className="h-3.5 w-3.5" /> Edit
                  </button>
                ) : (
                  <button
                    onClick={() => setFullScreenMode("view")}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Mode
                  </button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-4">
            {fullScreenMode === "view" ? (
              <div className="prose prose-invert max-w-none">
                <MarkdownRenderer
                  content={activeNote?.content || ""}
                  className="text-base"
                />
              </div>
            ) : (
              <div className="h-full flex flex-col space-y-4">
                <div className="flex items-center gap-1 border-b border-border/40 pb-2">
                  <button
                    onClick={() =>
                      insertMarkdown("bold", "full-edit-input", true)
                    }
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      insertMarkdown("italic", "full-edit-input", true)
                    }
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      insertMarkdown("h2", "full-edit-input", true)
                    }
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                  >
                    <Type className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      insertMarkdown("ul", "full-edit-input", true)
                    }
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  id="full-edit-input"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 w-full resize-none bg-transparent text-base focus:outline-none leading-relaxed"
                  placeholder="Edit note content..."
                />
              </div>
            )}
          </div>

          {fullScreenMode === "edit" && (
            <DialogFooter className="p-4 bg-muted/30 border-t border-border/40">
              <div className="flex gap-2">
                <button
                  onClick={() => setFullScreenMode("view")}
                  className="px-6 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (
                      activeNote &&
                      (await handleEditSave(activeNote.id, editContent))
                    )
                      setFullScreenMode("view");
                  }}
                  className="bg-primary text-primary-foreground px-8 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface TicketSummary {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  createdAt: string;
  assignee?: { displayName: string } | null;
  client: { name: string };
}

// ─── Ticket History Section ────────────────────────────────────────────────
function TicketHistorySection({ tickets }: { tickets: TicketSummary[] }) {
  const router = useRouter();

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          Maintenance & Support History
        </h2>
        {tickets.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {tickets.length}
          </span>
        )}
      </div>

      <div className="glass-card divide-y divide-border/40 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            No maintenance tickets recorded for this asset
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="group p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-primary">
                    {ticket.ticketNo}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4.5 font-bold uppercase"
                  >
                    {ticket.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {ticket.title}
              </h4>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />{" "}
                  {ticket.assignee?.displayName || "Unassigned"}
                </span>
                <span>•</span>
                <span>Client: {ticket.client.name}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AssetChangelogSection({ assetId }: { assetId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["asset-logs", assetId],
    queryFn: async () => {
      const res = await api.get<any[]>(`/assets/${assetId}/audit-logs`);
      return res.data;
    },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          Asset Audit Trail & Logs
        </h2>
        {logs.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {logs.length}
          </span>
        )}
      </div>

      <div className="glass-card divide-y divide-border/40 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            No audit logs recorded for this asset
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border/30 custom-scrollbar">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold bg-primary/10 px-2 py-0.5 rounded text-primary uppercase tracking-wider">
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {log.details && (
                  <p className="text-xs text-foreground font-semibold line-clamp-2">
                    {log.details}
                  </p>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  By: {log.user?.displayName || "System"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AssetDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string>
  >({});
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const handleRevealPassword = async (credId: string) => {
    if (revealed.has(credId)) {
      setRevealed((prev) => {
        const next = new Set(prev);
        next.delete(credId);
        return next;
      });
      return;
    }
    try {
      if (!revealedPasswords[credId]) {
        const res = await api.get<{ password: string }>(
          `/credentials/${credId}/reveal`,
        );
        setRevealedPasswords((prev) => ({
          ...prev,
          [credId]: res.data.password,
        }));
      }
      setRevealed((prev) => new Set(prev).add(credId));
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reveal password";
      toast.error(msg);
    }
  };

  const assetId = typeof params.id === "string" ? params.id : "";
  const returnTo = searchParams?.get("returnTo");

  const {
    data: asset,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: async () => {
      const response = await api.get<Asset>(`/assets/${assetId}`);
      return response.data;
    },
    enabled: !!assetId,
    staleTime: 30000, // 30 seconds
  });

  // Handle errors
  useEffect(() => {
    if (isError) {
      toast.error("Failed to load asset details");
      router.push("/dashboard/assets");
    }
  }, [isError, router]);

  // Handle Header
  useEffect(() => {
    if (!asset) return;
    setHeader({
      title: asset.name,
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Assets", href: "/dashboard/assets" },
        { label: asset.name },
      ],
    });
    // Removed cleanup that was causing race conditions
  }, [asset, setHeader]);

  const accessRows = useMemo<AccessRow[]>(() => {
    if (!asset) return [];
    const groups = new Map<string, AccessRow>();
    (asset.ipAllocations ?? []).forEach((ip) => {
      const nodeLabel = ip.nodeLabel?.trim() || "Primary";
      const label = ip.type?.trim() || "Primary";
      const key = `${nodeLabel.toLowerCase()}::${label.toLowerCase()}`;
      const existing = groups.get(key) ?? {
        key,
        nodeLabel,
        label,
        addresses: [],
        methods: extractMethods(ip.manageType, asset.manageType),
        version: ip.version?.trim() || undefined,
        credentials: [],
      };
      existing.addresses.push(ip.address);
      existing.methods =
        existing.methods.length > 0
          ? existing.methods
          : extractMethods(ip.manageType, asset.manageType);
      existing.version = existing.version || ip.version?.trim() || undefined;
      groups.set(key, existing);
    });
    (asset.credentials ?? []).forEach((credential) => {
      const nodeLabel = credential.nodeLabel?.trim() || "Primary";
      const label = credential.type?.trim() || "Primary";
      const key = `${nodeLabel.toLowerCase()}::${label.toLowerCase()}`;
      const existing = groups.get(key) ?? {
        key,
        nodeLabel,
        label,
        addresses: [],
        methods: extractMethods(credential.manageType, asset.manageType),
        version: credential.version?.trim() || undefined,
        credentials: [],
      };
      existing.credentials.push(credential);
      existing.methods =
        existing.methods.length > 0
          ? existing.methods
          : extractMethods(credential.manageType, asset.manageType);
      existing.version =
        existing.version || credential.version?.trim() || undefined;
      groups.set(key, existing);
    });
    return Array.from(groups.values()).map((row) => ({
      ...row,
      addresses: Array.from(new Set(row.addresses)),
    }));
  }, [asset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (accessRows.length > 0) setOpenAccordion(accessRows[0].key);
    }, 0);
    return () => clearTimeout(timer);
  }, [assetId, accessRows]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-bold tracking-tight">
          Syncing Asset Resources...
        </p>
      </div>
    );
  }

  if (!asset) return null;

  const style = getAssetStyle(asset.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="workspace-page space-y-6 pt-2"
    >
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push(returnTo || "/dashboard/assets")}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />{" "}
          {returnTo ? "Back to Ticket" : "Back to Assets"}
        </button>
      </div>

      {/* Hero Section */}
      <section className="glass-card overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
          <div className="flex items-start gap-5 relative z-10">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-xl",
                style.bg,
              )}
            >
              {style.icon}
            </div>
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[400px]">
                  {asset.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground min-w-0">
                <span className="font-semibold text-foreground/80 truncate">
                  {asset.brandModel || "Generic Hardware"}
                </span>
                {asset.rack && (
                  <span className="flex items-center gap-1.5">
                    <Waypoints className="h-3.5 w-3.5" /> {asset.rack}
                  </span>
                )}
                {asset.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {asset.location}
                  </span>
                )}
                {asset.sn && (
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Hash className="h-3.5 w-3.5" /> {asset.sn}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end relative z-10">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2 min-w-[80px]">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Interfaces
              </span>
              <span className="text-lg font-bold text-primary">
                {accessRows.length}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2 min-w-[80px]">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Accounts
              </span>
              <span className="text-lg font-bold text-warning">
                {asset.credentials?.length ?? 0}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2 min-w-[80px]">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Notes
              </span>
              <span className="text-lg font-bold text-low">
                {asset.notes?.length ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Hardware Specs & Governance */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* Metadata (Spec) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <LaptopMinimal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Specifications
                </h2>
              </div>
              <div className="glass-card overflow-hidden">
                {!asset.customMetadata ||
                Object.keys(asset.customMetadata).length === 0 ? (
                  <div className="p-4 text-xs italic text-muted-foreground">
                    No technical metadata provided
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {Object.entries(asset.customMetadata).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30"
                      >
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {k}
                        </span>
                        <span className="text-xs font-semibold text-foreground text-right">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Asset Properties */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Asset Properties
                </h2>
              </div>
              <div className="glass-card divide-y divide-border/40 overflow-hidden">
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Type
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.type || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Asset ID
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.assetId || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Brand / Model
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.brandModel || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Serial Number
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.sn || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Location
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.location || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Rack
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.rack || "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Purchase Date
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.purchaseDate
                      ? new Date(asset.purchaseDate).toLocaleDateString()
                      : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Warranty Exp.
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {asset.warrantyExpiration
                      ? new Date(asset.warrantyExpiration).toLocaleDateString()
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Access & Credentials Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Globe className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Access Interfaces & Credentials
              </h2>
            </div>

            <div className="space-y-3">
              {accessRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
                  No access methods configured for this asset
                </div>
              ) : (
                accessRows.map((row) => (
                  <div
                    key={row.key}
                    className={cn(
                      "group overflow-hidden rounded-2xl border transition-all duration-300",
                      openAccordion === row.key
                        ? "border-primary/40 bg-card shadow-lg ring-1 ring-primary/10"
                        : "border-border/60 bg-card/50 hover:border-primary/20 hover:bg-card",
                    )}
                  >
                    <button
                      onClick={() =>
                        setOpenAccordion(
                          openAccordion === row.key ? null : row.key,
                        )
                      }
                      className="flex w-full items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                            openAccordion === row.key
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                          )}
                        >
                          <Globe className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-60">
                              {row.nodeLabel}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4.5 px-1.5 font-bold uppercase tracking-tight"
                            >
                              {row.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="truncate text-sm font-bold text-foreground">
                              {row.addresses[0] || "No IP"}
                            </span>
                            {row.addresses.length > 1 && (
                              <Badge
                                variant="secondary"
                                className="h-4.5 px-1 text-[9px]"
                              >
                                +{row.addresses.length - 1}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5">
                          {row.methods.map((m) => (
                            <Badge
                              key={m}
                              variant="secondary"
                              className="bg-muted/50 text-[10px] font-bold uppercase"
                            >
                              {m}
                            </Badge>
                          ))}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-300",
                            openAccordion === row.key && "rotate-180",
                          )}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {openAccordion === row.key && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="border-t border-border/40 p-4 pt-2 space-y-4 bg-muted/10">
                            <div className="grid gap-4 sm:grid-cols-2">
                              {/* IPs List */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                  Network Addresses
                                </h4>
                                <div className="space-y-1">
                                  {row.addresses.map((addr) => (
                                    <div
                                      key={addr}
                                      className="flex items-center justify-between rounded-lg bg-background/60 p-2 border border-border/40 group/item"
                                    >
                                      <span className="font-mono text-xs text-foreground/80">
                                        {addr}
                                      </span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(addr);
                                          toast.success("Copied to clipboard");
                                        }}
                                        className="p-1 rounded hover:bg-muted opacity-0 group-hover/item:opacity-100 transition-opacity"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Credentials List */}
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                  Linked Credentials
                                </h4>
                                <div className="space-y-1">
                                  {row.credentials.length === 0 ? (
                                    <div className="p-3 text-[11px] text-muted-foreground italic bg-background/30 rounded-lg border border-dashed border-border/50">
                                      No credentials linked to this interface
                                    </div>
                                  ) : (
                                    row.credentials.map((cred) => (
                                      <div
                                        key={cred.id}
                                        className="rounded-lg bg-background/60 p-2 border border-border/40 space-y-2 group/cred"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Shield className="h-3 w-3 text-primary opacity-60" />
                                            <span className="text-xs font-bold text-foreground">
                                              {cred.username}
                                            </span>
                                          </div>
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] h-4 uppercase"
                                          >
                                            {cred.type}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 flex items-center justify-between px-2 py-1 bg-muted/50 rounded border border-border/40 min-h-[28px]">
                                            <span className="font-mono text-xs text-muted-foreground tracking-widest">
                                              {revealed.has(cred.id)
                                                ? revealedPasswords[cred.id] ||
                                                  "••••••••"
                                                : "••••••••"}
                                            </span>
                                            <button
                                              onClick={() =>
                                                handleRevealPassword(cred.id)
                                              }
                                              className="p-1 rounded hover:bg-background transition-colors"
                                            >
                                              {revealed.has(cred.id) ? (
                                                <EyeOff className="h-3 w-3" />
                                              ) : (
                                                <Eye className="h-3 w-3" />
                                              )}
                                            </button>
                                          </div>
                                          <button
                                            onClick={() => {
                                              if (cred.password) {
                                                navigator.clipboard.writeText(
                                                  cred.password,
                                                );
                                                toast.success(
                                                  "Password copied",
                                                );
                                              } else {
                                                toast.error(
                                                  "Password not available",
                                                );
                                              }
                                            }}
                                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-background border border-border/60 hover:bg-muted transition-colors"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Relations Section */}
          {(asset.parent || (asset.children && asset.children.length > 0)) && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <FolderTree className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Hierarchy & Relations
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Parent */}
                {asset.parent && (
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Parent Asset
                    </h4>
                    <button
                      onClick={() =>
                        router.push(`/dashboard/assets/${asset.parent?.id}`)
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3 text-left transition-all hover:border-primary/40 hover:bg-background hover:shadow-sm group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Building2 className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">
                          {asset.parent.name}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground opacity-70">
                          {asset.parent.type}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
                {/* Children */}
                {asset.children && asset.children.length > 0 && (
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Child Assets ({asset.children.length})
                    </h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {asset.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() =>
                            router.push(`/dashboard/assets/${child.id}`)
                          }
                          className="flex w-full items-center gap-3 rounded-lg border border-border/40 bg-background/30 p-2 text-left transition-all hover:border-primary/30 hover:bg-background group"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {child.name}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Attachments Section */}
          <AttachmentsSection
            assetId={assetId}
            initialAttachments={asset.attachments ?? []}
          />
        </div>

        {/* Sidebar Components (Notes, Timeline) */}
        <div className="space-y-6">
          <NotesSection assetId={assetId} initialNotes={asset.notes ?? []} />
          <TicketHistorySection tickets={asset.tickets ?? []} />
          <AssetChangelogSection assetId={assetId} />
        </div>
      </div>
    </motion.div>
  );
}
