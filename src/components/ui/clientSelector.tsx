import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface Client {
  name: string;
  id: string;
}

interface ClientSelectorProps {
  clients: Client[];
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

function ClientSelector({
  clients,
  selectedClientId,
  onClientChange,
  label = "Client",
  placeholder = "Select a client",
  disabled = false,
}: ClientSelectorProps) {
  // console.log("ClientSelector clients:", clients, selectedClientId);
  return (
    <div className="flex items-center gap-4 flex-wrap py-2">
      <label className="text-sm font-medium">{label}</label>
      <Select
        disabled={disabled}
        value={clients.length === 1 ? clients[0].id : selectedClientId ?? ""}
        onValueChange={(value) => onClientChange(value || null)}
      >
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Available Clients</SelectLabel>
            {clients.map((client) => (
              <SelectItem
                data-pr-tooltip={client.name}
                key={client.id}
                value={client.id}
              >
                {client.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* {selectedClientId && (
        <span className="text-sm text-gray-500">
          Selected: {clients.find((c) => c.id === selectedClientId)?.name}
        </span>
      )} */}
    </div>
  );
}

export default ClientSelector;
