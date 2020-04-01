// @flow
import { expect } from 'chai';
import BigNumber from 'bignumber.js/bignumber';
import { expectTextInSelector, waitAndClick } from '../../../common/e2e/steps/helpers';
import { rewardsMnemonics, balanceMnemonics, balanceMnemonicsWithNoFunds, testStorageKeys } from '../../../common/e2e/steps/config';
import { WalletSyncStateStatuses } from '../../../../source/renderer/app/domains/Wallet';
import type { Daedalus } from '../../../types';

declare var daedalus: Daedalus;

const ADD_WALLET = '.WalletAdd';
const IMPORT_WALLET_BUTTON = '.importWalletButton';
const IMPORT_WALLET_DIALOG = '.WalletFileImportDialog';
const DEFAULT_LANGUAGE = 'en-US';

export const addOrSetWalletsForScenario = function(wallet: Object) {
  this.wallet = wallet;
  if (this.wallets != null) {
    this.wallets.push(this.wallet);
  } else {
    this.wallets = [this.wallet];
  }
};

let rewardsMnemonicsIndex = 0;
export const noWalletsErrorMessage = `The balance wallet for funds transfering was already used and has no longer funds.
    Remove the "Daedalus Selfnode" directory and run \`nix:dev\` again.`;

export const restoreWalletWithFunds = async (client: Object, { walletName }: { walletName: string }) => {
  const recoveryPhrase = rewardsMnemonics[rewardsMnemonicsIndex++];
  if (rewardsMnemonicsIndex === rewardsMnemonics.length) rewardsMnemonicsIndex = 0;
  client.executeAsync((name, recoveryPhrase, done) => {

    daedalus.api.ada
      .restoreWallet({
        walletName: name,
        recoveryPhrase,
        spendingPassword: 'Secret1234',
      })
      .then(() =>
        daedalus.stores.wallets
          .refreshWalletsData()
          .then(done)
          .catch(error => done(error))
      )
      .catch(error => done(error));
  }, walletName, recoveryPhrase);
};

const createWalletsSequentially = async (wallets: Array<any>, context: Object) => {
  context.wallets = [];
  for (const walletData of wallets) {
    const result = await context.client.executeAsync((wallet, done) => {
      daedalus.api.ada
        .createWallet({
          name: wallet.name,
          mnemonic: daedalus.utils.crypto.generateMnemonic(12),
          spendingPassword: wallet.password || 'Secret1234',
        })
        .then(() =>
          daedalus.stores.wallets.walletsRequest
            .execute()
            .then(storeWallets =>
              daedalus.stores.wallets
                .refreshWalletsData()
                .then(() => done(storeWallets))
                .catch(error => done(error))
            )
            .catch(error => done(error))
        )
        .catch(error => done(error.stack));
    }, walletData);
    context.wallets = result.value;
  }
};

const getMnemonicsIndex = async function() {
  let index = await this.localStorage('GET', testStorageKeys.BALANCE_MNEMONICS_INDEX) || 0;
  index = index.value;
  index = (!isNaN(index)) ? parseInt(index, 10) : 0;
  const newIndex = (index < balanceMnemonics.length - 1)
    ? index + 1
    : 0;
  await this.localStorage('POST', {
    key: testStorageKeys.BALANCE_MNEMONICS_INDEX,
    value: String(newIndex),
  });
  return index;
};

export const restoreLegacyWallet = async (
  client: Object,
  {
    walletName,
    hasFunds,
    transferFunds,
  }: {
    walletName: string,
    hasFunds?: boolean,
    transferFunds?: boolean,
  }
) => {
  let recoveryPhrase;
  if (hasFunds) {
    const mnemonicsIndex = await getMnemonicsIndex.call(client);
    recoveryPhrase = balanceMnemonics[mnemonicsIndex]
  } else {
    recoveryPhrase = balanceMnemonicsWithNoFunds;
  }
  await client.executeAsync((name, recoveryPhrase, transferFunds, noWalletsErrorMessage, done) => {
    daedalus.api.ada
      .restoreByronRandomWallet({
        walletName: name,
        recoveryPhrase,
        spendingPassword: 'Secret1234',
      })
      .then(() =>
        daedalus.stores.wallets
          .refreshWalletsData()
          .then(() => {
            const wallet = daedalus.stores.wallets.getWalletByName(name);
            if (transferFunds && wallet.amount.isZero()) {
              throw new Error(noWalletsErrorMessage);
            }
            done();
          })
          .catch(error => done(error))
      )
      .catch(error => done(error));
  }, walletName, recoveryPhrase, transferFunds, noWalletsErrorMessage);
};

