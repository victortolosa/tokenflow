import * as Slider from '@radix-ui/react-slider';
import { Label } from '@radix-ui/react-label';

interface SpacingControlProps {
    name: string;
    value: string;
    onChange: (value: string) => void;
}

export function SpacingControl({ name, value, onChange }: SpacingControlProps) {
    // Parse value to number (assuming px or rem)
    const numericValue = parseFloat(value) || 0;
    const unit = value.replace(/[0-9.]/g, '') || 'px';

    const handleChange = (val: number[]) => {
        onChange(`${val[0]}${unit}`);
    };

    return (
        <div className="flex flex-col gap-2 p-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700 font-mono">{name}</Label>
                <span className="text-xs text-gray-500 font-mono">{value}</span>
            </div>
            <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[numericValue]}
                max={100}
                step={1}
                onValueChange={handleChange}
            >
                <Slider.Track className="bg-gray-200 relative grow rounded-full h-[3px]">
                    <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb
                    className="block w-4 h-4 bg-white border border-gray-300 shadow-sm rounded-[10px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Spacing"
                />
            </Slider.Root>
        </div>
    );
}
