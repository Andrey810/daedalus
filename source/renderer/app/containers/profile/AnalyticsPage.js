// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import TopBar from '../../components/layout/TopBar';
import TopBarLayout from '../../components/layout/TopBarLayout';
import TermsOfUseForm from '../../components/profile/terms-of-use/TermsOfUseForm';
import type { InjectedProps } from '../../types/injectedPropsType';
import AnalyticsDialog from '../../components/analytics/AnalyticsDialog';

@inject('stores', 'actions')
@observer
export default class AnalyticsPage extends Component<InjectedProps> {
  static defaultProps = { actions: null, stores: null };

  onSubmit = () => {
    this.props.actions.profile.acceptTermsOfUse.trigger();
  };

  render() {
    // const { app, networkStatus, profile } = this.props.stores;
    // const { setTermsOfUseAcceptanceRequest, termsOfUse } = profile;
    const { currentRoute, openExternalLink } = app;
    const { isShelleyActivated } = networkStatus;
    // const isSubmitting = setTermsOfUseAcceptanceRequest.isExecuting;
    const topbar = (
      <TopBar
        currentRoute={currentRoute}
        showSubMenuToggle={false}
        isShelleyActivated={isShelleyActivated}
      />
    );

    return (
      <TopBarLayout topbar={topbar}>
        {/* <TermsOfUseForm */}
        {/*   localizedTermsOfUse={termsOfUse} */}
        {/*   onSubmit={this.onSubmit} */}
        {/*   isSubmitting={isSubmitting} */}
        {/*   error={setTermsOfUseAcceptanceRequest.error} */}
        {/*   onOpenExternalLink={openExternalLink} */}
        {/* /> */}
        <AnalyticsDialog />
      </TopBarLayout>
    );
  }
}
