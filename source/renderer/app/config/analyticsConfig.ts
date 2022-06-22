import { Network } from '../../../common/types/environment.types';

export const ANALYTICS_API_ENDPOINT = 'http://localhost:8080/matomo.php';
export const PRIVACY_POLICY_LINK =
  'https://static.iohk.io/terms/iog-privacy-policy.pdf';
export const DEV_MODE_SITE_MAP_ID = 1;
export const NETWORK_TO_ANALYTICS_SITE_ID_MAP: Record<Network, number> = {
  mainnet: 4,
  mainnet_flight: 4,
  testnet: 3,
  staging: 5,
  shelley_qa: 5,
  alonzo_purple: 5,
  selfnode: 5,
  development: 5,
};
