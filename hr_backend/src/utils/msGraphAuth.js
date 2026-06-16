import axios from "axios";
import qs from "qs";

export const getGraphAccessToken = async () => {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`;

  const data = qs.stringify({
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await axios.post(tokenUrl, data, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return res.data.access_token;
};
