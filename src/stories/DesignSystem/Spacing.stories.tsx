
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, flattenTokens } from '../../utils/token-utils';

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
                const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
                // Flatten and filter for spacing
                const spacing = flattenTokens(globalTokens, globalTokens).filter(t => t.type === 'spacing');
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