export const fillOutWalletSendForm = async function(values: Object) {
  const formSelector = '.WalletSendForm_component';
  await this.waitAndSetValue(
    `${formSelector} .receiver .SimpleInput_input`,
    values.address
  );
  await this.waitAndSetValue(
    `${formSelector} .amount .SimpleInput_input`,
    values.amount
  );
  if (values.spendingPassword) {
    await this.waitAndSetValue(
      `${formSelector} .spendingPassword .SimpleInput_input`,
      values.spendingPassword
    );
  }
  this.walletSendFormValues = values;
};

export const getNameOfActiveWalletInSidebar = async function() {
  return this.waitAndGetText(
    '.SidebarWalletMenuItem_active .SidebarWalletMenuItem_title'
  );
};

export const getWalletByName = function(walletName: string) {
  return this.wallets.find(w => w.name === walletName);
};

/**
 * It is not safe to create a BigNumber out the amount
 * got from `client.execute`.
 * This method grabs the Fixed wallet amount
 * which can safely be used to create a BigNumber.
 */
export const getFixedAmountByName = async function(walletName: string) {
  await this.client.waitUntil(async () => {
    const isRestoring = await this.client.execute(
      (walletName) => {
        const { isRestoring } = daedalus.stores.wallets.getWalletByName(walletName);
        return isRestoring;
      },
      walletName,
    );
    return !isRestoring.value;
  });
  const walletAmount =
    await this.client.execute(
      (walletName) => {
        const { amount } = daedalus.stores.wallets.getWalletByName(walletName);
        return amount.toFixed();
      },
      walletName,
    );
  return walletAmount.value;
};

export const importWalletHelpers = {
  waitForDialog: (
    client: Object,
    { isHidden } : { isHidden: boolean } = {}
  ) =>
    client.waitForVisible(IMPORT_WALLET_DIALOG, null, isHidden),
  clickImport: (
    client: Object
  ) =>
    waitAndClick(client, `${IMPORT_WALLET_DIALOG} .primary`),
  expectError: (
    client: Object,
    { error }: { error: string }
  ) =>
    expectTextInSelector(client, {
      selector: `${IMPORT_WALLET_DIALOG}_error`,
      text: error,
    }),
};

export const importWalletWithFunds = async (
  client: Object,
  { keyFilePath, password }: { keyFilePath: string, password: ?string }
) =>
  client.executeAsync(
    (filePath, spendingPassword, done) => {
      daedalus.api.ada
        .importWalletFromKey({ filePath, spendingPassword })
        .then(() =>
          daedalus.stores.wallets
            .refreshWalletsData()
            .then(done)
            .catch(error => done(error))
        )
        .catch(error => done(error));
    },
    keyFilePath,
    password
  );

export const isActiveWalletBeingRestored = async (client: Object) => {
  const result = await client.execute(
    expectedSyncTag =>
      daedalus.stores.wallets.active === expectedSyncTag,
    WalletSyncStateStatuses.RESTORING
  );
  return result.value ? result.value.syncState.tag : false;
};

export const waitUntilWalletIsLoaded = async function(walletName: string): Promise<any> {
  let wallet = null;
  const context = this;
  await context.client.waitUntil(async () => {
    const result = await context.client.execute(
      (name) => daedalus.stores.wallets.getWalletByName(name),
      walletName
    );
    if (result.value) {
      wallet = result.value;
      return true;
    }
    return false;
  });
  return wallet;
};

export const waitUntilWaletNamesEqual = function(walletName: string) {
  const context = this;
  return context.client.waitUntil(async () => {
    const currentWalletName = await getNameOfActiveWalletInSidebar.call(
      context
    );
    return currentWalletName === walletName;
  });
};

export const expectActiveWallet = async function(walletName: string) {
  const displayedWalletName = await getNameOfActiveWalletInSidebar.call(this);
  expect(displayedWalletName.toLowerCase().trim()).to.equal(
    walletName.toLowerCase().trim()
  );
};

