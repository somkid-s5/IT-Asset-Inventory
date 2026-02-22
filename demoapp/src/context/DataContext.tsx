import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  mockAssets as initialAssets,
  mockCredentials as initialCredentials,
  mockPatches as initialPatches,
  mockAssetCredentials as initialAssetCredentials,
  type Asset,
  type Credential,
  type PatchItem,
  type AssetCredential,
} from "@/data/mockData";

interface DataContextType {
  assets: Asset[];
  credentials: Credential[];
  patches: PatchItem[];
  assetCredentials: AssetCredential[];
  addAsset: (asset: Omit<Asset, "id">) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  addCredential: (cred: Omit<Credential, "id">) => void;
  updateCredential: (id: string, cred: Partial<Credential>) => void;
  deleteCredential: (id: string) => void;
  addPatch: (patch: Omit<PatchItem, "id">) => void;
  updatePatch: (id: string, patch: Partial<PatchItem>) => void;
  deletePatch: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

let counter = 100;
const genId = (prefix: string) => `${prefix}-${++counter}`;

export function DataProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);
  const [patches, setPatches] = useState<PatchItem[]>(initialPatches);
  const [assetCredentials] = useState<AssetCredential[]>(initialAssetCredentials);

  const addAsset = useCallback((asset: Omit<Asset, "id">) => {
    setAssets((prev) => [...prev, { ...asset, id: genId("ast") }]);
  }, []);
  const updateAsset = useCallback((id: string, data: Partial<Asset>) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }, []);
  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addCredential = useCallback((cred: Omit<Credential, "id">) => {
    setCredentials((prev) => [...prev, { ...cred, id: genId("c") }]);
  }, []);
  const updateCredential = useCallback((id: string, data: Partial<Credential>) => {
    setCredentials((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);
  const deleteCredential = useCallback((id: string) => {
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addPatch = useCallback((patch: Omit<PatchItem, "id">) => {
    setPatches((prev) => [...prev, { ...patch, id: genId("p") }]);
  }, []);
  const updatePatch = useCallback((id: string, data: Partial<PatchItem>) => {
    setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);
  const deletePatch = useCallback((id: string) => {
    setPatches((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <DataContext.Provider
      value={{
        assets, credentials, patches, assetCredentials,
        addAsset, updateAsset, deleteAsset,
        addCredential, updateCredential, deleteCredential,
        addPatch, updatePatch, deletePatch,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
