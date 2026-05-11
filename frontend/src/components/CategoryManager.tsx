'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kbService } from '@/services/kb';
import { 
  Trash2, 
  Settings2, 
  Plus,
  Loader2,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function CategoryManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: kbService.getCategories,
  });

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await kbService.initializeCategories();
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Standard library initialized with samples');
    } catch (error) {
      toast.error('Failed to initialize library');
    } finally {
      setIsInitializing(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => kbService.createCategory({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      setNewCategoryName('');
      toast.success('Category created');
    },
    onError: () => toast.error('Failed to create category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kbService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Category deleted');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete category';
      toast.error(message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createMutation.mutate(newCategoryName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl h-9 font-bold text-[10px] uppercase tracking-widest border-2">
          <Settings2 className="h-3.5 w-3.5 mr-2" />
          Manage Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-[32px] border-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Knowledge Categories
          </DialogTitle>
          <DialogDescription className="text-xs font-medium uppercase tracking-tight opacity-60">
            Organize your documentation by adding or removing categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Admin Initialization */}
          <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
             <div className="space-y-1">
                <p className="text-xs font-bold text-primary uppercase">Quick Start</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Setup standard categories and expert samples.</p>
             </div>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInitialize}
                disabled={isInitializing}
                className="rounded-xl h-8 text-[9px] font-black uppercase bg-card border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
             >
                {isInitializing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                Initialize Defaults
             </Button>
          </div>

          {/* Create Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-10 rounded-xl bg-muted/50 border-border/40 text-sm"
              />
            </div>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !newCategoryName.trim()}
              className="rounded-xl px-4 font-bold h-10 shadow-lg shadow-primary/10"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>

          {/* List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin opacity-20" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground italic">No categories yet.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40 group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center border border-border/50 text-muted-foreground group-hover:text-primary transition-colors">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{cat.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{cat._count?.articles || 0} Articles</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                       if (window.confirm('Delete this category?')) {
                         deleteMutation.mutate(cat.id);
                       }
                    }}
                    className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <DialogFooter className="sm:justify-start">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-primary mr-1">Note:</span> 
            Categories with existing articles cannot be deleted. You must move or delete the articles first.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
