import { Label } from '@radix-ui/react-label';

interface TypographyControlProps {
    name: string;
    value: any; // Composite object or CSS shorthand string
    onChange: (value: any) => void;
}

export function TypographyControl({ name, value, onChange }: TypographyControlProps) {
    // For now, let's treat it as a read-only or simple display if it's complex
    // Or handle specific sub-properties if value is an object

    if (typeof value !== 'object') {
        return (
            <div className="p-2 border-b border-gray-100">
                <Label className="text-sm font-medium text-gray-700 font-mono">{name}</Label>
                <div className="text-xs text-gray-500 mt-1 break-all">{String(value)}</div>
            </div>
        );
    }

    return (
        <div className="p-3 border rounded bg-gray-50 mb-2">
            <Label className="text-sm font-bold text-gray-800 font-mono block mb-2">{name}</Label>
            <div className="space-y-2">
                {Object.entries(value).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{key}</span>
                        <span className="font-mono text-gray-900">{String(val)}</span>
                        {/* Can add inputs here to edit sub-values */}
                    </div>
                ))}
            </div>
        </div>
    );
}
