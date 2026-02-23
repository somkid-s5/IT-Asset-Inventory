'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Server, Monitor, AppWindow, Database, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

interface AssetFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetToEdit?: any;
    onSuccess: () => void;
    availableParents: any[];
}

export function AssetFormDialog({ open, onOpenChange, assetToEdit, onSuccess, availableParents }: AssetFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'SERVER',
        status: 'ACTIVE',
        osVersion: '',
        department: 'IT',
        owner: '',
        ipAddress: '',
        parentId: 'none',
        environment: 'PROD',
        location: '',
    });

    const [metadataPairs, setMetadataPairs] = useState<{ key: string; value: string }[]>([]);

    useEffect(() => {
        if (assetToEdit) {
            setFormData({
                name: assetToEdit.name || '',
                type: assetToEdit.type || 'SERVER',
                status: assetToEdit.status || 'ACTIVE',
                osVersion: assetToEdit.osVersion || '',
                department: assetToEdit.department || 'IT',
                owner: assetToEdit.owner || '',
                ipAddress: assetToEdit.ipAllocations?.[0]?.address || '',
                parentId: assetToEdit.parentId || 'none',
                environment: assetToEdit.environment || 'PROD',
                location: assetToEdit.location || '',
            });

            if (assetToEdit.customMetadata) {
                setMetadataPairs(
                    Object.entries(assetToEdit.customMetadata).map(([key, value]) => ({
                        key,
                        value: String(value),
                    }))
                );
            } else {
                setMetadataPairs([]);
            }
        } else {
            setFormData({
                name: '',
                type: 'SERVER',
                status: 'ACTIVE',
                osVersion: '',
                department: 'IT',
                owner: '',
                ipAddress: '',
                parentId: 'none',
                environment: 'PROD',
                location: '',
            });
            setMetadataPairs([]);
        }
    }, [assetToEdit, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Build customMetadata object
            const customMetadata: Record<string, string> = {};
            metadataPairs.forEach(pair => {
                if (pair.key.trim() && pair.value.trim()) {
                    // Replace spaces with underscores for clean JSON keys
                    const cleanKey = pair.key.trim().toLowerCase().replace(/\s+/g, '_');
                    customMetadata[cleanKey] = pair.value.trim();
                }
            });

            const payload = {
                ...formData,
                parentId: formData.parentId === 'none' ? undefined : formData.parentId,
                customMetadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
            };

            if (assetToEdit) {
                await api.patch(`/assets/${assetToEdit.id}`, payload);
                toast.success('Asset updated successfully');
            } else {
                await api.post('/assets', payload);
                toast.success('Asset created successfully');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save asset');
        } finally {
            setLoading(false);
        }
    };

    const addMetadataField = () => {
        setMetadataPairs([...metadataPairs, { key: '', value: '' }]);
    };

    const removeMetadataField = (index: number) => {
        const newPairs = [...metadataPairs];
        newPairs.splice(index, 1);
        setMetadataPairs(newPairs);
    };

    const updateMetadataField = (index: number, field: 'key' | 'value', value: string) => {
        const newPairs = [...metadataPairs];
        newPairs[index][field] = value;
        setMetadataPairs(newPairs);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] bg-card text-foreground max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{assetToEdit ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Asset Name / Hostname *</Label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. SRV-DB-01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>IP Address</Label>
                            <Input
                                value={formData.ipAddress}
                                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                placeholder="e.g. 192.168.1.100"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Type *</Label>
                            <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SERVER"><div className="flex items-center gap-2"><Server className="w-4 h-4" /> Physical Server</div></SelectItem>
                                    <SelectItem value="VM"><div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Virtual Machine</div></SelectItem>
                                    <SelectItem value="DB"><div className="flex items-center gap-2"><Database className="w-4 h-4" /> Database</div></SelectItem>
                                    <SelectItem value="APP"><div className="flex items-center gap-2"><AppWindow className="w-4 h-4" /> Application</div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Status *</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active (Online)</SelectItem>
                                    <SelectItem value="OFFLINE">Offline</SelectItem>
                                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                    <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Parent Host (For VMs/Apps)</Label>
                            <Select value={formData.parentId} onValueChange={(v) => setFormData({ ...formData, parentId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Parent Host..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Independent / Top Level --</SelectItem>
                                    {availableParents.map(parent => (
                                        <SelectItem key={parent.id} value={parent.id}>
                                            {parent.name} ({parent.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>OS Version</Label>
                            <Input
                                value={formData.osVersion}
                                onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                                placeholder="e.g. Ubuntu 22.04 LTS"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Environment *</Label>
                            <Select value={formData.environment} onValueChange={(v) => setFormData({ ...formData, environment: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PROD">Production (PROD)</SelectItem>
                                    <SelectItem value="UAT">User Acceptance (UAT)</SelectItem>
                                    <SelectItem value="DEV">Development (DEV)</SelectItem>
                                    <SelectItem value="DR">Disaster Recovery (DR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Physical Location / Zone</Label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. DC-Bangkok / Rack 04"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Owner / Responsible</Label>
                            <Input
                                value={formData.owner}
                                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                                placeholder="e.g. John Doe / App Team"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Department Tag</Label>
                            <Input
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                placeholder="e.g. IT, HR, Finance"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <Label className="text-base">Extended Hardware Specs & Metadata</Label>
                                <p className="text-xs text-muted-foreground">Add dynamic fields here instead of an excel spreadsheet.</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addMetadataField} className="h-8">
                                <Plus className="w-4 h-4 mr-1" /> Add Field
                            </Button>
                        </div>

                        <div className="space-y-3 mt-4">
                            {metadataPairs.length === 0 ? (
                                <div className="text-sm text-center py-4 bg-muted/20 border border-dashed border-border rounded-lg text-muted-foreground">
                                    No extended specs added. Click "Add Field" to define RAM, CPU, Warranty Date, etc.
                                </div>
                            ) : (
                                metadataPairs.map((pair, index) => (
                                    <div key={index} className="flex gap-2 items-start animate-slide-in">
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                placeholder="Key (e.g. RAM GB)"
                                                value={pair.key}
                                                onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                                                className="font-mono text-xs"
                                            />
                                        </div>
                                        <div className="flex-[2] space-y-1">
                                            <Input
                                                placeholder="Value (e.g. 128)"
                                                value={pair.value}
                                                onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                                                className="text-sm"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => removeMetadataField(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : assetToEdit ? 'Save Changes' : 'Create Asset'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