const createWalletsAsync = async (table, context: Object, isLegacy?: boolean) => {
  const result = await context.client.executeAsync((wallets, isLegacyWallet, done) => {
    const mnemonics = {};
    const { restoreLegacyRequest, walletsRequest } = daedalus.stores.wallets;
    const { restoreLegacyWallet, createWallet } = daedalus.api.ada;
    const request = isLegacyWallet ? restoreLegacyRequest : walletsRequest;
    const apiEndpoint = isLegacyWallet ? restoreLegacyWallet : createWallet;
    window.Promise.all(
      wallets.map(wallet => {
        const mnemonic = daedalus.utils.crypto.generateMnemonic(12);
        const recoveryPhrase = mnemonic;
        mnemonics[wallet.name] = mnemonic.split(' ');
        return apiEndpoint({
          name: wallet.name,
          walletName: wallet.name,
          mnemonic,
          recoveryPhrase,
          spendingPassword: wallet.password || 'Secret1234',
        });
      })
    )
      .then(() =>
        request
          .execute()
          .then(storeWallets =>
            daedalus.stores.wallets
              .refreshWalletsData()
              .then(() => done({ storeWallets, mnemonics }))
              .catch(error => done(error))
          )
          .catch(error => done(error))
      )
      .catch(error => done(error.stack));
  }, table, isLegacy);
  // Add or set the wallets for this scenario
  if (context.wallets != null) {
    context.wallets.push(...result.value.storeWallets);
  } else {
    context.wallets = result.value.storeWallets;
  }
  if (context.mnemonics != null) {
    context.mnemonics.push(...result.value.mnemonics);
  } else {
    context.mnemonics = result.value.mnemonics;
  }
};

export const createWallets = async (
  wallets: Array<any>,
  context: Object,
  options: {
    sequentially?: boolean,
    isLegacy?: boolean,
  } = {}
) => {
  if (options.sequentially === true) {
    await createWalletsSequentially(wallets, context);
  } else {
    await createWalletsAsync(wallets, context, options.isLegacy);
  }
};

export const getCurrentAppRoute = async function() {
  const url = (await this.client.url()).value;
  return url.substring(url.indexOf('#/') + 1); // return without the hash
};

export const waitUntilUrlEquals = function(expectedUrl: string) {
  const context = this;
  return context.client.waitUntil(async () => {
    const url = await getCurrentAppRoute.call(context);
    return url === expectedUrl;
  });
};

export const navigateTo = function(requestedRoute: string) {
  return this.client.execute(route => {
    daedalus.actions.router.goToRoute.trigger({ route });
  }, requestedRoute);
};

export const sidebar = {
  activateCategory: async (client: Object, { category }: { category: string }) => {
    await client.execute(cat => {
      daedalus.actions.sidebar.activateSidebarCategory.trigger({
        category: cat,
        showSubMenu: true,
      });
    }, `/${category}`);
    return client.waitForVisible(`.SidebarCategory_active.${category}`);
  },
  clickAddWalletButton: (client: Object) =>
    waitAndClick(client, '.SidebarWalletsMenu_addWalletButton'),
};

export const addWalletPage = {
  waitForVisible: (client: Object, { isHidden }: { isHidden?: boolean } = {}) =>
    client.waitForVisible(ADD_WALLET, null, isHidden),
  clickImportButton: (client: Object) =>
    waitAndClick(client, `${ADD_WALLET} ${IMPORT_WALLET_BUTTON}`),
};

export default {
  waitForDialog: (client: Object, { isHidden }: { isHidden?: boolean } = {}) =>
    client.waitForVisible(IMPORT_WALLET_DIALOG, null, isHidden),
  selectFile: (client: Object, { filePath }: { filePath: string }) =>
    client.chooseFile(
      `${IMPORT_WALLET_DIALOG} .FileUploadWidget_dropZone input`,
      filePath
    ),
  clickImport: (client: Object) =>
    waitAndClick(client, `${IMPORT_WALLET_DIALOG} .primary`),
  expectError: (client: Object, { error }: { error: string }) =>
    expectTextInSelector(client, {
      selector: `${IMPORT_WALLET_DIALOG}_error`,
      text: error,
    }),
};

export const i18n = {
  formatMessage: async (
    client: Object,
    { id, values }: { id: string, values?: Object }
  ) => {
    const translation = await client.execute(
      (translationId, translationValues) => {
        const IntlProvider = require('react-intl').IntlProvider; // eslint-disable-line
        const locale = daedalus.stores.profile.currentLocale;
        const messages = daedalus.translations;
        const intlProvider = new IntlProvider(
          { locale, messages: messages[locale] },
          {}
        );
        return intlProvider
          .getChildContext()
          .intl.formatMessage({ id: translationId }, translationValues);
      },
      id,
      values || {}
    );
    return translation.value;
  },
  setActiveLanguage: async (
    client: Object,
    { language }: { language: string } = {}
  ) =>
    client.execute(value => {
      daedalus.actions.profile.updateUserLocalSetting.trigger({ param: 'locale', value });
    }, language || DEFAULT_LANGUAGE),
};

export const waitForActiveRestoreNotification = (client: Object, { isHidden }: { isHidden?: boolean } = {}) =>
  client.waitForVisible('.ActiveRestoreNotification', null, isHidden);