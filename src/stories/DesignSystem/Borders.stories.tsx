
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, flattenTokens, deepMerge } from '../../utils/token-utils';

const meta: Meta = {
    title: 'Design System/Borders',
    component: TokenGrid,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

export const Radius: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
                const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');
                const merged = deepMerge(globalTokens, primaryTokens);
                const radius = flattenTokens(merged, merged).filter(t => t.type === 'borderRadius');
                setTokens(radius);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Border Radius</h2>
                <TokenGrid tokens={tokens} type="borderRadius" />
            </div>
        );
    }
};

export const Width: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
                const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');
                const merged = deepMerge(globalTokens, primaryTokens);
                const width = flattenTokens(merged, merged).filter(t => t.type === 'borderWidth');
                setTokens(width);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Border Width</h2>
                <TokenGrid tokens={tokens} type="borderWidth" />
            </div>
        );
    }
};
