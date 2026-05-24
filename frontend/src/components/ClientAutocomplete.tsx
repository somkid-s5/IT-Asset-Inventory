'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { clientsService, Client } from '@/services/tickets';

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientAutocomplete({ value, onChange }: ClientAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValue, setPendingValue] = React.useState('');
  const [inputValue, setInputValue] = React.useState(value);
  const [options, setOptions] = React.useState<Client[]>([]);

  React.useEffect(() => {
    const fetchClients = async () => {
      const results = await clientsService.search(inputValue);
      setOptions(results);
    };
    
    if (inputValue.length > 0) {
      const timer = setTimeout(fetchClients, 300);
      return () => clearTimeout(timer);
    } else {
      setOptions([]);
    }
  }, [inputValue]);

  const handleAddNew = () => {
    setPendingValue(inputValue);
    setConfirmOpen(true);
    setOpen(false);
  };

  const confirmAddNew = () => {
    onChange(pendingValue);
    setConfirmOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-card/50 h-10 rounded-xl"
          >
            {value ? value : "Select or type client name..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl border-border">
          <Command>
            <CommandInput 
              placeholder="Search client..." 
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col gap-2 p-2">
                  <p className="text-xs text-muted-foreground">No client found.</p>
                  {inputValue && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-2"
                      onClick={handleAddNew}
                    >
                      <Plus className="h-3 w-3" />
                      Add &quot;{inputValue}&quot;
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {options.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === client.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {client.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              New Client Confirmation
            </DialogTitle>
            <DialogDescription className="py-2">
              You are about to add <span className="font-bold text-foreground font-mono">&quot;{pendingValue}&quot;</span> as a new client record. 
              Please verify the spelling to prevent duplicate data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="rounded-xl">
              Back to Search
            </Button>
            <Button onClick={confirmAddNew} className="rounded-xl font-bold shadow-lg shadow-primary/20">
              Confirm & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
