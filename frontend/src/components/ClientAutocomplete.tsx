'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { clientsService, Client } from '@/services/tickets';

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientAutocomplete({ value, onChange }: ClientAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
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

  return (
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
                    onClick={() => {
                      onChange(inputValue);
                      setOpen(false);
                    }}
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
  );
}
