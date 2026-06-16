import { Linking } from 'react-native';
import Config from 'react-native-config';

export const msalConfig = {
  clientId: Config.AZURE_CLIENT_ID || "4c0096ef-ee28-4a18-9cd8-4b6d57324296",
  tenantId: Config.AZURE_TENANT_ID || "8b635c92-15fd-439f-a90b-872d13827fd9",
  scopes: ["User.Read"],
};

// Azure AD Discovery Endpoints
export const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${msalConfig.tenantId}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${msalConfig.tenantId}/oauth2/v2.0/token`,
};

// The direct deep link into the app
export const mobileRedirectUri = "com.hrportalmobile://auth";

export const googleConfig = {
  clientId: Config.GOOGLE_CLIENT_ID || "",
};

