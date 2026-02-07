import { Label } from '@radix-ui/react-label';

interface ColorControlProps {
    name: string;
    value: string;
    onChange: (value: string) => void;
}

export function ColorControl({ name, value, onChange }: ColorControlProps) {
    return (
        <div className="flex items-center justify-between gap-4 p-2 border-b border-gray-100 last:border-0">
            <Label className="text-sm font-medium text-gray-700 font-mono shrink-0">{name}</Label>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-24 text-xs p-1 border rounded bg-gray-50 text-gray-900 border-gray-200"
                />
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 w-8 p-0 border-0 rounded cursor-pointer"
                />
            </div>
        </div>
    );
}
