import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Grid } from '@material-ui/core';
import { useTranslation, useIntervalFetch, useDevicePermissions } from '@energyweb/origin-ui-core';
import { getExchangeClient } from '../features/general';
import { ITradeDTO } from '../utils/exchange';
import { Trades } from '../components/trades';
import { Requirements } from '@energyweb/origin-ui-core/dist/src/components/Requirements';

interface IProps {
    currency: string;
    refreshInterval?: number;
}

export function MyTrades(props: IProps) {
    const { canCreateDevice } = useDevicePermissions();

    if (!canCreateDevice?.value) {
        return <Requirements />;
    }

    const { currency, refreshInterval } = { refreshInterval: 10000, ...props };

    const exchangeClient = useSelector(getExchangeClient);
    const { t } = useTranslation();

    const [data, setData] = useState<ITradeDTO[]>([]);

    const fetchData = async (checkIsMounted: () => boolean) => {
        const trades = await exchangeClient?.tradeClient.getAll();
        const fetchedData = trades?.data;

        if (checkIsMounted()) {
            setData(fetchedData ?? []);
        }
    };

    useIntervalFetch(fetchData, refreshInterval);

    return (
        <div>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Trades currency={currency} data={data} title={t('exchange.info.myTrades')} />
                </Grid>
            </Grid>
        </div>
    );
}
