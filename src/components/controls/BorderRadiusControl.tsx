'use client';

import * as Slider from '@radix-ui/react-slider';
import { Label } from '@radix-ui/react-label';

interface BorderRadiusControlProps {
    value: number;
    onChange: (value: number) => void;
}

export function BorderRadiusControl({ value, onChange }: BorderRadiusControlProps) {
    const handleChange = (val: number[]) => {
        onChange(val[0]);
    };

    return (
        <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">Border Radius</Label>
                <span className="text-xs text-gray-500 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                    {value}px
                </span>
            </div>
            <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[value]}
                min={0}
                max={32}
                step={1}
                onValueChange={handleChange}
            >
                <Slider.Track className="bg-gray-200 relative grow rounded-full h-[6px]">
                    <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb
                    className="block w-5 h-5 bg-white border-2 border-blue-500 shadow-md rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-grab active:cursor-grabbing"
                    aria-label="Border Radius"
                />
            </Slider.Root>
            <div className="flex justify-between text-[10px] text-gray-400">
                <span>0px</span>
                <span>16px</span>
                <span>32px</span>
            </div>
        </div>
    );
}
