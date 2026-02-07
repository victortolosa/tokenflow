
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, flattenTokens } from '../../utils/token-utils';

const meta: Meta = {
    title: 'Design System/Shadows',
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
                // Shadows are usually in Primary for semantic usage, or Global for base
                // In the sample file, it seems they were in Primary under Root.--box-shadow-xs

                const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
                const primaryTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Primary.json');

                // Combine
                const allTokens = { ...globalTokens, ...primaryTokens };

                // Flatten primary first as it had the shadows in previous inspection
                const shadows = flattenTokens(primaryTokens, allTokens).filter(t => t.type === 'boxShadow');
                // If empty, try global
                if (shadows.length === 0) {
                    const globalShadows = flattenTokens(globalTokens, allTokens).filter(t => t.type === 'boxShadow');
                    setTokens(globalShadows);
                } else {
                    setTokens(shadows);
                }

                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Shadows</h2>
                <TokenGrid tokens={tokens} type="shadow" />
            </div>
        );
    }
};
