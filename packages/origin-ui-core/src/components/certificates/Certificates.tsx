import React, { useContext, useState } from 'react';
import { Route, NavLink, Redirect } from 'react-router-dom';
import { Role, isRole, UserStatus } from '@energyweb/origin-backend-core';
import { OriginFeature } from '@energyweb/utils-general';
import { PageContent } from '../PageContent/PageContent';
import { CertificateTable, SelectedState } from './CertificateTable';
import { CertificateDetailView } from './CertificateDetailView';
import { CertificationRequestsTable } from './CertificationRequestsTable';
import { useSelector } from 'react-redux';
import { getUserOffchain } from '../../features/users/selectors';
import { useTranslation } from 'react-i18next';
import { useDevicePermissions, useLinks } from '../../utils';
import { OriginConfigurationContext } from '..';
import { RoleChangedModal } from '../Modal/RoleChangedModal';
import { ConnectBlockchainAccountModal } from '../Modal/ConnectBlockchainAccountModal';
import { Requirements } from '../Requirements';

function CertificateDetailViewId(id: number) {
    return <CertificateDetailView id={id} />;
}

function InboxCertificates() {
    const { canCreateDevice } = useDevicePermissions();

    if (!canCreateDevice?.value) {
        return <Requirements />;
    }
    return <CertificateTable selectedState={SelectedState.Inbox} />;
}

function ClaimedCertificates() {
    const { canCreateDevice } = useDevicePermissions();

    if (!canCreateDevice?.value) {
        return <Requirements />;
    }
    return <CertificateTable selectedState={SelectedState.Claimed} hiddenColumns={['source']} />;
}

function PendingCertificationRequestsTable() {
    const { canCreateDevice } = useDevicePermissions();

    if (!canCreateDevice?.value) {
        return <Requirements />;
    }
    return <CertificationRequestsTable approved={false} />;
}

function ApprovedCertificationRequestsTable() {
    const { canCreateDevice } = useDevicePermissions();

    if (!canCreateDevice?.value) {
        return <Requirements />;
    }
    return <CertificationRequestsTable approved={true} />;
}

export function Certificates() {
    const user = useSelector(getUserOffchain);
    const { baseURL, getCertificatesLink } = useLinks();
    const { t } = useTranslation();
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showBlockchainModal, setShowBlockchainModal] = useState(false);

    const originConfiguration = useContext(OriginConfigurationContext);

    const isIssuer = isRole(user, Role.Issuer);
    const userIsActive = user && user.status === UserStatus.Active;

    const userIsActiveAndPartOfOrg =
        user?.organization &&
        userIsActive &&
        isRole(user, Role.OrganizationUser, Role.OrganizationDeviceManager, Role.OrganizationAdmin);

    const CertificatesMenu = [
        {
            key: 'inbox',
            label: 'navigation.certificates.inbox',
            component: InboxCertificates,
            show: userIsActiveAndPartOfOrg,
            features: [OriginFeature.Certificates, OriginFeature.Buyer]
        },
        {
            key: 'claims_report',
            label: 'navigation.certificates.claimsReport',
            component: ClaimedCertificates,
            show: isIssuer || userIsActiveAndPartOfOrg,
            features: [OriginFeature.Certificates, OriginFeature.Buyer]
        },
        {
            key: 'detail_view',
            label: 'navigation.certificates.detailView',
            component: null,
            show: false,
            features: [OriginFeature.Certificates]
        },
        {
            key: 'pending',
            label: 'navigation.certificates.pending',
            component: PendingCertificationRequestsTable,
            show: (userIsActive && isIssuer) || userIsActiveAndPartOfOrg,
            features: [OriginFeature.Certificates, OriginFeature.CertificationRequests]
        },
        {
            key: 'approved',
            label: 'navigation.certificates.approved',
            component: ApprovedCertificationRequestsTable,
            show: (userIsActive && isIssuer) || userIsActiveAndPartOfOrg,
            features: [OriginFeature.Certificates, OriginFeature.CertificationRequests]
        }
    ];

    function getDefaultRedirect() {
        if (user) {
            if (isIssuer) {
                return CertificatesMenu[3].key;
            }
            return CertificatesMenu[0].key;
        }
    }

    const defaultRedirect = {
        pathname: `${getCertificatesLink()}/${getDefaultRedirect()}`
    };

    return (
        <div className="PageWrapper">
            <div className="PageNav">
                <ul className="NavMenu nav">
                    {CertificatesMenu.map((menu) => {
                        if (
                            menu.show &&
                            menu.features.every((flag) =>
                                originConfiguration.enabledFeatures.includes(flag)
                            )
                        ) {
                            const link = `${getCertificatesLink()}/${menu.key}`;

                            return (
                                <li key={menu.key}>
                                    <NavLink to={link}>{t(menu.label)}</NavLink>
                                </li>
                            );
                        }
                    })}
                </ul>
            </div>

            <Route
                path={`${getCertificatesLink()}/:key/:id?`}
                render={(props) => {
                    const key = props.match.params.key;
                    const id = props.match.params.id as string;
                    const matches = CertificatesMenu.filter((item) => {
                        return item.key === key;
                    });
                    if (matches.length > 0) {
                        if (key === 'detail_view') {
                            matches[0].component = () => CertificateDetailViewId(parseInt(id, 10));
                        }
                    }

                    return (
                        <PageContent
                            menu={matches.length > 0 ? matches[0] : null}
                            redirectPath={getCertificatesLink()}
                        />
                    );
                }}
            />

            <Route
                exact={true}
                path={getCertificatesLink()}
                render={() => <Redirect to={defaultRedirect} />}
            />

            <Route
                exact={true}
                path={`${baseURL}/`}
                render={() => <Redirect to={defaultRedirect} />}
            />
            <RoleChangedModal
                showModal={showRoleModal}
                setShowModal={setShowRoleModal}
                setShowBlockchainModal={setShowBlockchainModal}
            />
            <ConnectBlockchainAccountModal
                showModal={showBlockchainModal}
                setShowModal={setShowBlockchainModal}
            />
        </div>
    );
}
