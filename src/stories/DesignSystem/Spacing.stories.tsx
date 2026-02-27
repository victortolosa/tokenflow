
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, flattenTokens, deepMerge } from '../../utils/token-utils';

const meta: Meta = {
    title: 'Design System/Spacing',
    component: TokenGrid,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

export const Default: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
                const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');
                const merged = deepMerge(globalTokens, primaryTokens);
                // Flatten and filter for spacing
                const spacing = flattenTokens(merged, merged).filter(t => t.type === 'spacing');
                setTokens(spacing);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Spacing Scale</h2>
                <TokenGrid tokens={tokens} type="spacing" />
            </div>
        );
    }
};

export const Sizing: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
                const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');
                const merged = deepMerge(globalTokens, primaryTokens);
                const sizing = flattenTokens(merged, merged).filter(t => t.type === 'sizing');
                setTokens(sizing);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Sizing</h2>
                <TokenGrid tokens={tokens} type="sizing" />
            </div>
        );
    }
};
